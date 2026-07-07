# ============================================================
# contracts/models.py - Contract SQLAlchemy Models
# ============================================================
# Maps to ERD Module 8 (Contract Management).
#
# TABLES:
#
# CONTRACTS
#   - contract_id (PK, SERIAL)
#   - award_id (FK -> AWARDS)
#   - contract_value (NUMERIC)
#   - signed_at (TIMESTAMP, NULLABLE)
#   - buyer_confirmed (BOOLEAN, DEFAULT FALSE)
#   - vendor_confirmed (BOOLEAN, DEFAULT FALSE)
#   - start_date (DATE)
#   - completion_date (DATE)
#   - execution_location (TEXT)
#   - contract_document_path (TEXT) - S3 path to contract PDF
#   - status (ENUM: Draft, Active, Completed, Terminated)
#   - created_at (TIMESTAMP)
#
# CONTRACT_MILESTONES
#   - milestone_id (PK, SERIAL)
#   - contract_id (FK -> CONTRACTS)
#   - milestone_title (VARCHAR)
#   - milestone_description (TEXT)
#   - due_date (DATE)
#   - payment_amount (NUMERIC)
#   - status (ENUM: Pending, InProgress, Completed, Overdue)
#
# WORK_ORDERS
#   - wo_id (PK, SERIAL)
#   - award_id (FK -> AWARDS)
#   - wo_number (VARCHAR, UNIQUE)
#   - file_path (TEXT)
#   - issued_at (TIMESTAMP)
#   - status (ENUM: Issued, Acknowledged, Completed)
# ============================================================
