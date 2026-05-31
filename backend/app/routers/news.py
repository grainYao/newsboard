from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.models import Category, NewsItem, RSSSource
from app.schemas.news import NewsItemOut

router = APIRouter(prefix="/api/news", tags=["news"])


def _build_item_out(item: NewsItem) -> NewsItemOut:
    """Build output from an item with pre-loaded relationships."""
    return NewsItemOut(
        id=item.id,
        title=item.title,
        link=item.link,
        summary=item.summary,
        published_at=item.published_at,
        source_id=item.source_id,
        category_id=item.category_id,
        translation_status=item.translation_status,
        translated_title=item.translated_title,
        translated_summary=item.translated_summary,
        fetched_at=item.fetched_at,
        source_name=item.source.name if item.source else None,
        category_name=item.category.name if item.category else None,
    )


@router.get("", response_model=dict)
async def list_news(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    source_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    # Base filters
    filters = []
    if category_id is not None:
        filters.append(NewsItem.category_id == category_id)
    if source_id is not None:
        filters.append(NewsItem.source_id == source_id)

    # Count
    total_stmt = select(func.count()).select_from(NewsItem)
    for f in filters:
        total_stmt = total_stmt.where(f)
    total_result = await db.execute(total_stmt)
    total = total_result.scalar() or 0

    # Paginate with eager-loaded relationships (single query)
    stmt = select(NewsItem).options(
        selectinload(NewsItem.source),
        selectinload(NewsItem.category),
    )
    for f in filters:
        stmt = stmt.where(f)
    stmt = stmt.order_by(NewsItem.published_at.desc().nulls_last(), NewsItem.fetched_at.desc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_build_item_out(item) for item in items],
    }


@router.get("/{news_id}", response_model=NewsItemOut)
async def get_news(news_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(NewsItem).where(NewsItem.id == news_id).options(
        selectinload(NewsItem.source),
        selectinload(NewsItem.category),
    )
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="新闻不存在")

    return _build_item_out(item)
