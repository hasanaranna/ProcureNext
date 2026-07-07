# ============================================================
# disputes/router.py - Dispute Management API Endpoints
# ============================================================
# COVERS: FR-19/FR-23 (Dispute & Complaint Management)
#
# Vendors and buyers can raise disputes/complaints about tenders,
# bids, or contracts. Admin tracks and resolves disputes.
#
# ENDPOINTS:
#
# POST /disputes
#   - Raise a new dispute
#   - Accepts: tender_id, contract_id (nullable), description,
#     supporting_documents
#   - Status starts as "Open"
#
# GET /disputes
#   - List disputes raised by or involving the current user's org
#   - Filterable by status: Open, UnderReview, Resolved, Rejected
#
# GET /disputes/{dispute_id}
#   - View details of a specific dispute
#
# PUT /disputes/{dispute_id}
#   - Update dispute description or add more evidence
#   - Only while status is Open
#
# --- Admin Endpoints ---
#
# GET /admin/disputes
#   - Admin views all disputes across the platform
#   - Filterable by status, tender, organization
#
# PUT /admin/disputes/{dispute_id}/status
#   - Admin updates dispute status (Open -> UnderReview -> Resolved/Rejected)
#   - Accepts: new_status, resolution_notes
#   - Notifies both parties of status change
# ============================================================
