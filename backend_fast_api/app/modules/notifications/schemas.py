# ============================================================
# notifications/schemas.py - Notification Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - NotificationResponse: id, title, message, type, is_read,
#   created_at, action_url (optional deep link)
# - NotificationListResponse: paginated list
# - UnreadCountResponse: count
# - NotificationCreate: (internal) title, message, type,
#   target_user_id, action_url
# ============================================================
