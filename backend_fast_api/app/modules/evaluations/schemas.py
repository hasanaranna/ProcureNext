# ============================================================
# evaluations/schemas.py - Evaluation & Award Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - EvaluationSubmitRequest: bid_id, technical_score, financial_score, remarks
# - EvaluationResponse: scores, evaluator info, timestamp
# - BidComparisonResponse: list of bids with all comparison fields
# - AwardCreateRequest: tender_id, winning_bid_id, remarks
# - AwardResponse: award details, winning bid, vendor info
# - NOAAcceptRequest: award_id confirmation
# - AwardPublicationRequest: is_public, summary
# - AwardPublicationResponse: publication details
# ============================================================
