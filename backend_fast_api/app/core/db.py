from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

# pyrefly: ignore [missing-import]
import asyncpg
from fastapi import HTTPException

from app.core.database_url import get_database_url


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
