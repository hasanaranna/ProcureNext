# ============================================================
# notifications/schemas.py - Notification Pydantic Schemas
# ============================================================

from datetime import datetime, timezone

from pydantic import BaseModel, field_validator


class NotificationResponse(BaseModel):
    notification_id: int
    user_id: int
    title: str
    message: str
    type: str
    action_url: str | None = None
    is_read: bool
    created_at: datetime

    # notifications.created_at is a TIMESTAMP WITHOUT TIME ZONE filled by NOW()
    # in UTC. Serialized as-is it has no offset, so browsers parse it as local
    # time and a brand-new notification shows as "6 hours ago" in UTC+6.
    @field_validator("created_at")
    @classmethod
    def _assume_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


class UnreadCountResponse(BaseModel):
    count: int
