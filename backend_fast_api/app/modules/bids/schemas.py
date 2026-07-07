# ============================================================
# bids/schemas.py - Bid Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - BidCreateRequest: tender_id, lot_id (nullable), financial_amount,
#   technical_doc, supporting_documents list
# - BidUpdateRequest: updated financial_amount, new documents
# - BidResponse: Full bid details (id, tender, vendor org, amount,
#   status, documents, submission timestamp)
# - BidListItem: Summary for listing views
# - BidStatusResponse: status, timestamps, history
# - BidDocumentResponse: document info
# - BidComparisonItem: For side-by-side comparison view
# ============================================================
