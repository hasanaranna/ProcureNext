# ============================================================
# evaluations/router.py - Evaluation & Award API Endpoints
# ============================================================
# COVERS: FR-10 (Bid Comparison & Evaluation), FR-11 (NOA & Award)
#
# ENDPOINTS:
#
# GET /tenders/{tender_id}/bids/compare
#   - Side-by-side comparison view of all bids for a tender
#   - Shows: vendor name, financial amount, technical doc summary,
#     vendor rating, required docs status
#   - Sortable by pricing, vendor rating, etc.
#
# POST /tenders/{tender_id}/bids/{bid_id}/evaluate
#   - Submit evaluation scores for a bid
#   - Accepts: technical_score, financial_score, remarks
#   - Only evaluators in the buyer org can do this
#
# GET /tenders/{tender_id}/evaluations
#   - View all evaluation results for a tender
#
# POST /buyer/award
#   - Select winning bid and issue Notice of Award (NOA)
#   - Accepts: tender_id, winning_bid_id, remarks
#   - Triggers:
#     1. NOA notification sent to winning vendor
#     2. Rejection notifications to unselected vendors
#     3. Automatic bid-bond refund for losing vendors
#     4. Audit trail record created
#   - Tender status changes to "Awarded"
#
# POST /tenders/{tender_id}/award/{award_id}/accept
#   - Winning vendor accepts the NOA
#   - Consumes the required platform credits from vendor
#   - Buyer receives notification of acceptance
#
# GET /tenders/{tender_id}/award
#   - View award details and publication info
#
# POST /tenders/{tender_id}/award/{award_id}/publish
#   - Publish award results (optional public visibility)
# ============================================================
