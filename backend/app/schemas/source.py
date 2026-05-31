from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.models import ProxyType, SourceStatus


class RSSSourceCreate(BaseModel):
    name: str
    url: str
    category_id: int
    language: str = "zh"
    enable_translation: bool = False
    fetch_interval: int = 30
    # per-source proxy
    proxy_type: Optional[ProxyType] = None
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None


class RSSSourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    category_id: Optional[int] = None
    language: Optional[str] = None
    enable_translation: Optional[bool] = None
    fetch_interval: Optional[int] = None
    proxy_type: Optional[ProxyType] = None
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None


class RSSSourceOut(BaseModel):
    id: int
    name: str
    url: str
    category_id: int
    language: str
    enable_translation: bool
    fetch_interval: int
    status: SourceStatus
    last_fetched_at: Optional[datetime]
    error_message: Optional[str]
    proxy_type: Optional[ProxyType]
    proxy_host: Optional[str]
    proxy_port: Optional[int]
    created_at: Optional[datetime]
    category_name: Optional[str] = None

    class Config:
        from_attributes = True
