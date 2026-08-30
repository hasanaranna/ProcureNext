# ============================================================
# tender_tasks.py - Tender lifecycle background tasks
# ============================================================

import asyncio
import logging

from app.core.db import get_db_connection
from app.modules.tenders.service import auto_close_expired_tenders
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _run_auto_close() -> int:
    async with get_db_connection() as connection:
        return await auto_close_expired_tenders(connection)


@celery_app.task(name="auto_close_expired_tenders_task")
def auto_close_expired_tenders_task() -> dict:
    """Close published tenders whose submission deadline has passed."""
    closed_count = asyncio.run(_run_auto_close())
    logger.info("Auto-closed %s expired tender(s).", closed_count)
    return {"closed_count": closed_count}
