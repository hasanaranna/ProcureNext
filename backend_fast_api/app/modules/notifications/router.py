# ============================================================
# notifications/router.py - Notification API Endpoints
# ============================================================

from fastapi import APIRouter, HTTPException, Depends, Query
# pyrefly: ignore [missing-import]
import asyncpg

from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.notifications.schemas import NotificationResponse, UnreadCountResponse
from app.modules.notifications.service import (
    get_user_notifications,
    mark_as_read,
    mark_all_read,
    get_unread_count,
    delete_notification,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    status: str = Query("all", regex="^(all|unread|read)$"),
    current_user: dict = Depends(get_current_user_org),
):
    """List notifications for the current user, filterable by status."""
    try:
        async with get_db_connection() as connection:
            return await get_user_notifications(
                connection, current_user["user_id"], status
            )
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.get("/list", response_model=list[NotificationResponse])
async def list_notifications_alias(
    status: str = Query("all", regex="^(all|unread|read)$"),
    current_user: dict = Depends(get_current_user_org),
):
    """Alias for GET /notifications — needed because the Next.js catch-all proxy requires a path segment."""
    return await list_notifications(status=status, current_user=current_user)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(current_user: dict = Depends(get_current_user_org)):
    """Get count of unread notifications for badge display."""
    try:
        async with get_db_connection() as connection:
            count = await get_unread_count(connection, current_user["user_id"])
            return {"count": count}
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: dict = Depends(get_current_user_org),
):
    """Mark a single notification as read."""
    try:
        async with get_db_connection() as connection:
            updated = await mark_as_read(
                connection, notification_id, current_user["user_id"]
            )
            if not updated:
                raise HTTPException(status_code=404, detail="Notification not found")
            return {"message": "Notification marked as read"}
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.patch("/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user_org),
):
    """Mark all notifications as read for the current user."""
    try:
        async with get_db_connection() as connection:
            count = await mark_all_read(connection, current_user["user_id"])
            return {"message": f"Marked {count} notifications as read"}
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc


@router.delete("/{notification_id}")
async def delete_notification_endpoint(
    notification_id: int,
    current_user: dict = Depends(get_current_user_org),
):
    """Delete a notification."""
    try:
        async with get_db_connection() as connection:
            deleted = await delete_notification(
                connection, notification_id, current_user["user_id"]
            )
            if not deleted:
                raise HTTPException(status_code=404, detail="Notification not found")
            return {"message": "Notification deleted"}
    except HTTPException:
        raise
    except asyncpg.PostgresError as exc:
        print(f"[DB ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"Database Error: {str(exc)}") from exc
    except Exception as exc:
        print(f"[SYSTEM ERROR] {exc}", flush=True)
        raise HTTPException(status_code=500, detail=f"System Error: {str(exc)}") from exc
