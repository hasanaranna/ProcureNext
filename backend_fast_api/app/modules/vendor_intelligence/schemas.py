# ============================================================
# vendor_intelligence/schemas.py - Vendor Intelligence Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - SkillResponse: skill_id, skill_name
# - VendorSkillsUpdate: list of skill_ids to add
# - RecommendationRequest: tender_id
# - RecommendationResponse: list of VendorRecommendation items
# - VendorRecommendation: vendor_org_id, name, match_score,
#   explanation (skills_match, location_proximity, financial_health,
#   past_performance), top_reasons list
# - PerformanceReviewCreate: rating, feedback, completion_status
# - PerformanceReviewResponse: review details
# - VendorPerformanceSummary: average rating, total contracts,
#   completion rate, reviews list
# - VendorSearchQuery: name, skills, location, min_rating filters
# - TenderRecommendationResponse: matching tenders for a vendor
# ============================================================
