# ============================================================
# search/schemas.py - Search Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - TenderSearchQuery: q, category, nature, method, budget_min,
#   budget_max, location, publish_date_from, publish_date_to,
#   deadline_from, deadline_to, visibility, org_id, sort_by, order
# - TenderSearchResult: tender summary + relevance_score
# - TenderSearchResponse: paginated list of TenderSearchResult,
#   total_count, applied_filters
# - VendorSearchQuery: q, skills list, location, min_rating
# - VendorSearchResult: vendor org summary + match info
# - VendorSearchResponse: paginated list of VendorSearchResult
# - OrgSearchQuery: name, type, location
# - OrgSearchResult: org summary
# ============================================================
