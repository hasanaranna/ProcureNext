# ============================================================
# notifications/router.py - Notification API Endpoints
# ============================================================
# COVERS: FR-07 (Notifications & Messaging - notification part)
#
# NOTIFICATION TYPES (from PDF):
# User-specific: incoming messages, document verification status
# Organization-specific: affiliation requests, org verification
# Workflow: bid acceptance/rejection, invitation, deadline alerts,
#           NOA issuance, bid-bond refunds, payment confirmations
#
# DELIVERY CHANNELS:
# - In-app (stored in DB, fetched via API)
# - Email (sent via SMTP, triggered by Celery tasks)
# - Real-time push via SSE (Server-Sent Events)
#
# ENDPOINTS:
#
# GET /notifications
#   - List all notifications for the current user
#   - Paginated, filterable by type and read/unread status
#
# PATCH /notifications/{notification_id}/read
#   - Mark a single notification as read
#
# PATCH /notifications/read-all
#   - Mark all notifications as read
#
# GET /notifications/unread-count
#   - Get count of unread notifications (for badge display)
#
# GET /notifications/stream
#   - SSE endpoint: maintains persistent connection for real-time push
#   - Pushes new notifications as they arrive without page refresh
#   - Frontend EventSource connects to this endpoint
#
# DELETE /notifications/{notification_id}
#   - Delete a notification
# ============================================================
