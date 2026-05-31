from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SearchConfigOut(BaseModel):
    id: int
    api_key: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SearchConfigUpdate(BaseModel):
    api_key: str
