# ============================================================
# search/router.py - Search API Endpoints
# ============================================================
# COVERS: FR-03 (Advanced Search with Semantic Matching)
#
# The search module provides both basic keyword search and
# semantic search (via the ML microservice).
# "Mobile phone" and "Cellphone" should return equivalent results.
#
# ENDPOINTS:
#
# GET /search-jobs
#   - Search for tenders (called "jobs" in the API spec)
#   - Accepts: q (search query text)
#   - BASIC SEARCH: keyword matching on title, description, category
#   - SEMANTIC SEARCH: query text is vectorized via ML service,
#     then pgvector cosine similarity finds matching tenders
#   - Both results are merged and ranked
#   - FILTERS:
#     * category
#     * procurement_nature (Goods/Works/Services/Consultancy)
#     * procurement_method (OTM/RFQ/RFP/etc.)
#     * budget range (min, max)
#     * location/district
#     * publication date range
#     * submission deadline range
#     * visibility type (Public/Restricted)
#     * organization (who published)
#   - SORTING: by relevance, price, deadline, publish date
#   - Accessible to both public (limited results) and registered users
#
# GET /search-vendor
#   - Search for vendor organizations
#   - Accepts: q (search query), skills, location, min_rating
#   - Uses keyword + semantic matching on vendor profiles
#
# GET /search-organization
#   - Search for any organization (buyer or vendor)
#   - Accepts: name, type, location
# ============================================================
