# ============================================================
# audit/schemas.py - Audit Log Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - AuditLogResponse: log_id, user_id, user_email, action_type,
#   entity_type, entity_id, old_value, new_value, ip_address,
#   timestamp, hash_signature
# - AuditLogListResponse: paginated list
# - AuditLogFilter: user_id, action_type, entity_type, date_from,
#   date_to, ip_address
# - AuditIntegrityResponse: is_valid, invalid_entries (if any)
# - AuditLogCreate: (internal) for creating new log entries
# ============================================================
