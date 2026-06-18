# ============================================================
# tenders/models.py - Tender SQLAlchemy Models
# ============================================================
# PURPOSE:
# ORM models for tender-related tables.
# Maps to ERD Modules 3 (Procurement Config) & 4 (Tender Mgmt).
#
# TABLES:
#
# PROCUREMENT_NATURE
#   - nature_id (PK, SERIAL)
#   - name (VARCHAR, UNIQUE) - Goods, Works, Services, Consultancy
#
# PROCUREMENT_METHOD
#   - method_id (PK, SERIAL)
#   - method_code (VARCHAR, UNIQUE) - OTM, RFQ, RFP, ReverseAuction, Direct
#   - description (TEXT)
#
# CATEGORIES
#   - category_id (PK, SERIAL)
#   - parent_id (FK -> CATEGORIES, NULLABLE) - hierarchical categories
#   - category_name (VARCHAR)
#   - UNIQUE(parent_id, category_name)
#
# TENDERS
#   - tender_id (PK, SERIAL)
#   - organization_id (FK -> ORGANIZATIONS) - the buyer org
#   - created_by (FK -> ORGANIZATION_USERS) - specific user in buyer org
#   - title (VARCHAR, NOT NULL)
#   - description (TEXT)
#   - category_id (FK -> CATEGORIES)
#   - nature_id (FK -> PROCUREMENT_NATURE)
#   - method_id (FK -> PROCUREMENT_METHOD)
#   - visibility_type (ENUM: Public, Restricted)
#   - budget_min (NUMERIC)
#   - budget_max (NUMERIC)
#   - budget_type (ENUM: Revenue, Capital, Internal)
#   - document_price (NUMERIC)
#   - security_required (BOOLEAN)
#   - security_valid_until (DATE)
#   - proposal_valid_until (DATE)
#   - evaluation_type (ENUM: Overall, LotWise)
#   - publish_datetime (TIMESTAMP)
#   - submission_deadline (TIMESTAMP)
#   - status (ENUM: Draft, Published, Closed, Awarded, Cancelled)
#   - embedding (VECTOR(768)) - pgvector column for semantic search
#   - created_at (TIMESTAMP)
#   - updated_at (TIMESTAMP)
#
# TENDER_DOCUMENTS
#   - tender_doc_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - file_name (VARCHAR)
#   - file_path (TEXT) - S3/MinIO path
#   - is_public (BOOLEAN) - visible without auth?
#   - uploaded_at (TIMESTAMP)
#
# TENDER_LOTS
#   - lot_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - lot_title (VARCHAR)
#   - lot_description (TEXT)
#   - lot_budget (NUMERIC)
#   - delivery_location (TEXT)
#   - tentative_start_date (DATE)
#   - tentative_completion_date (DATE)
#
# TENDER_EVENTS
#   - event_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - event_type (ENUM: PreBidMeeting, SiteVisit, ClarificationDeadline)
#   - start_datetime (TIMESTAMP)
#   - end_datetime (TIMESTAMP)
#   - location (TEXT)
#   - notes (TEXT)
#
# TENDER_CLARIFICATIONS
#   - clarification_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - asked_by_org_id (FK -> ORGANIZATIONS) - vendor org
#   - question (TEXT)
#   - answer (TEXT, NULLABLE)
#   - asked_at (TIMESTAMP)
#   - answered_at (TIMESTAMP, NULLABLE)
#
# TENDER_AMENDMENTS
#   - amendment_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - description (TEXT)
#   - file_path (TEXT) - amendment PDF
#   - created_at (TIMESTAMP)
# ============================================================
