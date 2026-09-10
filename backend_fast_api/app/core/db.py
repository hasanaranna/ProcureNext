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


async def create_notifications_table() -> None:
    """
    Idempotently create the NOTIFICATIONS table and its indexes.
    If a legacy notifications table exists (without user_id column),
    it is dropped and replaced with the new schema.
    """
    database_url = get_database_url()
    if not database_url:
        logger.warning("[DB] Skipping notifications table creation: DATABASE_URL not set.")
        return

    try:
        connection = await asyncpg.connect(
            database_url,
            ssl="require",
            statement_cache_size=0,
            timeout=10.0,
        )
        try:
            # Check if the table exists and has the correct schema
            has_user_id = await connection.fetchval(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'notifications' AND column_name = 'user_id'
                """
            )

            if not has_user_id:
                # Either table doesn't exist, or it's the old legacy schema — replace it
                await connection.execute("DROP TABLE IF EXISTS notifications CASCADE")
                logger.info("[DB] Dropped legacy notifications table (if it existed).")

                await connection.execute("""
                    CREATE TABLE notifications (
                        notification_id SERIAL PRIMARY KEY,
                        user_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                        title           VARCHAR(255) NOT NULL,
                        message         TEXT NOT NULL,
                        type            VARCHAR(50) NOT NULL DEFAULT 'System',
                        action_url      VARCHAR(512),
                        is_read         BOOLEAN NOT NULL DEFAULT FALSE,
                        created_at      TIMESTAMP NOT NULL DEFAULT NOW()
                    )
                """)
                await connection.execute(
                    "CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read)"
                )
                await connection.execute(
                    "CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC)"
                )
                logger.info("[DB] NOTIFICATIONS table created with new schema.")
            else:
                logger.info("[DB] NOTIFICATIONS table already has correct schema — skipping.")
        finally:
            await connection.close()
    except Exception as exc:
        logger.error(f"[DB] Failed to create notifications table: {exc}")


async def create_password_reset_tokens_table() -> None:
    """
    Idempotently create the PASSWORD_RESET_TOKENS table and its indexes.
    """
    database_url = get_database_url()
    if not database_url:
        logger.warning("[DB] Skipping password_reset_tokens table creation: DATABASE_URL not set.")
        return

    try:
        connection = await asyncpg.connect(
            database_url,
            ssl="require",
            statement_cache_size=0,
            timeout=10.0,
        )
        try:
            await connection.execute("""
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    reset_id    SERIAL PRIMARY KEY,
                    user_id     INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    email       VARCHAR(255) NOT NULL,
                    token       VARCHAR(255) UNIQUE NOT NULL,
                    expires_at  TIMESTAMP NOT NULL,
                    used_at     TIMESTAMP,
                    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON password_reset_tokens(token)"
            )
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_pwd_reset_user_email ON password_reset_tokens(email)"
            )
            logger.info("[DB] PASSWORD_RESET_TOKENS table verified/created.")
        finally:
            await connection.close()
    except Exception as exc:
        logger.error(f"[DB] Failed to create password_reset_tokens table: {exc}")


async def create_tender_search_index() -> None:
    """
    Idempotently add the full-text search column and index used by hybrid tender search.

    Adds a generated tsvector column over the tender title (weight A) and description
    (weight B), plus a GIN index on it. Both statements are naturally idempotent, so this
    is safe to run on every startup. Purely additive - no existing data is modified.
    """
    database_url = get_database_url()
    if not database_url:
        logger.warning("[DB] Skipping tender search index creation: DATABASE_URL not set.")
        return

    try:
        connection = await asyncpg.connect(
            database_url,
            ssl="require",
            statement_cache_size=0,
            timeout=10.0,
        )
        try:
            # Two-argument to_tsvector() is required here: it is IMMUTABLE, which a
            # GENERATED ALWAYS AS ... STORED expression demands.
            await connection.execute("""
                ALTER TABLE tenders ADD COLUMN IF NOT EXISTS search_vector tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('english', title), 'A') ||
                    setweight(to_tsvector('english', description), 'B')
                ) STORED
            """)
            await connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_tenders_search_vector "
                "ON tenders USING GIN (search_vector)"
            )
            logger.info("[DB] TENDERS search_vector column and GIN index verified/created.")
        finally:
            await connection.close()
    except Exception as exc:
        logger.error(f"[DB] Failed to create tender search index: {exc}")


