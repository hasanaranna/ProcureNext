# ============================================================
# messaging/models.py - Messaging Table Reference
# ============================================================
# This project uses raw asyncpg queries (no SQLAlchemy ORM).
# This file documents the messaging tables for reference.
#
# TABLES:
#
# message_threads
#   - thread_id       SERIAL PK
#   - thread_type     thread_type ENUM ('IntraCompany', 'InterCompany')
#   - tender_id       FK -> tenders (NULLABLE, for inter-company)
#   - group_name      VARCHAR(255) NULLABLE (for named group chats)
#   - created_by      FK -> users
#   - created_at      TIMESTAMP
#
# thread_participants
#   - id              SERIAL PK
#   - thread_id       FK -> message_threads
#   - user_id         FK -> users
#   - organization_id FK -> organizations
#   - is_admin        BOOLEAN
#   - joined_at       TIMESTAMP
#   - last_read_at    TIMESTAMP NULLABLE (for unread tracking)
#   - UNIQUE(thread_id, user_id)
#
# messages
#   - message_id      SERIAL PK
#   - thread_id       FK -> message_threads
#   - sender_user_id  FK -> users
#   - message_text    TEXT (AES-256-GCM encrypted, base64-encoded)
#   - encryption_iv   TEXT (12-byte IV, base64-encoded)
#   - sent_at         TIMESTAMP
# ============================================================
