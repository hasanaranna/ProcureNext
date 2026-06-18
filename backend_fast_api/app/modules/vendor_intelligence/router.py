# ============================================================
# vendor_intelligence/router.py - Vendor Intelligence API Endpoints
# ============================================================
# COVERS: FR-09 (Vendor Matching & Recommendations),
#         FR-14 (Performance Reviews)
#
# The ML-heavy computation (embedding generation, similarity scoring)
# is handled by the separate ML microservice. This module:
# 1. Stores/retrieves vendor skill profiles and performance data
# 2. Proxies recommendation requests to the ML service
# 3. Stores and serves recommendation results
#
# ENDPOINTS:
#
# --- Vendor Profile Enrichment ---
#
# GET /vendor/skills
#   - List available skill categories
#
# POST /vendor/skills
#   - Vendor adds skills to their profile (maps to VENDOR_SKILL_MAP)
#
# DELETE /vendor/skills/{skill_id}
#   - Remove a skill from vendor profile
#
# --- Recommendations ---
#
# POST /buyer/recommendation/{tender_id}
#   - Buyer requests vendor recommendations for a tender
#   - Triggers ML service call to compute match scores
#   - Returns top-10 ranked vendors with explanations
#   - Each recommendation includes "Why recommended" breakdown:
#     * skills_match, location_proximity, financial_health,
#       past_performance scores
#
# GET /vendor/recommendation
#   - Vendor gets recommended/matching tenders for their profile
#   - Based on skills, past categories, location
#
# --- Performance & Reviews ---
#
# POST /buyer/review/{vendor_org_id}
#   - Buyer submits performance review for vendor after contract
#   - Accepts: rating (1-5), feedback, completion_status
#
# GET /vendor/{vendor_org_id}/performance
#   - View vendor's aggregated performance history and reviews
#   - Available to buyers evaluating potential vendors
#
# GET /vendor/{vendor_org_id}/reviews
#   - List all reviews received by a vendor
#
# --- Search ---
#
# GET /search-vendor
#   - Search for vendors by name, skills, location, rating
# ============================================================
