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
            SELECT u.user_id, u.full_name, tp.is_admin
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
                is_admin=p["is_admin"],
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


# ============================================================
# Group Chat Functions
# ============================================================

async def _delete_thread_if_empty(
    connection: asyncpg.Connection,
    thread_id: int,
) -> None:
    """
    Delete a thread and all its messages if no participants remain.
    Performs explicit ordered deletion because the FKs do not have ON DELETE CASCADE.
    Order: messages → thread_participants → message_threads
    """
    count = await connection.fetchval(
        "SELECT COUNT(*) FROM thread_participants WHERE thread_id = $1",
        thread_id,
    )
    if count == 0:
        await connection.execute(
            "DELETE FROM messages WHERE thread_id = $1", thread_id
        )
        await connection.execute(
            "DELETE FROM thread_participants WHERE thread_id = $1", thread_id
        )
        await connection.execute(
            "DELETE FROM message_threads WHERE thread_id = $1", thread_id
        )


async def create_group_thread(
    connection: asyncpg.Connection,
    creator_user_id: int,
    creator_org_id: int,
    participant_user_ids: list[int],
    group_name: str,
) -> ThreadCreatedResponse:
    """
    Create a new IntraCompany group thread.
    - creator is automatically added as admin (is_admin=TRUE).
    - all participant_user_ids must belong to the same org as the creator.
    - participant_user_ids must not include the creator (de-duplicated automatically).
    - Minimum 1 other participant required.
    """
    group_name = group_name.strip()
    if not group_name:
        raise HTTPException(status_code=400, detail="Group name cannot be empty.")

    # Deduplicate and exclude creator from the participant list
    other_ids = list({uid for uid in participant_user_ids if uid != creator_user_id})
    if not other_ids:
        raise HTTPException(status_code=400, detail="A group must have at least one other participant.")

    # Validate every participant belongs to the creator's organization
    for uid in other_ids:
        row = await connection.fetchrow(
            """
            SELECT organization_id FROM organization_employees
            WHERE user_id = $1 AND organization_id = $2
            """,
            uid,
            creator_org_id,
        )
        if not row:
            raise HTTPException(
                status_code=403,
                detail=f"User {uid} is not a member of your organization.",
            )

    async with connection.transaction():
        thread = await connection.fetchrow(
            """
            INSERT INTO message_threads (thread_type, group_name, created_by)
            VALUES ('IntraCompany', $1, $2)
            RETURNING thread_id
            """,
            group_name,
            creator_user_id,
        )
        thread_id = thread["thread_id"]

        # Add creator as admin
        await connection.execute(
            """
            INSERT INTO thread_participants (thread_id, user_id, organization_id, is_admin)
            VALUES ($1, $2, $3, TRUE)
            """,
            thread_id,
            creator_user_id,
            creator_org_id,
        )

        # Add other participants (non-admin)
        for uid in other_ids:
            already_exists = await connection.fetchval(
                "SELECT 1 FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
                thread_id,
                uid,
            )
            if not already_exists:
                await connection.execute(
                    """
                    INSERT INTO thread_participants (thread_id, user_id, organization_id, is_admin)
                    VALUES ($1, $2, $3, FALSE)
                    """,
                    thread_id,
                    uid,
                    creator_org_id,
                )

    return ThreadCreatedResponse(thread_id=thread_id, is_new=True)


