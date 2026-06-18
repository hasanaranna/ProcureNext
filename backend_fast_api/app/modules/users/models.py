# ============================================================
# users/models.py - User SQLAlchemy Models
# ============================================================
# PURPOSE:
# ORM models for user-related database tables.
# Maps directly to ERD Module 1 (Platform Access & Identity).
#
# TABLES:
#
# USERS
#   - user_id (PK, SERIAL)
#   - email (VARCHAR, UNIQUE, NOT NULL)
#   - nid (NUMERIC, UNIQUE, NOT NULL) - National ID
#   - date_of_birth (TIMESTAMP, NOT NULL)
#   - password_hash (TEXT, NOT NULL)
#   - phone (VARCHAR)
#   - is_2fa_enabled (BOOLEAN, DEFAULT FALSE)
#   - totp_secret (TEXT, NULLABLE) - encrypted TOTP secret for 2FA
#   - status (ENUM: Active, Suspended, Pending)
#   - is_email_verified (BOOLEAN, DEFAULT FALSE)
#   - is_phone_verified (BOOLEAN, DEFAULT FALSE)
#   - last_login_at (TIMESTAMP)
#   - created_at (TIMESTAMP, DEFAULT NOW)
#   - updated_at (TIMESTAMP, DEFAULT NOW)
#
# ROLES
#   - role_id (PK, SERIAL)
#   - role_name (VARCHAR, UNIQUE) - Admin, Buyer, Vendor
#
# USER_ROLES (many-to-many: Users <-> Roles)
#   - id (PK, SERIAL)
#   - user_id (FK -> USERS)
#   - role_id (FK -> ROLES)
#   - UNIQUE(user_id, role_id)
#
# USER_DOCUMENTS
#   - document_id (PK, SERIAL)
#   - user_id (FK -> USERS)
#   - document_type (ENUM: NID, PassportPhoto)
#   - file_path (TEXT) - S3/MinIO path
#   - verification_status (ENUM: Pending, Approved, Rejected)
#   - verified_by (FK -> USERS, NULLABLE) - admin who verified
#   - verified_at (TIMESTAMP, NULLABLE)
#   - uploaded_at (TIMESTAMP, DEFAULT NOW)
#
# ADMINS
#   - admin_id (PK, SERIAL)
#   - user_id (FK -> USERS)
#   - admin_role (ENUM: SuperAdmin, PlatformAdmin)
#   - created_at (TIMESTAMP)
#   - updated_at (TIMESTAMP)
# ============================================================
