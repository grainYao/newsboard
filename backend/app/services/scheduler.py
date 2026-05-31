import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database import async_session
from app.models.models import RSSSource, SourceStatus
from app.services.fetcher import fetch_source

logger = logging.getLogger(__name__)

scheduler: Optional[AsyncIOScheduler] = None


async def _scheduled_fetch():
    """Fetch all active sources that are due for a fetch."""
    async with async_session() as db:
        result = await db.execute(
            select(RSSSource).where(RSSSource.status == SourceStatus.ACTIVE)
        )
        sources = result.scalars().all()

    for source in sources:
        if source.last_fetched_at:
            next_fetch = source.last_fetched_at + timedelta(minutes=source.fetch_interval)
            if datetime.now() < next_fetch:
                continue
        try:
            await fetch_source(source.id)
        except Exception as e:
            logger.error(f"Scheduled fetch failed for source {source.id}: {e}")


def start_scheduler():
    global scheduler
    scheduler = AsyncIOScheduler()
    # Run every 5 minutes to check if any source needs fetching
    scheduler.add_job(_scheduled_fetch, "interval", minutes=5, id="rss_fetch")
    scheduler.start()
    logger.info("Scheduler started")


def shutdown_scheduler():
    global scheduler
    if scheduler:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
