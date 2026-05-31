from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.models import ProxyType


class LLMConfigCreate(BaseModel):
    name: str
    base_url: str
    api_key: str
    model_name: str
    max_tokens: int = 4096
    proxy_type: Optional[ProxyType] = None
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None


class LLMConfigUpdate(BaseModel):
    name: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    max_tokens: Optional[int] = None
    is_active: Optional[bool] = None
    proxy_type: Optional[ProxyType] = None
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None


class LLMConfigOut(BaseModel):
    id: int
    name: str
    base_url: str
    api_key: str
    model_name: str
    max_tokens: int
    is_active: bool
    proxy_type: Optional[ProxyType]
    proxy_host: Optional[str]
    proxy_port: Optional[int]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
