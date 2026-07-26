# ============================================================
# messaging/router.py - Messaging REST API Endpoints
# ============================================================
# Intra-company 1:1 DM messaging with encrypted storage.
# All endpoints require JWT authentication via get_current_user_org.
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
import asyncpg

from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.messaging.schemas import (
    ContactSearchResult,
    IntraCompanyDMCreate,
    MessageResponse,
    MessageSendRequest,
    ThreadCreatedResponse,
    ThreadListItem,
    ThreadMessagesResponse,
)
from app.modules.messaging import service
from app.modules.messaging.websocket import manager

router = APIRouter(prefix="/api/messages", tags=["messaging"])


@router.get("/contacts/search", response_model=list[ContactSearchResult])
async def search_contacts(
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: dict = Depends(get_current_user_org),
):
    """Search for contacts within the same organization."""
    try:
        async with get_db_connection() as connection:
            return await service.search_org_contacts(
                connection,
                user_id=current_user["user_id"],
                organization_id=current_user["organization_id"],
                query=q,
            )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] search_contacts: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/threads", response_model=list[ThreadListItem])
async def get_threads(
    current_user: dict = Depends(get_current_user_org),
):
    """List all message threads for the current user."""
    try:
        async with get_db_connection() as connection:
            return await service.list_user_threads(
                connection,
                user_id=current_user["user_id"],
            )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] get_threads: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/threads/dm", response_model=ThreadCreatedResponse)
async def create_dm_thread(
    payload: IntraCompanyDMCreate,
    current_user: dict = Depends(get_current_user_org),
):
    """Create or retrieve a 1:1 DM thread with another user in the same org."""
    try:
        async with get_db_connection() as connection:
            return await service.get_or_create_dm_thread(
                connection,
                user_id=current_user["user_id"],
                organization_id=current_user["organization_id"],
                other_user_id=payload.participant_user_id,
            )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] create_dm_thread: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/threads/{thread_id}", response_model=ThreadMessagesResponse)
async def get_thread_messages(
    thread_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user_org),
):
    """Get paginated messages for a specific thread."""
    try:
        async with get_db_connection() as connection:
            return await service.get_thread_messages(
                connection,
                thread_id=thread_id,
                user_id=current_user["user_id"],
                limit=limit,
                offset=offset,
            )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] get_thread_messages: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/threads/{thread_id}", response_model=MessageResponse)
async def post_message(
    thread_id: int,
    payload: MessageSendRequest,
    current_user: dict = Depends(get_current_user_org),
):
    """Send a message in a thread. Message is encrypted before storage."""
    try:
        async with get_db_connection() as connection:
            msg = await service.send_message(
                connection,
                thread_id=thread_id,
                user_id=current_user["user_id"],
                plaintext=payload.message_text,
            )

            # Broadcast to WebSocket connections
            participant_ids = await service.get_thread_participant_ids(
                connection, thread_id
            )
            await manager.broadcast_to_users(
                participant_ids,
                {
                    "type": "new_message",
                    "message": msg.model_dump(mode="json"),
                },
            )

            return msg
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] post_message: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.put("/threads/{thread_id}/read")
async def mark_read(
    thread_id: int,
    current_user: dict = Depends(get_current_user_org),
):
    """Mark all messages in a thread as read for the current user."""
    try:
        async with get_db_connection() as connection:
            await service.mark_thread_read(
                connection,
                thread_id=thread_id,
                user_id=current_user["user_id"],
            )
            return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] mark_read: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
