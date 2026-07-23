# ============================================================
# messaging/service.py - Messaging Business Logic
# ============================================================
# All database operations use raw asyncpg queries, consistent
# with the project's existing pattern (see auth/service.py).
# Messages are encrypted before INSERT and decrypted on SELECT.
# ============================================================

# pyrefly: ignore [missing-import]
import asyncpg
from fastapi import HTTPException

from app.modules.messaging.encryption import encrypt_message, decrypt_message
from app.modules.messaging.schemas import (
    ContactSearchResult,
    MessageResponse,
    ParticipantInfo,
    ThreadCreatedResponse,
    ThreadListItem,
    ThreadMessagesResponse,
)


async def search_org_contacts(
    connection: asyncpg.Connection,
    user_id: int,
    organization_id: int,
    query: str,
) -> list[ContactSearchResult]:
    """
    Search for users within the same organization.
    Matches against full_name or email (case-insensitive).
    Excludes the requesting user from results.
    """
    if not query or len(query.strip()) < 1:
        return []

    search_pattern = f"%{query.strip()}%"

    rows = await connection.fetch(
        """
        SELECT u.user_id, u.full_name, u.email, oe.role_in_org
        FROM users u
        JOIN organization_employees oe ON u.user_id = oe.user_id
        WHERE oe.organization_id = $1
          AND u.user_id != $2
          AND u.status = 'Active'
          AND (u.full_name ILIKE $3 OR u.email ILIKE $3)
        ORDER BY u.full_name
        LIMIT 20
        """,
        organization_id,
        user_id,
        search_pattern,
    )

    return [
        ContactSearchResult(
            user_id=row["user_id"],
            full_name=row["full_name"] or row["email"],
            email=row["email"],
            role_in_org=row["role_in_org"],
        )
        for row in rows
    ]


async def get_or_create_dm_thread(
    connection: asyncpg.Connection,
    user_id: int,
    organization_id: int,
    other_user_id: int,
) -> ThreadCreatedResponse:
    """
    Find an existing 1:1 DM thread between two users, or create one.
    Both users must be in the same organization.
    """
    if user_id == other_user_id:
        raise HTTPException(status_code=400, detail="Cannot create a DM thread with yourself.")

    # Verify the other user is in the same organization
    other_org = await connection.fetchrow(
        """
        SELECT oe.organization_id
        FROM organization_employees oe
        WHERE oe.user_id = $1 AND oe.organization_id = $2
        """,
        other_user_id,
        organization_id,
    )
    if not other_org:
        raise HTTPException(status_code=403, detail="Target user is not in your organization.")

    # Check for existing 1:1 IntraCompany thread between these two users
    existing = await connection.fetchrow(
        """
        SELECT tp1.thread_id
        FROM thread_participants tp1
        JOIN thread_participants tp2 ON tp1.thread_id = tp2.thread_id
        JOIN message_threads mt ON mt.thread_id = tp1.thread_id
        WHERE tp1.user_id = $1
          AND tp2.user_id = $2
          AND mt.thread_type = 'IntraCompany'
          AND mt.group_name IS NULL
          AND (
            SELECT COUNT(*) FROM thread_participants tp3
            WHERE tp3.thread_id = mt.thread_id
          ) = 2
        """,
        user_id,
        other_user_id,
    )

    if existing:
        return ThreadCreatedResponse(thread_id=existing["thread_id"], is_new=False)

    # Create new thread
    async with connection.transaction():
        thread = await connection.fetchrow(
            """
            INSERT INTO message_threads (thread_type, created_by)
            VALUES ('IntraCompany', $1)
            RETURNING thread_id
            """,
            user_id,
        )
        thread_id = thread["thread_id"]

        # Add both participants
        await connection.execute(
            """
            INSERT INTO thread_participants (thread_id, user_id, organization_id, is_admin)
            VALUES ($1, $2, $3, TRUE), ($1, $4, $3, FALSE)
            """,
            thread_id,
            user_id,
            organization_id,
            other_user_id,
        )

    return ThreadCreatedResponse(thread_id=thread_id, is_new=True)


