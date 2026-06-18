# ============================================================
# bids/models.py - Bid SQLAlchemy Models
# ============================================================
# Maps to ERD Module 6 (Bid Management).
#
# TABLES:
#
# BIDS
#   - bid_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - vendor_org_id (FK -> ORGANIZATIONS)
#   - lot_id (FK -> TENDER_LOTS, NULLABLE) - for lot-wise tenders
#   - submitted_by (FK -> ORGANIZATION_USERS)
#   - technical_doc_path (TEXT) - S3 path to technical proposal
#   - financial_amount (NUMERIC)
#   - status (ENUM: Draft, Submitted, UnderEvaluation, Accepted,
#     Rejected, Withdrawn)
#   - submitted_at (TIMESTAMP)
#   - updated_at (TIMESTAMP)
#   - UNIQUE(tender_id, vendor_org_id, lot_id)
#
# BID_DOCUMENTS
#   - bid_doc_id (PK, SERIAL)
#   - bid_id (FK -> BIDS)
#   - document_type (VARCHAR) - as defined by buyer's required list
#   - file_path (TEXT) - S3 path
#   - uploaded_at (TIMESTAMP)
#
# BID_SECURITIES (Bid-Bond)
#   - security_id (PK, SERIAL)
#   - bid_id (FK -> BIDS)
#   - security_amount (NUMERIC)
#   - security_type (ENUM: BankGuarantee, Escrow, WalletHold)
#   - bid_security_doc_path (TEXT)
#   - submitted_at (TIMESTAMP)
#   - valid_until (DATE)
#   - status (ENUM: Pending, Valid, Expired)
# ============================================================
