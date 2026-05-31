from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import categories, fetch, llm, news, proxy, rss_assistant, search_config, sources
from app.services.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()


app = FastAPI(title="NewsBoard API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(sources.router)
app.include_router(news.router)
app.include_router(llm.router)
app.include_router(proxy.router)
app.include_router(fetch.router)
app.include_router(search_config.router)
app.include_router(rss_assistant.router)
app.include_router(rss_assistant.batch_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
