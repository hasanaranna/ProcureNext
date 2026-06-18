# ============================================================
# vendor_intelligence/models.py - Vendor Intelligence SQLAlchemy Models
# ============================================================
# Maps to ERD Module 9 (Vendor Intelligence - pgvector supported).
#
# TABLES:
#
# VENDOR_SKILLS
#   - skill_id (PK, SERIAL)
#   - skill_name (VARCHAR, UNIQUE)
#
# VENDOR_SKILL_MAP (many-to-many: Vendor Orgs <-> Skills)
#   - id (PK, SERIAL)
#   - vendor_org_id (FK -> ORGANIZATIONS)
#   - skill_id (FK -> VENDOR_SKILLS)
#   - UNIQUE(vendor_org_id, skill_id)
#
# VENDOR_PERFORMANCE
#   - performance_id (PK, SERIAL)
#   - contract_id (FK -> CONTRACTS)
#   - vendor_org_id (FK -> ORGANIZATIONS)
#   - rating (NUMERIC) - 1 to 5
#   - feedback (TEXT)
#   - completion_status (ENUM: Completed, Partial, Failed)
#   - recorded_at (TIMESTAMP)
#
# VENDOR_MATCH_SCORES (cached ML recommendations)
#   - match_id (PK, SERIAL)
#   - tender_id (FK -> TENDERS)
#   - vendor_org_id (FK -> ORGANIZATIONS)
#   - match_score (NUMERIC) - 0 to 100
#   - explanation_json (JSONB) - breakdown of score components
#   - calculated_at (TIMESTAMP)
# ============================================================
