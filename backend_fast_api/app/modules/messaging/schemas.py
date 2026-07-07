# ============================================================
# messaging/schemas.py - Messaging Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - ThreadListItem: thread_id, type (inter/intra), participants,
#   last_message_preview, unread_count, tender_id (if inter-company)
# - MessageResponse: message_id, sender, text, sent_at, attachments
# - MessageSendRequest: message_text, attachment_ids (optional)
# - InterCompanyThreadCreate: tender_id, vendor_org_id
# - IntraCompanyThreadCreate: participant_user_ids, is_group, group_name
# - ThreadParticipantAdd: user_id
# - ThreadDetailResponse: thread info + paginated messages
# ============================================================
