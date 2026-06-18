# ============================================================
# disputes/schemas.py - Dispute Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - DisputeCreateRequest: tender_id, contract_id (nullable),
#   description, supporting_documents
# - DisputeUpdateRequest: description, additional evidence
# - DisputeResponse: id, tender, contract, raised_by org,
#   description, status, created_at, resolved_at
# - DisputeStatusUpdate: new_status, resolution_notes (admin)
# - DisputeListResponse: paginated list
# ============================================================
