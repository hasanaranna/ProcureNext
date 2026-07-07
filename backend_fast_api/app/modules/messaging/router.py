# ============================================================
# messaging/router.py - Messaging & Chat API Endpoints
# ============================================================
# COVERS: FR-07 (Notifications & Messaging - chat part)
#
# TWO TYPES OF MESSAGING (from PDF):
#
# 1. INTER-COMPANY (Tender-wise):
#    - Communication between buyer and vendor organizations
#    - Always associated with a specific tender
#    - Group chat with at least 4 people (2 from each side)
#    - Both org admins are always included
#    - Admins can add/remove assigned users from the chat
#    - NO one-to-one messaging between users of different companies
#
# 2. INTRA-COMPANY:
#    - Users within the same organization can chat
#    - One-to-one messaging supported
#    - Group chats where admin can broadcast to many members
#
# ENDPOINTS:
#
# GET /messages
#   - List all message threads for the current user
#   - Shows: thread_id, participants, last message preview, unread count
#
# GET /messages/{thread_id}
#   - Get all messages in a specific thread
#   - Paginated, ordered by timestamp
#
# POST /messages/{thread_id}
#   - Send a reply in a thread
#   - Accepts: message_text, attachments (optional)
#
# POST /messages/inter-company
#   - Create a new inter-company thread for a tender
#   - Accepts: tender_id, vendor_org_id (buyer creates)
#   - Auto-adds both org admins as participants
#
# POST /messages/intra-company
#   - Create intra-company thread (one-to-one or group)
#   - Accepts: participant_user_ids, is_group, group_name
#
# POST /messages/{thread_id}/participants
#   - Admin adds a user to a thread
#
# DELETE /messages/{thread_id}/participants/{user_id}
#   - Admin removes a user from a thread
#
# WebSocket: /ws/messages/{thread_id}
#   - Real-time WebSocket connection for live chat
#   - Messages pushed instantly to all connected participants
# ============================================================
