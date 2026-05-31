import logging
from datetime import datetime, timedelta
from typing import Optional

import feedparser
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.models import LLMConfig, NewsItem, ProxyConfig, ProxyType, RSSSource, SourceStatus, TranslationStatus

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


async def _get_proxy_for_source(source: RSSSource, db: AsyncSession) -> Optional[str]:
    """Get proxy URL for a source: per-source > global > None"""
    proxy_url = _build_proxy_url(
        source.proxy_type, source.proxy_host, source.proxy_port,
        source.proxy_username, source.proxy_password,
    )
    if proxy_url:
        return proxy_url

    # fallback to global proxy
    result = await db.execute(select(ProxyConfig).where(ProxyConfig.is_global == True))
    global_proxy = result.scalar_one_or_none()
    if global_proxy:
        return _build_proxy_url(
            global_proxy.proxy_type, global_proxy.host, global_proxy.port,
            global_proxy.username, global_proxy.password,
        )
    return None


async def fetch_source(source_id: int) -> None:
    """Fetch and parse a single RSS source, store new items."""
    async with async_session() as db:
        source = await db.get(RSSSource, source_id)
        if not source or source.status == SourceStatus.DISABLED:
            return

        proxy_url = await _get_proxy_for_source(source, db)

        try:
            # Fetch RSS content via httpx (supports proxy)
            async with httpx.AsyncClient(proxy=proxy_url, timeout=30, follow_redirects=True) as client:
                response = await client.get(source.url)
                response.raise_for_status()
                content = response.text

            # Parse with feedparser
            feed = feedparser.parse(content)

            if feed.bozo and not feed.entries:
                source.status = SourceStatus.ERROR
                source.error_message = f"解析失败: {str(feed.bozo_exception)}"
                await db.commit()
                return

            new_count = 0
            for entry in feed.entries:
                link = entry.get("link", "")
                if not link:
                    continue

                # Deduplicate by link + source_id
                existing = await db.execute(
                    select(NewsItem).where(NewsItem.link == link, NewsItem.source_id == source.id)
                )
                if existing.scalar_one_or_none():
                    continue

                published = None
                if entry.get("published_parsed"):
                    try:
                        published = datetime(*entry.published_parsed[:6])
                    except Exception:
                        pass
                elif entry.get("updated_parsed"):
                    try:
                        published = datetime(*entry.updated_parsed[:6])
                    except Exception:
                        pass

                # Determine initial translation status
                trans_status = TranslationStatus.NOT_TRANSLATED
                if source.language == "en" and source.enable_translation:
                    # Will be set to NOT_TRANSLATED, auto-translation triggered separately
                    trans_status = TranslationStatus.NOT_TRANSLATED

                item = NewsItem(
                    title=entry.get("title", ""),
                    link=link,
                    summary=entry.get("summary", ""),
                    published_at=published,
                    source_id=source.id,
                    category_id=source.category_id,
                    translation_status=trans_status,
                )
                db.add(item)
                new_count += 1

            source.status = SourceStatus.ACTIVE
            source.error_message = None
            source.last_fetched_at = datetime.now()
            await db.commit()

            logger.info(f"Fetched source '{source.name}': {new_count} new items")

            # Auto-translate if needed
            if source.language == "en" and source.enable_translation:
                from app.services.translation import translate_pending_for_source
                await translate_pending_for_source(source.id)

        except Exception as e:
            source.status = SourceStatus.ERROR
            source.error_message = str(e)[:500]
            await db.commit()
            logger.error(f"Failed to fetch source '{source.name}': {e}")
