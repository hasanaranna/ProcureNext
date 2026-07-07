# ============================================================
# notifications/service.py - Notification Business Logic
# ============================================================
# FUNCTIONS TO IMPLEMENT:
# - create_notification(): Create in-app notification record
# - create_bulk_notifications(): Notify multiple users at once
#   (e.g., all vendors who bid on a cancelled tender)
# - get_user_notifications(): Paginated notifications for a user
# - mark_as_read(): Mark single notification read
# - mark_all_read(): Mark all as read for a user
# - get_unread_count(): Count unread notifications
# - delete_notification(): Remove a notification
# - send_email_notification(): Trigger Celery task for email
# - send_sms_notification(): Trigger Celery task for SMS/OTP
# - publish_sse_event(): Push notification to SSE stream for
#   real-time delivery to connected frontend clients
#
# This service is called by OTHER modules whenever they need
# to send notifications:
# - Tender published -> notify matching vendors
# - Bid submitted -> notify buyer
# - Award created -> notify winner + losers
# - Payment completed -> notify org
# - Document verified -> notify user
# - Affiliation request -> notify target user
# - Deadline approaching -> notify relevant parties
# ============================================================
