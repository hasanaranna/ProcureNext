# ============================================================
# disputes/models.py - Dispute SQLAlchemy Models
# ============================================================
# Maps to ERD Module 12 (Dispute Management).
#
# TABLES:
#
# DISPUTES
#   - dispute_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - contract_id (FK -> CONTRACTS, NULLABLE)
#   - raised_by_org_id (FK -> ORGANIZATIONS)
#   - raised_by_user_id (FK -> USERS)
#   - description (TEXT)
#   - status (ENUM: Open, UnderReview, Resolved, Rejected)
#   - resolution_notes (TEXT, NULLABLE)
#   - resolved_by (FK -> USERS, NULLABLE) - admin
#   - created_at (TIMESTAMP)
#   - resolved_at (TIMESTAMP, NULLABLE)
#
# DISPUTE_DOCUMENTS
#   - doc_id (PK, SERIAL)
#   - dispute_id (FK -> DISPUTES)
#   - file_path (TEXT) - S3 path
#   - uploaded_at (TIMESTAMP)
# ============================================================
