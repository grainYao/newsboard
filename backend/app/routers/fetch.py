from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import RSSSource, SourceStatus
from app.services import fetcher, translation

router = APIRouter(prefix="/api/fetch", tags=["fetch"])


@router.post("/{source_id}")
async def manual_fetch(source_id: int, db: AsyncSession = Depends(get_db)):
    source = await db.get(RSSSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="数据源不存在")
    if source.status == SourceStatus.DISABLED:
        raise HTTPException(status_code=400, detail="数据源已禁用")

    import asyncio
    asyncio.create_task(fetcher.fetch_source(source_id))
    return {"message": "拉取任务已触发"}


@router.post("/translate/{news_id}")
async def manual_translate(news_id: int):
    import asyncio
    asyncio.create_task(translation.translate_item(news_id))
    return {"message": "翻译任务已触发"}


@router.post("/translate/source/{source_id}")
async def batch_translate(source_id: int, db: AsyncSession = Depends(get_db)):
    source = await db.get(RSSSource, source_id)
    if not source:
        raise HTTPException(status_code=404, detail="数据源不存在")

    import asyncio
    asyncio.create_task(translation.translate_pending_for_source(source_id))
    return {"message": "批量翻译任务已触发"}
