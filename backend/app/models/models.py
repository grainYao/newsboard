import enum
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SourceStatus(str, enum.Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    ERROR = "error"


class TranslationStatus(str, enum.Enum):
    NOT_TRANSLATED = "not_translated"
    TRANSLATING = "translating"
    TRANSLATED = "translated"
    FAILED = "failed"
    NOT_CONFIGURED = "not_configured"


class ProxyType(str, enum.Enum):
    HTTP = "http"
    SOCKS5 = "socks5"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at = mapped_column(DateTime, server_default=func.now())

    sources: Mapped[list["RSSSource"]] = relationship(back_populates="category", cascade="all, delete-orphan")


class RSSSource(Base):
    __tablename__ = "rss_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id"), nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="zh")
    enable_translation: Mapped[bool] = mapped_column(Boolean, default=False)
    fetch_interval: Mapped[int] = mapped_column(Integer, default=30)  # minutes
    status: Mapped[SourceStatus] = mapped_column(Enum(SourceStatus), default=SourceStatus.ACTIVE)
    last_fetched_at = mapped_column(DateTime, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at = mapped_column(DateTime, server_default=func.now())

    # per-source proxy override
    proxy_type: Mapped[Optional[ProxyType]] = mapped_column(Enum(ProxyType), nullable=True)
    proxy_host: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    proxy_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    proxy_username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    proxy_password: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    category: Mapped["Category"] = relationship(back_populates="sources")
    news_items: Mapped[list["NewsItem"]] = relationship(back_populates="source", cascade="all, delete-orphan")


class NewsItem(Base):
    __tablename__ = "news_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    link: Mapped[str] = mapped_column(String(1000), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at = mapped_column(DateTime, nullable=True)
    source_id: Mapped[int] = mapped_column(Integer, ForeignKey("rss_sources.id"), nullable=False)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id"), nullable=False)
    translation_status: Mapped[TranslationStatus] = mapped_column(
        Enum(TranslationStatus), default=TranslationStatus.NOT_TRANSLATED
    )
    translated_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    translated_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    translation_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fetched_at = mapped_column(DateTime, server_default=func.now())

    source: Mapped["RSSSource"] = relationship(back_populates="news_items")
    category: Mapped["Category"] = relationship()


class LLMConfig(Base):
    __tablename__ = "llm_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    api_key: Mapped[str] = mapped_column(String(500), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    max_tokens: Mapped[int] = mapped_column(Integer, default=4096)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # dedicated proxy for LLM
    proxy_type: Mapped[Optional[ProxyType]] = mapped_column(Enum(ProxyType), nullable=True)
    proxy_host: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    proxy_port: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    proxy_username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    proxy_password: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at = mapped_column(DateTime, server_default=func.now())


class SearchConfig(Base):
    __tablename__ = "search_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    api_key: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at = mapped_column(DateTime, server_default=func.now())


class ProxyConfig(Base):
    __tablename__ = "proxy_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="global")
    proxy_type: Mapped[ProxyType] = mapped_column(Enum(ProxyType), nullable=False)
    host: Mapped[str] = mapped_column(String(200), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    password: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_global: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at = mapped_column(DateTime, server_default=func.now())
