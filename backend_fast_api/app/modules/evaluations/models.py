# ============================================================
# evaluations/models.py - Evaluation & Award SQLAlchemy Models
# ============================================================
# Maps to ERD Module 7 (Evaluation & Award).
#
# TABLES:
#
# EVALUATIONS
#   - evaluation_id (PK, SERIAL)
#   - bid_id (FK -> BIDS)
#   - evaluator_id (FK -> ORGANIZATION_USERS)
#   - technical_score (NUMERIC)
#   - financial_score (NUMERIC)
#   - total_score (NUMERIC) - computed or weighted
#   - remarks (TEXT)
#   - evaluated_at (TIMESTAMP)
#
# AWARDS
#   - award_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - winning_bid_id (FK -> BIDS)
#   - awarded_by (FK -> ORGANIZATION_USERS)
#   - awarded_at (TIMESTAMP)
#   - remarks (TEXT)
#
# AWARD_PUBLICATIONS
#   - publication_id (PK, SERIAL)
#   - award_id (FK -> AWARDS)
#   - published_at (TIMESTAMP)
#   - is_public (BOOLEAN)
#   - summary (TEXT)
# ============================================================
