from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import LLMConfig
from app.schemas.llm import LLMConfigCreate, LLMConfigOut, LLMConfigUpdate

router = APIRouter(prefix="/api/llm", tags=["llm"])


@router.get("", response_model=list[LLMConfigOut])
async def list_llm_configs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LLMConfig))
    configs = result.scalars().all()
    return [LLMConfigOut.model_validate(c) for c in configs]


@router.post("", response_model=LLMConfigOut, status_code=201)
async def create_llm_config(data: LLMConfigCreate, db: AsyncSession = Depends(get_db)):
    config = LLMConfig(**data.model_dump())
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return LLMConfigOut.model_validate(config)


@router.put("/{config_id}", response_model=LLMConfigOut)
async def update_llm_config(config_id: int, data: LLMConfigUpdate, db: AsyncSession = Depends(get_db)):
    config = await db.get(LLMConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="大模型配置不存在")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(config, field, val)

    await db.commit()
    await db.refresh(config)
    return LLMConfigOut.model_validate(config)


@router.delete("/{config_id}")
async def delete_llm_config(config_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(LLMConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="大模型配置不存在")

    await db.delete(config)
    await db.commit()
    return {"message": "删除成功"}


@router.post("/test")
async def test_llm_connection(data: LLMConfigCreate, db: AsyncSession = Depends(get_db)):
    try:
        import httpx
        from openai import OpenAI

        proxy_url = None
        if data.proxy_host and data.proxy_port:
            scheme = "http" if data.proxy_type == "http" else "socks5"
            proxy_url = f"{scheme}://{data.proxy_host}:{data.proxy_port}"

        client = OpenAI(
            base_url=data.base_url,
            api_key=data.api_key,
            http_client=httpx.Client(proxy=proxy_url) if proxy_url else None,
        )
        response = client.chat.completions.create(
            model=data.model_name,
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=10,
        )
        return {"status": "ok", "message": "连接成功"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"连接失败: {str(e)}")
