from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import RSSSource, SourceStatus
from app.schemas.source import RSSSourceCreate, RSSSourceOut, RSSSourceUpdate

router = APIRouter(prefix="/api/sources", tags=["sources"])


@router.get("", response_model=list[RSSSourceOut])
async def list_sources(
    category_id: Optional[int] = None,
    status: Optional[SourceStatus] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(RSSSource)
    if category_id is not None:
        stmt = stmt.where(RSSSource.category_id == category_id)
    if status is not None:
        stmt = stmt.where(RSSSource.status == status)
    result = await db.execute(stmt)
    sources = result.scalars().all()

    out = []
    for s in sources:
        cat = await db.get(s.__class__, s.id)
        # get category name
        from app.models.models import Category
        category = await db.get(Category, s.category_id) if s.category_id else None
        out.append(RSSSourceOut(
            id=s.id,
            name=s.name,
            url=s.url,
            category_id=s.category_id,
            language=s.language,
            enable_translation=s.enable_translation,
            fetch_interval=s.fetch_interval,
            status=s.status,
            last_fetched_at=s.last_fetched_at,
            error_message=s.error_message,
            proxy_type=s.proxy_type,
            proxy_host=s.proxy_host,
            proxy_port=s.proxy_port,
            created_at=s.created_at,
            category_name=category.name if category else None,
        ))
    return out


@router.post("", response_model=RSSSourceOut, status_code=201)
async def create_source(data: RSSSourceCreate, db: AsyncSession = Depends(get_db)):
    # URL format validation
    if not data.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail="URL 格式无效，必须以 http:// 或 https:// 开头")

    # URL uniqueness check
    existing = await db.execute(select(RSSSource).where(RSSSource.url == data.url))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="该数据源 URL 已存在")

    source = RSSSource(
        name=data.name,
        url=data.url,
        category_id=data.category_id,
        language=data.language,
        enable_translation=data.enable_translation,
        fetch_interval=data.fetch_interval,
        proxy_type=data.proxy_type,
        proxy_host=data.proxy_host,
        proxy_port=data.proxy_port,
        proxy_username=data.proxy_username,
        proxy_password=data.proxy_password,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    from app.models.models import Category
    category = await db.get(Category, source.category_id)

    return RSSSourceOut(
        id=source.id,
        name=source.name,
        url=source.url,
        category_id=source.category_id,
        language=source.language,
        enable_translation=source.enable_translation,
        fetch_interval=source.fetch_interval,
        status=source.status,
        last_fetched_at=source.last_fetched_at,
        error_message=source.error_message,
        proxy_type=source.proxy_type,
        proxy_host=source.proxy_host,
        proxy_port=source.proxy_port,
        created_at=source.created_at,
        category_name=category.name if category else None,
    )


@router.put("/{source_id}", response_model=RSSSourceOut)
async def update_source(source_id: int, data: RSSSourceUpdate, db: AsyncSession = Depends(get_db)):
    source = await db.get(RSSSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="数据源不存在")

    if data.url is not None:
        if not data.url.startswith(("http://", "https://")):
            raise HTTPException(status_code=422, detail="URL 格式无效")
        existing = await db.execute(select(RSSSource).where(RSSSource.url == data.url, RSSSource.id != source_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="该数据源 URL 已存在")
        source.url = data.url

    old_category_id = source.category_id

    for field in ["name", "category_id", "language", "enable_translation", "fetch_interval",
                   "proxy_type", "proxy_host", "proxy_port", "proxy_username", "proxy_password"]:
        val = getattr(data, field, None)
        if val is not None:
            setattr(source, field, val)

    # Sync category change to historical news items
    if data.category_id is not None and data.category_id != old_category_id:
        from app.models.models import NewsItem
        await db.execute(
            NewsItem.__table__.update()
            .where(NewsItem.source_id == source_id)
            .values(category_id=data.category_id)
        )

    await db.commit()
    await db.refresh(source)

    from app.models.models import Category
    category = await db.get(Category, source.category_id)

    return RSSSourceOut(
        id=source.id,
        name=source.name,
        url=source.url,
        category_id=source.category_id,
        language=source.language,
        enable_translation=source.enable_translation,
        fetch_interval=source.fetch_interval,
        status=source.status,
        last_fetched_at=source.last_fetched_at,
        error_message=source.error_message,
        proxy_type=source.proxy_type,
        proxy_host=source.proxy_host,
        proxy_port=source.proxy_port,
        created_at=source.created_at,
        category_name=category.name if category else None,
    )


@router.delete("/{source_id}")
async def delete_source(source_id: int, db: AsyncSession = Depends(get_db)):
    source = await db.get(RSSSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="数据源不存在")

    await db.delete(source)
    await db.commit()
    return {"message": "删除成功"}


@router.post("/{source_id}/toggle", response_model=RSSSourceOut)
async def toggle_source(source_id: int, db: AsyncSession = Depends(get_db)):
    source = await db.get(RSSSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="数据源不存在")

    if source.status == SourceStatus.ACTIVE:
        source.status = SourceStatus.DISABLED
    elif source.status == SourceStatus.DISABLED:
        source.status = SourceStatus.ACTIVE
    else:
        source.status = SourceStatus.ACTIVE

    await db.commit()
    await db.refresh(source)

    from app.models.models import Category
    category = await db.get(Category, source.category_id)

    return RSSSourceOut(
        id=source.id,
        name=source.name,
        url=source.url,
        category_id=source.category_id,
        language=source.language,
        enable_translation=source.enable_translation,
        fetch_interval=source.fetch_interval,
        status=source.status,
        last_fetched_at=source.last_fetched_at,
        error_message=source.error_message,
        proxy_type=source.proxy_type,
        proxy_host=source.proxy_host,
        proxy_port=source.proxy_port,
        created_at=source.created_at,
        category_name=category.name if category else None,
    )
