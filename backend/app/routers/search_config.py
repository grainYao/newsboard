from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import SearchConfig
from app.schemas.search import SearchConfigOut, SearchConfigUpdate

router = APIRouter(prefix="/api/search-config", tags=["search-config"])


@router.get("", response_model=SearchConfigOut)
async def get_search_config(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SearchConfig))
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=404, detail="搜索配置不存在")
    return SearchConfigOut.model_validate(config)


@router.put("", response_model=SearchConfigOut)
async def upsert_search_config(data: SearchConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SearchConfig))
    config = result.scalar_one_or_none()

    if config:
        config.api_key = data.api_key
    else:
        config = SearchConfig(api_key=data.api_key)
        db.add(config)

    await db.commit()
    await db.refresh(config)
    return SearchConfigOut.model_validate(config)
