# ============================================================
# messaging/router.py - Messaging REST API Endpoints
# ============================================================
# Intra-company 1:1 DM messaging with encrypted storage.
# Group chat with intra-org member addition.
# All endpoints require JWT authentication via get_current_user_org.
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Query
# pyrefly: ignore [missing-import]
import asyncpg

from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.messaging.schemas import (
    ContactSearchResult,
    GroupAddMembersRequest,
    GroupCreateRequest,
    GroupRenameRequest,
    IntraCompanyDMCreate,
    MessageResponse,
    MessageSendRequest,
    ThreadCreatedResponse,
    ThreadListItem,
    ThreadMessagesResponse,
    TransferAdminRequest,
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


@router.post("/threads/group", response_model=ThreadCreatedResponse, status_code=201)
async def create_group_thread(
    payload: GroupCreateRequest,
    current_user: dict = Depends(get_current_user_org),
):
    """Create a new group thread. Creator becomes admin. All members must be in the same org."""
    try:
        async with get_db_connection() as connection:
            result = await service.create_group_thread(
                connection,
                creator_user_id=current_user["user_id"],
                creator_org_id=current_user["organization_id"],
                participant_user_ids=payload.participant_user_ids,
                group_name=payload.group_name,
            )
            # Notify all new participants so their thread lists update
            all_ids = [current_user["user_id"]] + payload.participant_user_ids
            await manager.broadcast_to_users(
                all_ids,
                {"type": "group_updated", "thread_id": result.thread_id, "action": "group_created"},
            )
            return result
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] create_group_thread: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# --- Parameterized /threads/{thread_id} routes MUST come after fixed paths ---

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


@router.patch("/threads/{thread_id}/name")
async def rename_group_thread(
    thread_id: int,
    payload: GroupRenameRequest,
    current_user: dict = Depends(get_current_user_org),
):
    """Rename a group thread. Group admin only."""
    try:
        async with get_db_connection() as connection:
            result = await service.rename_group(
                connection,
                thread_id=thread_id,
                requester_user_id=current_user["user_id"],
                new_name=payload.group_name,
            )
            participant_ids = await service.get_thread_participant_ids(connection, thread_id)
            await manager.broadcast_to_users(
                participant_ids,
                {"type": "group_updated", "thread_id": thread_id, "action": "renamed", "group_name": result["group_name"]},
            )
            return result
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] rename_group: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/threads/{thread_id}/members")
async def add_group_members(
    thread_id: int,
    payload: GroupAddMembersRequest,
    current_user: dict = Depends(get_current_user_org),
):
    """Add members to a group thread. Group admin only. New members must be in the same org."""
    try:
        async with get_db_connection() as connection:
            result = await service.add_group_members(
                connection,
                thread_id=thread_id,
                requester_user_id=current_user["user_id"],
                new_user_ids=payload.user_ids,
            )
            # Broadcast to all participants (including newly added ones)
            participant_ids = await service.get_thread_participant_ids(connection, thread_id)
            await manager.broadcast_to_users(
                participant_ids,
                {"type": "group_updated", "thread_id": thread_id, "action": "member_added"},
            )
            return result
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] add_group_members: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/threads/{thread_id}/members/{target_user_id}")
async def remove_group_member(
    thread_id: int,
    target_user_id: int,
    current_user: dict = Depends(get_current_user_org),
):
    """Remove a member from a group thread. Group admin only."""
    try:
        async with get_db_connection() as connection:
            # Capture participant list BEFORE removal for broadcast (includes the removed user)
            participant_ids = await service.get_thread_participant_ids(connection, thread_id)
            result = await service.remove_group_member(
                connection,
                thread_id=thread_id,
                requester_user_id=current_user["user_id"],
                target_user_id=target_user_id,
            )
            await manager.broadcast_to_users(
                participant_ids,
                {"type": "group_updated", "thread_id": thread_id, "action": "member_removed", "removed_user_id": target_user_id},
            )
            return result
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] remove_group_member: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/threads/{thread_id}/admin")
async def transfer_group_admin(
    thread_id: int,
    payload: TransferAdminRequest,
    current_user: dict = Depends(get_current_user_org),
):
    """Transfer group admin role to another participant. Required before admin can leave."""
    try:
        async with get_db_connection() as connection:
            result = await service.transfer_admin(
                connection,
                thread_id=thread_id,
                current_admin_user_id=current_user["user_id"],
                new_admin_user_id=payload.new_admin_user_id,
            )
            participant_ids = await service.get_thread_participant_ids(connection, thread_id)
            await manager.broadcast_to_users(
                participant_ids,
                {"type": "group_updated", "thread_id": thread_id, "action": "admin_transferred", "new_admin_user_id": payload.new_admin_user_id},
            )
            return result
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] transfer_admin: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/threads/{thread_id}/leave")
async def leave_group_thread(
    thread_id: int,
    current_user: dict = Depends(get_current_user_org),
):
    """
    Leave a group thread.
    Admin must transfer admin rights first if other members remain.
    Thread is deleted if the last member leaves.
    """
    try:
        async with get_db_connection() as connection:
            # Capture remaining participants BEFORE leave for broadcast
            participant_ids = await service.get_thread_participant_ids(connection, thread_id)
            remaining_ids = [uid for uid in participant_ids if uid != current_user["user_id"]]
            result = await service.leave_group(
                connection,
                thread_id=thread_id,
                user_id=current_user["user_id"],
            )
            # Notify remaining members (if any)
            if remaining_ids:
                await manager.broadcast_to_users(
                    remaining_ids,
                    {"type": "group_updated", "thread_id": thread_id, "action": "member_left", "left_user_id": current_user["user_id"]},
                )
            return result
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[MESSAGING ERROR] leave_group: {exc}", flush=True)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

