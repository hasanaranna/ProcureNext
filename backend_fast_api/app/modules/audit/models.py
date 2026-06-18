# ============================================================
# audit/models.py - Audit Log SQLAlchemy Models
# ============================================================
# Maps to ERD Module 13 (Audit & Compliance).
#
# TABLES:
#
# AUDIT_LOGS (append-only, never updated or deleted)
#   - log_id (PK, SERIAL)
#   - user_id (FK -> USERS)
#   - action_type (VARCHAR) - CREATE, UPDATE, DELETE, SUBMIT_BID,
#     APPROVE_TENDER, AWARD, PAYMENT, VERIFY_DOC, LOGIN, etc.
#   - entity_type (VARCHAR) - tender, bid, payment, user, org, etc.
#   - entity_id (INTEGER)
#   - old_value (JSONB) - data snapshot before action
#   - new_value (JSONB) - data snapshot after action
#   - ip_address (VARCHAR)
#   - timestamp (TIMESTAMP, DEFAULT NOW)
#   - hash_signature (VARCHAR) - SHA-256 for tamper-evidence
#     computed as: hash(previous_log_hash + current_log_data)
#
# DESIGN NOTES:
# - This table is APPEND-ONLY. No UPDATE or DELETE operations.
# - JSONB is used for old/new values (PostgreSQL optimized)
# - Hash chain enables detection of any log tampering
# - Periodic anchoring to external immutable store recommended
# ============================================================
