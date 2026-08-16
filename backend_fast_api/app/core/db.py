import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
import asyncpg
from fastapi import HTTPException

from app.core.database_url import get_database_url

logger = logging.getLogger(__name__)


async def check_db_connection() -> bool:
    """
    Checks the database connection at startup / health check.
    Attempts a lightweight query (SELECT 1).
    Returns True if connection is successful, False otherwise.
    """
    database_url = get_database_url()
    if not database_url:
        logger.error("[DB] DATABASE_URL is not set or configured.")
        return False

    try:
        connection = await asyncpg.connect(
            database_url,
            ssl="require",
            statement_cache_size=0,
            timeout=5.0,
        )
        try:
            await connection.fetchval("SELECT 1;")
            logger.info("[DB] Database connection verified successfully.")
            return True
        finally:
            await connection.close()
    except Exception as e:
        logger.error(f"[DB] Failed to connect to database at init: {e}")
        return False


@asynccontextmanager
async def get_db_connection() -> AsyncIterator[asyncpg.Connection]:
    database_url = get_database_url()
    if not database_url:
        raise HTTPException(
            status_code=500,
            detail="Database connection settings are not configured.",
        )

    # Transaction pooler (port 6543) does not support asyncpg prepared statements.
    connection = await asyncpg.connect(
        database_url,
        ssl="require",
        statement_cache_size=0,
    )
    try:
        yield connection
    finally:
        await connection.close()

