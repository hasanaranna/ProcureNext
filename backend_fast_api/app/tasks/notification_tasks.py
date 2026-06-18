# ============================================================
# tasks/notification_tasks.py - Async Notification Tasks
# ============================================================
# PURPOSE:
# Celery tasks for sending notifications asynchronously.
# Prevents email/SMS sends from blocking the API response.
#
# TASKS TO DEFINE:
#
# - send_email_task(to, subject, template, context):
#     Send a single email via SMTP
#     Includes retry logic for transient SMTP failures
#
# - send_bulk_email_task(recipients, subject, template, context):
#     Send emails to multiple recipients (e.g., all vendors
#     who bid on a cancelled tender)
#
# - send_sms_task(phone, message):
#     Send SMS via OTP service provider
#
# - send_otp_task(phone, otp_code):
#     Send OTP code via SMS for verification
#
# - send_deadline_reminders():
#     Periodic task (Celery Beat): find tenders with deadlines
#     in the next 24 hours and notify relevant vendors
#
# - send_tender_match_notifications(tender_id):
#     When a new tender is published, notify vendors whose
#     profiles match the tender's category/skills
# ============================================================
