from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data/newsboard.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost"]

    class Config:
        env_file = ".env"


settings = Settings()
