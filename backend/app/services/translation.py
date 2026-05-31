import logging
from typing import Optional

from openai import OpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import httpx

from app.database import async_session
from app.models.models import LLMConfig, NewsItem, ProxyConfig, ProxyType, TranslationStatus

logger = logging.getLogger(__name__)


def _build_proxy_url(proxy_type: Optional[ProxyType], host: Optional[str], port: Optional[int],
                     username: Optional[str] = None, password: Optional[str] = None) -> Optional[str]:
    if not host or not port:
        return None
    scheme = "http" if proxy_type == ProxyType.HTTP else "socks5"
    auth = ""
    if username:
        auth = f"{username}:{password}@" if password else f"{username}@"
    return f"{scheme}://{auth}{host}:{port}"


async def _get_llm_client() -> Optional[tuple]:
    """Get active LLM config and return (client, config)."""
    async with async_session() as db:
        result = await db.execute(select(LLMConfig).where(LLMConfig.is_active == True))
        config = result.scalar_one_or_none()
        if not config:
            return None, None

        # Build proxy for LLM: dedicated proxy > global proxy
        proxy_url = _build_proxy_url(
            config.proxy_type, config.proxy_host, config.proxy_port,
            config.proxy_username, config.proxy_password,
        )
        if not proxy_url:
            # fallback to global proxy
            gp_result = await db.execute(select(ProxyConfig).where(ProxyConfig.is_global == True))
            global_proxy = gp_result.scalar_one_or_none()
            if global_proxy:
                proxy_url = _build_proxy_url(
                    global_proxy.proxy_type, global_proxy.host, global_proxy.port,
                    global_proxy.username, global_proxy.password,
                )

        http_client = httpx.Client(proxy=proxy_url, timeout=60) if proxy_url else httpx.Client(timeout=60)
        client = OpenAI(
            base_url=config.base_url,
            api_key=config.api_key,
            http_client=http_client,
        )
        return client, config


async def translate_text(text: str, client: OpenAI, model_name: str, max_tokens: int) -> Optional[str]:
    """Translate text using LLM."""
    if not text or not text.strip():
        return ""
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "你是一个翻译助手，将英文翻译为中文。只返回翻译结果，不要添加解释。"},
                {"role": "user", "content": f"翻译以下内容为中文：\n{text}"},
            ],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        raise


async def translate_item(item_id: int) -> None:
    """Translate a single news item."""
    async with async_session() as db:
        item = await db.get(NewsItem, item_id)
        if not item or item.translation_status == TranslationStatus.TRANSLATED:
            return

        client, config = await _get_llm_client()
        if not client or not config:
            item.translation_status = TranslationStatus.NOT_CONFIGURED
            await db.commit()
            return

        item.translation_status = TranslationStatus.TRANSLATING
        await db.commit()

        try:
            translated_title = await translate_text(item.title, client, config.model_name, min(config.max_tokens, 500))
            translated_summary = await translate_text(item.summary or "", client, config.model_name, config.max_tokens)
            item.translated_title = translated_title
            item.translated_summary = translated_summary
            item.translation_status = TranslationStatus.TRANSLATED
            item.translation_error = None
        except Exception as e:
            item.translation_status = TranslationStatus.FAILED
            item.translation_error = str(e)[:500]

        await db.commit()


async def translate_pending_for_source(source_id: int) -> None:
    """Translate all pending items for a source."""
    async with async_session() as db:
        result = await db.execute(
            select(NewsItem).where(
                NewsItem.source_id == source_id,
                NewsItem.translation_status == TranslationStatus.NOT_TRANSLATED,
            )
        )
        items = result.scalars().all()

    for item in items:
        try:
            await translate_item(item.id)
        except Exception as e:
            logger.error(f"Failed to translate item {item.id}: {e}")
