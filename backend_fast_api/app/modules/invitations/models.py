# ============================================================
# invitations/models.py - Invitation & NDA SQLAlchemy Models
# ============================================================
# Maps to ERD Module 5 (Invitation & NDA).
#
# TABLES:
#
# TENDER_INVITATIONS
#   - invitation_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - vendor_org_id (FK -> ORGANIZATIONS)
#   - invited_at (TIMESTAMP)
#   - invitation_status (ENUM: Pending, Accepted, Declined)
#   - UNIQUE(tender_id, vendor_org_id)
#
# NDA_RECORDS
#   - nda_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - vendor_org_id (FK -> ORGANIZATIONS)
#   - signed_file_path (TEXT) - S3/MinIO path to signed NDA
#   - signed_at (TIMESTAMP)
#   - status (ENUM: Pending, Signed, Rejected)
# ============================================================
