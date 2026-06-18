# ============================================================
# vendor_intelligence/service.py - Vendor Intelligence Business Logic
# ============================================================
# FUNCTIONS TO IMPLEMENT:
# - list_skills(): Get all available skill categories
# - add_vendor_skills(): Map skills to vendor org profile
# - remove_vendor_skill(): Unmap a skill from vendor
# - get_recommendations(): Call ML service with tender data,
#   receive top-10 vendor matches, store results, return to buyer
# - get_tender_recommendations(): Call ML service to find matching
#   tenders for a vendor based on their profile/skills
# - submit_review(): Create performance review record after contract
# - get_vendor_performance(): Aggregated stats + review list
# - search_vendors(): Query vendors by skills, rating, location
# - store_match_scores(): Save ML-computed match scores to DB
#   for quick retrieval without re-computing
# ============================================================
