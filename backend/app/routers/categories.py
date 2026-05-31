from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.models import Category, RSSSource
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    stmt = select(Category)
    result = await db.execute(stmt)
    categories = result.scalars().all()

    out = []
    for cat in categories:
        count_stmt = select(func.count()).select_from(RSSSource).where(RSSSource.category_id == cat.id)
        count_result = await db.execute(count_stmt)
        source_count = count_result.scalar() or 0
        out.append(CategoryOut(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            created_at=cat.created_at,
            source_count=source_count,
        ))
    return out


@router.post("", response_model=CategoryOut, status_code=201)
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Category).where(Category.name == data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="分类名称已存在")

    cat = Category(name=data.name, description=data.description)
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return CategoryOut(id=cat.id, name=cat.name, description=cat.description, created_at=cat.created_at, source_count=0)


@router.put("/{category_id}", response_model=CategoryOut)
async def update_category(category_id: int, data: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    cat = await db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="分类不存在")

    if data.name is not None:
        existing = await db.execute(select(Category).where(Category.name == data.name, Category.id != category_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="分类名称已存在")
        cat.name = data.name
    if data.description is not None:
        cat.description = data.description

    await db.commit()
    await db.refresh(cat)

    count_stmt = select(func.count()).select_from(RSSSource).where(RSSSource.category_id == cat.id)
    count_result = await db.execute(count_stmt)
    source_count = count_result.scalar() or 0

    return CategoryOut(id=cat.id, name=cat.name, description=cat.description, created_at=cat.created_at, source_count=source_count)


@router.delete("/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    cat = await db.get(Category, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="分类不存在")

    count_stmt = select(func.count()).select_from(RSSSource).where(RSSSource.category_id == category_id)
    count_result = await db.execute(count_stmt)
    source_count = count_result.scalar() or 0
    if source_count > 0:
        raise HTTPException(status_code=400, detail=f"该分类下有 {source_count} 个关联数据源，请先处理")

    await db.delete(cat)
    await db.commit()
    return {"message": "删除成功"}
