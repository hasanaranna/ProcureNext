# ============================================================
# notifications/models.py - Notification SQLAlchemy Models
# ============================================================
# Maps to ERD Module 11 (Communication - notifications part).
#
# TABLES:
#
# NOTIFICATIONS
#   - notification_id (PK, SERIAL)
#   - user_id (FK -> USERS) - recipient
#   - org_user_id (FK -> ORGANIZATION_USERS, NULLABLE) - org context
#   - title (VARCHAR)
#   - message (TEXT)
#   - type (ENUM: System, TenderUpdate, BidUpdate, Payment,
#     Invitation, Award, Deadline, Message, Verification, Affiliation)
#   - action_url (VARCHAR, NULLABLE) - deep link to relevant page
#   - is_read (BOOLEAN, DEFAULT FALSE)
#   - created_at (TIMESTAMP)
# ============================================================
