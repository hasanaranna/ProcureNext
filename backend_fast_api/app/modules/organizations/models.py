# ============================================================
# organizations/models.py - Organization SQLAlchemy Models
# ============================================================
# PURPOSE:
# ORM models for organization-related tables.
# Maps directly to ERD Module 2 (Organization Structure).
#
# TABLES:
#
# ORGANIZATIONS
#   - organization_id (PK, SERIAL)
#   - organization_name (VARCHAR, NOT NULL)
#   - organization_type (ENUM: Buyer, Vendor)
#   - organization_code (VARCHAR, UNIQUE) - unique code for affiliations
#   - rjsc_number (VARCHAR, UNIQUE, NULLABLE)
#   - trade_license_number (VARCHAR, UNIQUE, NULLABLE)
#   - tin_number (VARCHAR, UNIQUE, NULLABLE)
#   - address (TEXT)
#   - website (VARCHAR, NULLABLE)
#   - description (TEXT)
#   - verification_status (ENUM: Pending, Verified, Rejected)
#   - created_at (TIMESTAMP)
#
# ORGANIZATION_USERS (many-to-many: Orgs <-> Users with roles)
#   - org_user_id (PK, SERIAL)
#   - organization_id (FK -> ORGANIZATIONS)
#   - user_id (FK -> USERS)
#   - role_in_org (ENUM: Owner, ProcurementOfficer, Finance, Viewer)
#   - is_primary_contact (BOOLEAN)
#   - status (ENUM: Pending, Active, Declined) - for affiliation flow
#   - joined_at (TIMESTAMP)
#   - UNIQUE(organization_id, user_id)
#
# ORGANIZATION_DOCUMENTS
#   - document_id (PK, SERIAL)
#   - organization_id (FK -> ORGANIZATIONS)
#   - document_type (ENUM: TradeLicense, TIN, VAT, RJSC)
#   - file_path (TEXT) - S3/MinIO path
#   - review_status (ENUM: Pending, Approved, Rejected)
#   - review_notes (TEXT)
#   - reviewed_by (FK -> USERS) - admin
#   - reviewed_at (TIMESTAMP)
#   - uploaded_at (TIMESTAMP)
#
# ORGANIZATION_OWNERS
#   - owner_id (PK, SERIAL)
#   - organization_id (FK -> ORGANIZATIONS)
#   - owner_name (VARCHAR)
#   - ownership_percentage (NUMERIC(5,2))
#   - country (VARCHAR)
# ============================================================
