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
    is_admin: bool = False


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


# ---------- Group Chat ----------

class GroupCreateRequest(BaseModel):
    """Create a new group thread. participant_user_ids are the other members (not the creator)."""
    participant_user_ids: list[int]
    group_name: str


class GroupRenameRequest(BaseModel):
    group_name: str


class GroupAddMembersRequest(BaseModel):
    """Add one or more members to a group. Only intra-org users are permitted."""
    user_ids: list[int]


class TransferAdminRequest(BaseModel):
    """Transfer group admin role to another participant before the current admin leaves."""
    new_admin_user_id: int


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
