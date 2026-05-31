import logging

import feedparser
import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import Category, RSSSource
from app.schemas.rss_assistant import (
    BatchCreateRequest,
    ChatMessage,
    RecommendRequest,
    RecommendResponse,
    RssRecommendation,
)
from app.services.rss_assistant import chat_rss_sources

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/rss-sources", response_model=RecommendResponse)
async def recommend_sources(data: RecommendRequest, db: AsyncSession = Depends(get_db)):
    logger.info(f"[Chat] Chat request with {len(data.messages)} messages")
    messages = [{"role": m.role, "content": m.content} for m in data.messages]
    text, sources, has_config = await chat_rss_sources(messages, db)
    logger.info(f"[Chat] Response: text={len(text)} chars, sources={len(sources)}, has_config={has_config}")
    return RecommendResponse(
        text=text,
        sources=[RssRecommendation(**s) for s in sources],
        has_config=has_config,
    )


batch_router = APIRouter(prefix="/api/sources", tags=["sources"])


async def _validate_feed(url: str) -> tuple[bool, str]:
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            content = resp.content
        feed = feedparser.parse(content)
        if feed.feed or feed.entries:
            return True, ""
        return False, "无法解析为 RSS"
    except httpx.HTTPError as e:
        logger.warning(f"[Sources] Feed fetch failed: {url} — {e}")
        return False, f"获取失败: {type(e).__name__}"
    except Exception as e:
        logger.warning(f"[Sources] Feed validate failed: {url} — {e}")
        return False, f"验证失败: {e}"


@batch_router.post("/batch", status_code=201)
async def batch_create_sources(data: BatchCreateRequest, db: AsyncSession = Depends(get_db)):
    logger.info(f"[Sources] Batch create request: {len(data.sources)} sources")
    created = 0
    skipped = 0
    results = []

    for rec in data.sources:
        existing = await db.execute(select(RSSSource).where(RSSSource.url == rec.url))
        if existing.scalar_one_or_none():
            skipped += 1
            results.append({"name": rec.name, "url": rec.url, "status": "skipped", "reason": "已存在"})
            logger.info(f"[Sources] Skipped (already exists): {rec.url}")
            continue

        is_valid, error_msg = await _validate_feed(rec.url)

        if not is_valid:
            results.append({
                "name": rec.name,
                "url": rec.url,
                "status": "invalid",
                "reason": error_msg or "无效的 RSS 源",
            })
            logger.info(f"[Sources] Invalid feed: {rec.url} — {error_msg}")
            continue

        cat_result = await db.execute(select(Category).where(Category.name == rec.suggested_category))
        category = cat_result.scalar_one_or_none()
        if not category:
            cat_result = await db.execute(select(Category).limit(1))
            category = cat_result.scalar_one_or_none()
        if not category:
            results.append({"name": rec.name, "url": rec.url, "status": "error", "reason": "无分类"})
            logger.warning(f"[Sources] No category found for: {rec.url}")
            continue

        source = RSSSource(
            name=rec.name,
            url=rec.url,
            category_id=category.id,
        )
        db.add(source)
        created += 1
        results.append({"name": rec.name, "url": rec.url, "status": "created"})
        logger.info(f"[Sources] Created: {rec.name} ({rec.url})")

    await db.commit()
    logger.info(f"[Sources] Batch result: created={created}, skipped={skipped}")
    return {"created": created, "skipped": skipped, "results": results}
