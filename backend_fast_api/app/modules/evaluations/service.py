# ============================================================
# evaluations/service.py - Evaluation & Award Business Logic
# ============================================================
# FUNCTIONS TO IMPLEMENT:
# - compare_bids(): Fetch all bids with comparison fields
# - submit_evaluation(): Score a bid (technical + financial)
# - list_evaluations(): All evaluations for a tender
# - create_award(): Select winner, create award record, trigger
#   NOA notification, refund losing vendors' bid-bonds
# - accept_noa(): Vendor accepts NOA, deduct credits
# - get_award(): Fetch award details
# - publish_award(): Make award publicly visible
# - auto_refund_losing_bids(): Background task to process refunds
#   for vendors who were not selected
# ============================================================