async def list_user_threads(
    connection: asyncpg.Connection,
    user_id: int,
) -> list[ThreadListItem]:
    """
    Get all threads the user participates in, with last message
    preview (decrypted), unread count, and participant info.
    """
    threads = await connection.fetch(
        """
        SELECT
            mt.thread_id,
            mt.thread_type,
            mt.group_name,
            tp.last_read_at
        FROM message_threads mt
        JOIN thread_participants tp ON mt.thread_id = tp.thread_id
        WHERE tp.user_id = $1
        ORDER BY mt.created_at DESC
        """,
        user_id,
    )

    if not threads:
        return []

    result = []
    for t in threads:
        thread_id = t["thread_id"]
        last_read_at = t["last_read_at"]

        # Get participants for this thread
        participants_rows = await connection.fetch(
            """
            SELECT u.user_id, u.full_name
            FROM thread_participants tp
            JOIN users u ON tp.user_id = u.user_id
            WHERE tp.thread_id = $1
            """,
            thread_id,
        )
        participants = [
            ParticipantInfo(
                user_id=p["user_id"],
                full_name=p["full_name"] or "Unknown",
            )
            for p in participants_rows
        ]

        # Get last message
        last_msg = await connection.fetchrow(
            """
            SELECT message_text, encryption_iv, sent_at
            FROM messages
            WHERE thread_id = $1
            ORDER BY sent_at DESC
            LIMIT 1
            """,
            thread_id,
        )

        last_message_preview = None
        last_message_time = None
        if last_msg:
            try:
                plaintext = decrypt_message(last_msg["message_text"], last_msg["encryption_iv"])
                last_message_preview = plaintext[:80] + ("..." if len(plaintext) > 80 else "")
            except Exception:
                last_message_preview = "[encrypted message]"
            last_message_time = last_msg["sent_at"]

        # Count unread messages
        unread_count = 0
        if last_read_at:
            unread_row = await connection.fetchrow(
                """
                SELECT COUNT(*) as cnt
                FROM messages
                WHERE thread_id = $1 AND sent_at > $2 AND sender_user_id != $3
                """,
                thread_id,
                last_read_at,
                user_id,
            )
            unread_count = unread_row["cnt"] if unread_row else 0
        else:
            # Never read — all messages from others are unread
            unread_row = await connection.fetchrow(
                """
                SELECT COUNT(*) as cnt
                FROM messages
                WHERE thread_id = $1 AND sender_user_id != $2
                """,
                thread_id,
                user_id,
            )
            unread_count = unread_row["cnt"] if unread_row else 0

        result.append(
            ThreadListItem(
                thread_id=thread_id,
                thread_type=t["thread_type"],
                group_name=t["group_name"],
                participants=participants,
                last_message_preview=last_message_preview,
                last_message_time=last_message_time,
                unread_count=unread_count,
            )
        )

    # Sort by last message time (threads with messages first)
    with_msgs = [r for r in result if r.last_message_time is not None]
    without_msgs = [r for r in result if r.last_message_time is None]
    with_msgs.sort(key=lambda x: x.last_message_time, reverse=True)
    return with_msgs + without_msgs


async def get_thread_messages(
    connection: asyncpg.Connection,
    thread_id: int,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
) -> ThreadMessagesResponse:
    """
    Get paginated messages for a thread. Verifies the user is a participant.
    Decrypts each message before returning.
    """
    # Verify user is a participant
    participant = await connection.fetchrow(
        "SELECT id FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
        thread_id,
        user_id,
    )
    if not participant:
        raise HTTPException(status_code=403, detail="You are not a participant in this thread.")

    rows = await connection.fetch(
        """
        SELECT m.message_id, m.thread_id, m.sender_user_id,
               m.message_text, m.encryption_iv, m.sent_at,
               u.full_name as sender_name
        FROM messages m
        JOIN users u ON m.sender_user_id = u.user_id
        WHERE m.thread_id = $1
        ORDER BY m.sent_at ASC
        LIMIT $2 OFFSET $3
        """,
        thread_id,
        limit + 1,  # fetch one extra to determine has_more
        offset,
    )

    has_more = len(rows) > limit
    rows = rows[:limit]

    messages = []
    for row in rows:
        try:
            plaintext = decrypt_message(row["message_text"], row["encryption_iv"])
        except Exception:
            plaintext = "[could not decrypt message]"

        messages.append(
            MessageResponse(
                message_id=row["message_id"],
                thread_id=row["thread_id"],
                sender_user_id=row["sender_user_id"],
                sender_name=row["sender_name"] or "Unknown",
                message_text=plaintext,
                sent_at=row["sent_at"],
            )
        )

    return ThreadMessagesResponse(
        thread_id=thread_id,
        messages=messages,
        has_more=has_more,
    )


async def send_message(
    connection: asyncpg.Connection,
    thread_id: int,
    user_id: int,
    plaintext: str,
) -> MessageResponse:
    """
    Encrypt and store a message, then return the decrypted response.
    """
    # Verify user is a participant
    participant = await connection.fetchrow(
        "SELECT id FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
        thread_id,
        user_id,
    )
    if not participant:
        raise HTTPException(status_code=403, detail="You are not a participant in this thread.")

    if not plaintext or not plaintext.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Encrypt the message
    ciphertext_b64, iv_b64 = encrypt_message(plaintext.strip())

    # Insert encrypted message
    row = await connection.fetchrow(
        """
        INSERT INTO messages (thread_id, sender_user_id, message_text, encryption_iv)
        VALUES ($1, $2, $3, $4)
        RETURNING message_id, sent_at
        """,
        thread_id,
        user_id,
        ciphertext_b64,
        iv_b64,
    )

    # Get sender name
    sender = await connection.fetchrow(
        "SELECT full_name FROM users WHERE user_id = $1",
        user_id,
    )

    return MessageResponse(
        message_id=row["message_id"],
        thread_id=thread_id,
        sender_user_id=user_id,
        sender_name=sender["full_name"] if sender else "Unknown",
        message_text=plaintext.strip(),
        sent_at=row["sent_at"],
    )


async def mark_thread_read(
    connection: asyncpg.Connection,
    thread_id: int,
    user_id: int,
) -> None:
    """Update last_read_at for a user in a thread."""
    await connection.execute(
        """
        UPDATE thread_participants
        SET last_read_at = NOW()
        WHERE thread_id = $1 AND user_id = $2
        """,
        thread_id,
        user_id,
    )


async def get_thread_participant_ids(
    connection: asyncpg.Connection,
    thread_id: int,
) -> list[int]:
    """Get all participant user_ids for a thread (used by WebSocket broadcast)."""
    rows = await connection.fetch(
        "SELECT user_id FROM thread_participants WHERE thread_id = $1",
        thread_id,
    )
    return [row["user_id"] for row in rows]
