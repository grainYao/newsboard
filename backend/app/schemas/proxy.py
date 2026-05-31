from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.models import ProxyType


class ProxyConfigCreate(BaseModel):
    name: str = "global"
    proxy_type: ProxyType
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    is_global: bool = False


class ProxyConfigUpdate(BaseModel):
    name: Optional[str] = None
    proxy_type: Optional[ProxyType] = None
    host: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    is_global: Optional[bool] = None


class ProxyConfigOut(BaseModel):
    id: int
    name: str
    proxy_type: ProxyType
    host: str
    port: int
    username: Optional[str]
    is_global: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
