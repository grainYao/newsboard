from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.models import ProxyType, TranslationStatus


class NewsItemOut(BaseModel):
    id: int
    title: str
    link: str
    summary: Optional[str]
    published_at: Optional[datetime]
    source_id: int
    category_id: int
    translation_status: TranslationStatus
    translated_title: Optional[str]
    translated_summary: Optional[str]
    fetched_at: Optional[datetime]
    source_name: Optional[str] = None
    category_name: Optional[str] = None

    class Config:
        from_attributes = True
