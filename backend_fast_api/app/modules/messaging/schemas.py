# ============================================================
# messaging/schemas.py - Messaging Pydantic Schemas
# ============================================================

from datetime import datetime
from pydantic import BaseModel


# ---------- Contact Search ----------

class ContactSearchResult(BaseModel):
    user_id: int
    full_name: str
    email: str
    role_in_org: str


# ---------- Thread ----------

class ParticipantInfo(BaseModel):
    user_id: int
    full_name: str


class ThreadListItem(BaseModel):
    thread_id: int
    thread_type: str
    group_name: str | None = None
    participants: list[ParticipantInfo]
    last_message_preview: str | None = None
    last_message_time: datetime | None = None
    unread_count: int = 0


class IntraCompanyDMCreate(BaseModel):
    participant_user_id: int


class ThreadCreatedResponse(BaseModel):
    thread_id: int
    is_new: bool


# ---------- Messages ----------

class MessageSendRequest(BaseModel):
    message_text: str


class MessageResponse(BaseModel):
    message_id: int
    thread_id: int
    sender_user_id: int
    sender_name: str
    message_text: str  # decrypted plaintext
    sent_at: datetime


class ThreadMessagesResponse(BaseModel):
    thread_id: int
    messages: list[MessageResponse]
    has_more: bool
