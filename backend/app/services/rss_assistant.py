import asyncio
import json
import logging
import re
from typing import Optional

import feedparser
from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import httpx

from app.database import async_session
from app.models.models import LLMConfig, ProxyConfig, ProxyType, SearchConfig

logger = logging.getLogger(__name__)

TAVILY_API_URL = "https://api.tavily.com/search"


def _build_proxy_url(
    proxy_type: Optional[ProxyType],
    host: Optional[str],
    port: Optional[int],
    username: Optional[str] = None,
    password: Optional[str] = None,
) -> Optional[str]:
    if not host or not port:
        return None
    scheme = "http" if proxy_type == ProxyType.HTTP else "socks5"
    auth = ""
    if username:
        auth = f"{username}:{password}@" if password else f"{username}@"
    return f"{scheme}://{auth}{host}:{port}"


async def _get_llm_client() -> tuple:
    async with async_session() as db:
        result = await db.execute(select(LLMConfig).where(LLMConfig.is_active == True))
        config = result.scalar_one_or_none()
        if not config:
            raise ValueError("未配置大模型")

        proxy_url = _build_proxy_url(
            config.proxy_type,
            config.proxy_host,
            config.proxy_port,
            config.proxy_username,
            config.proxy_password,
        )
        if not proxy_url:
            gp_result = await db.execute(select(ProxyConfig).where(ProxyConfig.is_global == True))
            global_proxy = gp_result.scalar_one_or_none()
            if global_proxy:
                proxy_url = _build_proxy_url(
                    global_proxy.proxy_type,
                    global_proxy.host,
                    global_proxy.port,
                    global_proxy.username,
                    global_proxy.password,
                )

        http_client = httpx.Client(proxy=proxy_url, timeout=60) if proxy_url else httpx.Client(timeout=60)
        client = OpenAI(base_url=config.base_url, api_key=config.api_key, http_client=http_client)
        logger.info(f"[RSS Assistant] LLM client ready: {config.name} ({config.model_name})")
        return client, config


async def _get_search_config() -> Optional[str]:
    async with async_session() as db:
        result = await db.execute(select(SearchConfig))
        config = result.scalar_one_or_none()
        if config:
            logger.info("[RSS Assistant] Search config found")
        else:
            logger.warning("[RSS Assistant] No search config configured")
        return config.api_key if config else None


def _validate_feed_sync(url: str) -> bool:
    try:
        feed = feedparser.parse(url, timeout=8)
        return bool(feed.feed or feed.entries)
    except Exception:
        return False