async def rename_group(
    connection: asyncpg.Connection,
    thread_id: int,
    requester_user_id: int,
    new_name: str,
) -> dict:
    """
    Rename a group thread. Only the group admin can rename.
    """
    new_name = new_name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Group name cannot be empty.")

    # Verify thread is a group
    thread = await connection.fetchrow(
        "SELECT group_name FROM message_threads WHERE thread_id = $1",
        thread_id,
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found.")
    if thread["group_name"] is None:
        raise HTTPException(status_code=400, detail="This is not a group thread.")

    # Verify requester is group admin
    participant = await connection.fetchrow(
        "SELECT is_admin FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
        thread_id,
        requester_user_id,
    )
    if not participant:
        raise HTTPException(status_code=403, detail="You are not a participant in this group.")
    if not participant["is_admin"]:
        raise HTTPException(status_code=403, detail="Only the group admin can rename the group.")

    await connection.execute(
        "UPDATE message_threads SET group_name = $1 WHERE thread_id = $2",
        new_name,
        thread_id,
    )
    return {"group_name": new_name}


async def add_group_members(
    connection: asyncpg.Connection,
    thread_id: int,
    requester_user_id: int,
    new_user_ids: list[int],
) -> dict:
    """
    Add new members to a group thread. Admin only.
    New members must belong to the requester's own organization (always intra-org).
    """
    if not new_user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided.")

    # Verify thread is a group
    thread = await connection.fetchrow(
        "SELECT group_name FROM message_threads WHERE thread_id = $1",
        thread_id,
    )
    if not thread or thread["group_name"] is None:
        raise HTTPException(status_code=404, detail="Group thread not found.")

    # Verify requester is admin
    participant = await connection.fetchrow(
        "SELECT is_admin, organization_id FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
        thread_id,
        requester_user_id,
    )
    if not participant:
        raise HTTPException(status_code=403, detail="You are not a participant in this group.")
    if not participant["is_admin"]:
        raise HTTPException(status_code=403, detail="Only the group admin can add members.")

    requester_org_id = participant["organization_id"]

    # Validate all new users are in the requester's org (always intra-org)
    for uid in new_user_ids:
        row = await connection.fetchrow(
            """
            SELECT organization_id FROM organization_employees
            WHERE user_id = $1 AND organization_id = $2
            """,
            uid,
            requester_org_id,
        )
        if not row:
            raise HTTPException(
                status_code=403,
                detail=f"User {uid} is not a member of your organization.",
            )

    added = 0
    for uid in new_user_ids:
        already_exists = await connection.fetchval(
            "SELECT 1 FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
            thread_id,
            uid,
        )
        if not already_exists:
            await connection.execute(
                """
                INSERT INTO thread_participants (thread_id, user_id, organization_id, is_admin)
                VALUES ($1, $2, $3, FALSE)
                """,
                thread_id,
                uid,
                requester_org_id,
            )
            added += 1

    return {"added": added}


async def remove_group_member(
    connection: asyncpg.Connection,
    thread_id: int,
    requester_user_id: int,
    target_user_id: int,
) -> dict:
    """
    Remove a member from a group thread. Admin only.
    Admin cannot remove themselves — use leave_group / transfer_admin for that.
    """
    if requester_user_id == target_user_id:
        raise HTTPException(
            status_code=400,
            detail="Admins cannot remove themselves. Use 'Leave Group' after transferring admin.",
        )

    # Verify thread is a group
    thread = await connection.fetchrow(
        "SELECT group_name FROM message_threads WHERE thread_id = $1",
        thread_id,
    )
    if not thread or thread["group_name"] is None:
        raise HTTPException(status_code=404, detail="Group thread not found.")

    # Verify requester is admin
    requester = await connection.fetchrow(
        "SELECT is_admin FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
        thread_id,
        requester_user_id,
    )
    if not requester or not requester["is_admin"]:
        raise HTTPException(status_code=403, detail="Only the group admin can remove members.")

    # Verify target is in the group
    target = await connection.fetchrow(
        "SELECT id FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
        thread_id,
        target_user_id,
    )
    if not target:
        raise HTTPException(status_code=404, detail="Target user is not in this group.")

    async with connection.transaction():
        await connection.execute(
            "DELETE FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
            thread_id,
            target_user_id,
        )
        await _delete_thread_if_empty(connection, thread_id)

    return {"removed": True}


async def transfer_admin(
    connection: asyncpg.Connection,
    thread_id: int,
    current_admin_user_id: int,
    new_admin_user_id: int,
) -> dict:
    """
    Transfer group admin role to another participant.
    Required before the current admin can leave.
    """
    if current_admin_user_id == new_admin_user_id:
        raise HTTPException(status_code=400, detail="You are already the admin.")

    # Verify thread is a group
    thread = await connection.fetchrow(
        "SELECT group_name FROM message_threads WHERE thread_id = $1",
        thread_id,
    )
    if not thread or thread["group_name"] is None:
        raise HTTPException(status_code=404, detail="Group thread not found.")

    # Verify requester is current admin
    requester = await connection.fetchrow(
        "SELECT is_admin FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
        thread_id,
        current_admin_user_id,
    )
    if not requester or not requester["is_admin"]:
        raise HTTPException(status_code=403, detail="Only the current admin can transfer admin rights.")

    # Verify new admin is a participant
    new_admin = await connection.fetchrow(
        "SELECT id FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
        thread_id,
        new_admin_user_id,
    )
    if not new_admin:
        raise HTTPException(status_code=404, detail="Target user is not in this group.")

    async with connection.transaction():
        # Demote current admin
        await connection.execute(
            "UPDATE thread_participants SET is_admin = FALSE WHERE thread_id = $1 AND user_id = $2",
            thread_id,
            current_admin_user_id,
        )
        # Promote new admin
        await connection.execute(
            "UPDATE thread_participants SET is_admin = TRUE WHERE thread_id = $1 AND user_id = $2",
            thread_id,
            new_admin_user_id,
        )

    return {"transferred_to": new_admin_user_id}


async def leave_group(
    connection: asyncpg.Connection,
    thread_id: int,
    user_id: int,
) -> dict:
    """
    Leave a group thread.
    - Admin cannot leave without transferring admin first (if others remain).
    - If the leaving user is the last participant, the thread is deleted.
    """
    # Verify thread is a group
    thread = await connection.fetchrow(
        "SELECT group_name FROM message_threads WHERE thread_id = $1",
        thread_id,
    )
    if not thread or thread["group_name"] is None:
        raise HTTPException(status_code=404, detail="Group thread not found.")

    # Verify user is a participant
    participant = await connection.fetchrow(
        "SELECT is_admin FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
        thread_id,
        user_id,
    )
    if not participant:
        raise HTTPException(status_code=403, detail="You are not a participant in this group.")

    # If user is admin, check how many other members remain
    if participant["is_admin"]:
        other_count = await connection.fetchval(
            "SELECT COUNT(*) FROM thread_participants WHERE thread_id = $1 AND user_id != $2",
            thread_id,
            user_id,
        )
        if other_count > 0:
            raise HTTPException(
                status_code=400,
                detail=(
                    "You are the group admin. Please transfer admin rights to another member "
                    "before leaving the group."
                ),
            )
        # Admin is the last person — allow deletion
    
    async with connection.transaction():
        await connection.execute(
            "DELETE FROM thread_participants WHERE thread_id = $1 AND user_id = $2",
            thread_id,
            user_id,
        )
        await _delete_thread_if_empty(connection, thread_id)

    return {"left": True}

