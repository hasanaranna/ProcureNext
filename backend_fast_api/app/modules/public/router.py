# ============================================================
# public/router.py - Public Access API Endpoints
# ============================================================
# COVERS: FR-01 (General Information), FR-02 (Browse Public Tenders)
#
# These endpoints are accessible WITHOUT authentication.
# They provide read-only access to public information.
#
# ENDPOINTS:
#
# --- General Information (FR-01) ---
#
# GET /public/info/about
#   - Platform background, how ProcureNext works, what makes it
#     different from government E-GP and competitors
#
# GET /public/info/policies
#   - Current policies, legal notices, terms regarding tender
#     submission and procurement rules
#
# GET /public/info/news
#   - Latest news, events, feature announcements, policy changes,
#     discounts on credit points
#   - Paginated, ordered by date
#
# GET /public/info/help
#   - Help/FAQ pages, support contact information
#   - "Ask a procurement expert" feature info
#
# --- Public Tender Browsing (FR-02) ---
#
# GET /public/tenders
#   - Browse currently active public tenders
#   - LIMITED INFO ONLY for unregistered users:
#     * Buyer/company name
#     * Tender title
#     * Category/type
#     * Publication and deadline dates
#     * Basic non-descriptive summary
#   - Detailed descriptions, financial terms, eligibility docs,
#     and downloadable files are NOT accessible without registration
#   - Supports basic filtering by category, date, location
#   - Paginated
#
# GET /public/tenders/{tender_id}
#   - View a specific public tender's limited info
#   - Prompts registration for full details
#
# --- Public Statistics ---
#
# GET /public/stats
#   - Aggregated platform statistics visible to public:
#     * Total registered organizations
#     * Total tenders published
#     * Active tenders count
#   - Supports oversight and transparency
# ============================================================
