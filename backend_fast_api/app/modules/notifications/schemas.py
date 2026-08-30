# ============================================================
# notifications/schemas.py - Notification Pydantic Schemas
# ============================================================

from pydantic import BaseModel
from datetime import datetime


class NotificationResponse(BaseModel):
    notification_id: int
    user_id: int
    title: str
    message: str
    type: str
    action_url: str | None = None
    is_read: bool
    created_at: datetime


class UnreadCountResponse(BaseModel):
    count: int
