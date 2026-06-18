# ============================================================
# messaging/models.py - Messaging SQLAlchemy Models
# ============================================================
# Maps to ERD Module 11 (Communication - messaging part).
#
# TABLES:
#
# MESSAGE_THREADS
#   - thread_id (PK, SERIAL)
#   - thread_type (ENUM: InterCompany, IntraCompany)
#   - tender_id (FK -> TENDERS, NULLABLE) - for inter-company threads
#   - group_name (VARCHAR, NULLABLE) - for named group chats
#   - created_by (FK -> USERS)
#   - created_at (TIMESTAMP)
#
# THREAD_PARTICIPANTS
#   - id (PK, SERIAL)
#   - thread_id (FK -> MESSAGE_THREADS)
#   - user_id (FK -> USERS)
#   - organization_id (FK -> ORGANIZATIONS) - which org this user represents
#   - is_admin (BOOLEAN) - can manage participants
#   - joined_at (TIMESTAMP)
#   - last_read_at (TIMESTAMP, NULLABLE) - for unread tracking
#   - UNIQUE(thread_id, user_id)
#
# MESSAGES
#   - message_id (PK, SERIAL)
#   - thread_id (FK -> MESSAGE_THREADS)
#   - sender_user_id (FK -> USERS)
#   - message_text (TEXT)
#   - sent_at (TIMESTAMP)
#
# MESSAGE_ATTACHMENTS
#   - attachment_id (PK, SERIAL)
#   - message_id (FK -> MESSAGES)
#   - file_name (VARCHAR)
#   - file_path (TEXT) - S3 path
#   - uploaded_at (TIMESTAMP)
# ============================================================
