# ============================================================
# notifications/service.py - Notification Business Logic
# ============================================================

import asyncpg


async def create_notification(
    connection: asyncpg.Connection,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "System",
    action_url: str | None = None,
) -> dict:
    """Create an in-app notification record."""
    row = await connection.fetchrow(
        """
        INSERT INTO notifications (user_id, title, message, type, action_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        user_id,
        title,
        message,
        notification_type,
        action_url,
    )
    return dict(row)


async def get_user_notifications(
    connection: asyncpg.Connection,
    user_id: int,
    status: str = "all",
) -> list[dict]:
    """
    Fetch notifications for a user.
    status: 'all', 'unread', or 'read'
    """
    if status == "unread":
        rows = await connection.fetch(
            """
            SELECT * FROM notifications
            WHERE user_id = $1 AND is_read = FALSE
            ORDER BY created_at DESC
            """,
            user_id,
        )
    elif status == "read":
        rows = await connection.fetch(
            """
            SELECT * FROM notifications
            WHERE user_id = $1 AND is_read = TRUE
            ORDER BY created_at DESC
            """,
            user_id,
        )
    else:
        rows = await connection.fetch(
            """
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user_id,
        )
    return [dict(r) for r in rows]


async def mark_as_read(
    connection: asyncpg.Connection,
    notification_id: int,
    user_id: int,
) -> bool:
    """Mark a single notification as read. Returns True if updated."""
    result = await connection.execute(
        """
        UPDATE notifications SET is_read = TRUE
        WHERE notification_id = $1 AND user_id = $2
        """,
        notification_id,
        user_id,
    )
    return result != "UPDATE 0"


async def mark_all_read(
    connection: asyncpg.Connection,
    user_id: int,
) -> int:
    """Mark all notifications as read for a user. Returns count updated."""
    result = await connection.execute(
        """
        UPDATE notifications SET is_read = TRUE
        WHERE user_id = $1 AND is_read = FALSE
        """,
        user_id,
    )
    # result is like "UPDATE 5"
    try:
        return int(result.split()[-1])
    except (ValueError, IndexError):
        return 0


async def get_unread_count(
    connection: asyncpg.Connection,
    user_id: int,
) -> int:
    """Count unread notifications for a user."""
    count = await connection.fetchval(
        """
        SELECT COUNT(*) FROM notifications
        WHERE user_id = $1 AND is_read = FALSE
        """,
        user_id,
    )
    return count or 0


async def delete_notification(
    connection: asyncpg.Connection,
    notification_id: int,
    user_id: int,
) -> bool:
    """Delete a notification. Returns True if deleted."""
    result = await connection.execute(
        """
        DELETE FROM notifications
        WHERE notification_id = $1 AND user_id = $2
        """,
        notification_id,
        user_id,
    )
    return result != "DELETE 0"
