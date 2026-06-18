# ============================================================
# bids/router.py - Bid Management API Endpoints
# ============================================================
# COVERS: FR-15 (Bid Submission & Bid-Bond), FR-16 (Bid Status),
#         FR-17 (Bid History)
#
# ENDPOINTS:
#
# --- Vendor Endpoints ---
#
# POST /vendor/bid/{tender_id}/publish
#   - Submit a bid for a specific tender
#   - Accepts: technical_doc (PDF upload), financial_amount,
#     lot_id (if lot-wise), supporting documents
#   - Must pay bid-bond amount specified by buyer
#   - Deducts credit points from vendor's account
#   - Validates all buyer-required documents are uploaded
#   - Cannot submit after submission_deadline
#
# PUT /vendor/bid/{bid_id}
#   - Amend/update a submitted bid (before deadline only)
#   - Can update technical docs, financial amount
#
# POST /vendor/bid/{bid_id}/withdraw
#   - Withdraw a submitted bid
#   - Bid-bond refund rules apply
#
# GET /vendor/bid/{bid_id}
#   - Get details of a specific bid
#
# GET /vendor/jobs
#   - List all bids submitted by the vendor org (past and ongoing)
#   - Shows bid lifecycle status for each
#
# --- Buyer Endpoints ---
#
# GET /tenders/{tender_id}/bids
#   - List all bids received for a tender (Buyer only)
#   - May or may not show other vendors' bids depending on
#     buyer's setting (visibility_of_bids flag)
#   - Supports sorting by: financial_amount, submission date,
#     vendor rating
#
# GET /tenders/{tender_id}/bids/{bid_id}
#   - Buyer views detailed bid including documents
#   - Buyer can reject bids from vendors missing required documents
# ============================================================
