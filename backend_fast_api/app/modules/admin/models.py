# ============================================================
# admin/models.py - Admin-Specific SQLAlchemy Models
# ============================================================
# PURPOSE:
# Models for admin-specific data that doesn't belong to other modules.
#
# TABLES:
#
# USER_REPORTS (reports submitted about users/orgs)
#   - report_id (PK, SERIAL)
#   - reporter_user_id (FK -> USERS) - who filed the report
#   - reported_user_id (FK -> USERS, NULLABLE)
#   - reported_org_id (FK -> ORGANIZATIONS, NULLABLE)
#   - reason (VARCHAR)
#   - description (TEXT)
#   - status (ENUM: Pending, Reviewed, ActionTaken, Dismissed)
#   - admin_notes (TEXT, NULLABLE)
#   - reviewed_by (FK -> USERS, NULLABLE) - admin
#   - created_at (TIMESTAMP)
#   - resolved_at (TIMESTAMP, NULLABLE)
#
# NOTE: ADMINS table is defined in users/models.py since it
# directly references the USERS table. PLATFORM_PRICING is
# in payments/models.py since it's payment-related config.
# ============================================================