async def _discover_feeds(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.get(url)
            html = resp.text

        for pattern in [
            re.compile(r'<link[^>]+type=["\']application/rss\+xml["\'][^>]+href=["\']([^"\']+)["\']', re.I),
            re.compile(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+type=["\']application/rss\+xml["\']', re.I),
            re.compile(r'<link[^>]+type=["\']application/atom\+xml["\'][^>]+href=["\']([^"\']+)["\']', re.I),
            re.compile(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+type=["\']application/atom\+xml["\']', re.I),
        ]:
            m = pattern.search(html)
            if m:
                feed_url = m.group(1)
                if feed_url.startswith('/'):
                    from urllib.parse import urljoin
                    feed_url = urljoin(url, feed_url)
                logger.info(f"[RSS Assistant] Feed discovered via link tag: {feed_url}")
                return feed_url

        common_paths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/index.xml']
        path_futures = [client.get(url + p, timeout=4, follow_redirects=True) for p in common_paths]
        path_results = await asyncio.gather(*path_futures, return_exceptions=True)
        for i, resp in enumerate(path_results):
            if isinstance(resp, Exception):
                continue
            if resp.status_code == 200:
                loop = asyncio.get_event_loop()
                is_valid = await loop.run_in_executor(None, _validate_feed_sync, url + common_paths[i])
                if is_valid:
                    feed_url = url + common_paths[i]
                    logger.info(f"[RSS Assistant] Feed discovered via path probe: {feed_url}")
                    return feed_url

        logger.debug(f"[RSS Assistant] No feed found for: {url}")
        return None
    except Exception as e:
        logger.debug(f"[RSS Assistant] Feed discovery failed for {url}: {e}")
        return None


async def _search_rss_feeds(query: str, api_key: str) -> list[dict]:
    logger.info(f"[RSS Assistant] Searching Tavily for: {query}")
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                TAVILY_API_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "query": query,
                    "search_depth": "basic",
                    "max_results": 6,
                },
            )
            response.raise_for_status()
            results = response.json().get("results", [])

        logger.info(f"[RSS Assistant] Tavily returned {len(results)} results, discovering feeds...")
        feed_futures = [_discover_feeds(r.get("url", "")) for r in results]
        feed_urls = await asyncio.gather(*feed_futures)

        discovered = []
        for r, feed_url in zip(results, feed_urls):
            if feed_url:
                discovered.append({
                    "title": r.get("title", ""),
                    "url": feed_url,
                    "description": r.get("content", "")[:200],
                    "source_page": r.get("url", ""),
                })
        logger.info(f"[RSS Assistant] Feed discovery done: {len(discovered)} valid feeds")
        return discovered
    except Exception as e:
        logger.error(f"[RSS Assistant] Tavily search failed: {e}")
        return []


async def _classify_intent(messages: list[dict], categories: list[str]) -> dict:
    """Use LLM to classify user intent from conversation history."""
    client, config = await _get_llm_client()
    category_list = ", ".join(categories) if categories else "未分类"

    system_prompt = f"""你是一个RSS源推荐助手的意图分类器。分析对话历史，判断用户的最新意图。

可用分类：{category_list}

根据对话上下文，返回JSON（不要加```json```前缀）：
- 用户想要**新的RSS源**（包括"再来点"、"还有吗"、"推荐XX的"等）→ action="search"，并生成一个**对搜索引擎友好的英文搜索关键词**
- 用户在**闲聊、确认、提问**（包括"谢谢"、"好的"、"怎么添加"等）→ action="chat"，并直接给出回复

关键判断规则：
1. "还有吗"/"再来点"/"更多" → search（用之前的主题优化查询）
2. "再推荐一些AI相关的" → search，query="AI artificial intelligence RSS feeds"
3. "不要英文的，要中文的" → search，query中加上"Chinese 中文"
4. "谢谢"/"好的" → chat
5. "怎么添加这些源" → chat（解释操作方法）

只返回JSON：{{"action": "search"或"chat", "search_query": "...", "text": "..."}}"""

    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = msg.get("role", "user")
        if role in ("user", "assistant"):
            llm_messages.append({"role": role, "content": msg.get("content", "")})

    try:
        response = client.chat.completions.create(
            model=config.model_name,
            messages=llm_messages,
            max_tokens=500,
            temperature=0.3,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        result = json.loads(content)
        logger.info(f"[RSS Assistant] Intent: {result.get('action')}, query: {result.get('search_query', 'N/A')}")
        return result
    except (json.JSONDecodeError, Exception) as e:
        logger.error(f"[RSS Assistant] Intent classification failed: {e}")
        latest = ""
        for msg in reversed(messages):
            if msg.get("role") == "user":
                latest = msg.get("content", "")
                break
        return {"action": "search", "search_query": latest}


async def _build_conversational_response(
    messages: list[dict],
    search_results: list[dict],
    categories: list[str],
) -> tuple[str, list[dict]]:
    """Use LLM to format search results with full conversation context."""
    client, config = await _get_llm_client()
    category_list = ", ".join(categories) if categories else "未分类"
    results_json = json.dumps(search_results, ensure_ascii=False)

    system_prompt = f"""你是一个RSS数据源推荐助手，帮助用户找到优质的RSS订阅源。
当前可用的分类有：{category_list}。

下面是用户的对话历史和最新的搜索结果。你需要：
1. 根据对话上下文和搜索结果推荐适合的RSS源
2. 如果用户之前表达过偏好（如"不要英文的"），在推荐时考虑这些偏好
3. 用自然、友好的语言回复，适当引用之前的对话内容
4. 返回结构化的RSS源列表

请用JSON格式回复，包含text（你对用户的回复文本）和sources（RSS源数组，每项包含name、url、description、suggested_category）。
只返回JSON，不要添加任何前缀如```json或解释文字。"""

    llm_messages = [{"role": "system", "content": system_prompt}]

    for msg in messages[:-1]:
        role = msg.get("role", "user")
        if role in ("user", "assistant"):
            llm_messages.append({"role": role, "content": msg.get("content", "")})

    latest_user_msg = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            latest_user_msg = msg.get("content", "")
            break

    llm_messages.append({
        "role": "user",
        "content": f"用户需求：{latest_user_msg}\n\n搜索到的RSS源：\n{results_json}",
    })

    try:
        response = client.chat.completions.create(
            model=config.model_name,
            messages=llm_messages,
            max_tokens=2000,
            temperature=0.5,
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        result = json.loads(content)
        text = result.get("text", "")
        sources = result.get("sources", [])
        logger.info(f"[RSS Assistant] LLM response: text={len(text)} chars, sources={len(sources)}")
        return text, sources
    except json.JSONDecodeError as e:
        logger.error(f"[RSS Assistant] LLM response is not valid JSON: {e}\nRaw: {content[:300]}")
        return "抱歉，整理结果时出错了，请稍后重试。", []
    except Exception as e:
        logger.error(f"[RSS Assistant] LLM call failed: {e}")
        return "抱歉，大模型调用失败，请检查LLM配置。", []


async def chat_rss_sources(messages: list[dict], db: AsyncSession) -> tuple[str, list[dict], bool]:
    """
    Multi-turn conversational RSS source recommendation.
    messages: list of {role: "user"|"assistant", content: str}
    Returns: (response_text, sources, has_config)
    """
    latest_message = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            latest_message = msg.get("content", "")
            break

    if not latest_message:
        return "你好！请告诉我你想找什么类型的RSS数据源，比如「科技新闻」「编程教程」等。", [], True

    from app.models.models import Category
    cat_result = await db.execute(select(Category))
    categories = [c.name for c in cat_result.scalars().all()]

    # Classify intent
    intent = await _classify_intent(messages, categories)
    action = intent.get("action", "search")

    if action == "chat":
        text = intent.get("text", "有什么我可以帮你的吗？")
        logger.info(f"[RSS Assistant] Chat response (no search): {text[:80]}...")
        return text, [], True

    # action == "search"
    api_key = await _get_search_config()
    if not api_key:
        return "请先在上方配置 Tavily 搜索 API Key，才能使用 AI 助手功能。", [], False

    search_query = intent.get("search_query", latest_message)
    logger.info(f"[RSS Assistant] Searching with query: {search_query}")

    search_results = await _search_rss_feeds(search_query, api_key)
    if not search_results:
        return f"没有找到与「{search_query}」相关的RSS源，试试其他关键词？", [], True

    text, sources = await _build_conversational_response(messages, search_results, categories)
    return text, sources, True
