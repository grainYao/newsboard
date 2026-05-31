from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import ProxyConfig
from app.schemas.proxy import ProxyConfigCreate, ProxyConfigOut, ProxyConfigUpdate

router = APIRouter(prefix="/api/proxy", tags=["proxy"])


@router.get("", response_model=list[ProxyConfigOut])
async def list_proxy_configs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ProxyConfig))
    configs = result.scalars().all()
    return [ProxyConfigOut.model_validate(c) for c in configs]


@router.post("", response_model=ProxyConfigOut, status_code=201)
async def create_proxy_config(data: ProxyConfigCreate, db: AsyncSession = Depends(get_db)):
    config = ProxyConfig(**data.model_dump())
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return ProxyConfigOut.model_validate(config)


@router.put("/{config_id}", response_model=ProxyConfigOut)
async def update_proxy_config(config_id: int, data: ProxyConfigUpdate, db: AsyncSession = Depends(get_db)):
    config = await db.get(ProxyConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="代理配置不存在")

    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(config, field, val)

    await db.commit()
    await db.refresh(config)
    return ProxyConfigOut.model_validate(config)


@router.delete("/{config_id}")
async def delete_proxy_config(config_id: int, db: AsyncSession = Depends(get_db)):
    config = await db.get(ProxyConfig, config_id)
    if not config:
        raise HTTPException(status_code=404, detail="代理配置不存在")

    await db.delete(config)
    await db.commit()
    return {"message": "删除成功"}


@router.post("/test")
async def test_proxy(data: ProxyConfigCreate):
    try:
        import httpx

        scheme = "http" if data.proxy_type == "http" else "socks5"
        proxy_url = f"{scheme}://{data.host}:{data.port}"
        if data.username:
            auth = f"{data.username}:{data.password}@" if data.password else f"{data.username}@"
            proxy_url = f"{scheme}://{auth}{data.host}:{data.port}"

        async with httpx.AsyncClient(proxy=proxy_url) as client:
            resp = await client.get("https://httpbin.org/ip", timeout=10)
            return {"status": "ok", "message": "代理可用", "response": resp.json()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"代理不可用: {str(e)}")
