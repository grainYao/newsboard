from typing import Optional

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class RssRecommendation(BaseModel):
    name: str
    url: str
    description: Optional[str] = None
    suggested_category: Optional[str] = None


class RecommendRequest(BaseModel):
    messages: list[ChatMessage]


class RecommendResponse(BaseModel):
    text: str
    sources: list[RssRecommendation]
    has_config: bool


class BatchCreateRequest(BaseModel):
    sources: list[RssRecommendation]
