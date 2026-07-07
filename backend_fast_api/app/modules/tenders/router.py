# ============================================================
# tenders/router.py - Tender Management API Endpoints
# ============================================================
# COVERS: FR-08 (Tender Creation & Management), FR-02 (Browse Tenders)
#
# Tenders are the core entity. A Buyer organization creates tenders,
# Vendor organizations bid on them.
#
# ENDPOINTS:
#
# --- Buyer Endpoints ---
#
# POST /buyer/tender
#   - Create a new tender (draft or publish immediately)
#   - Accepts: title, description, category, procurement_nature,
#     procurement_method, visibility (Public/Restricted), budget_min,
#     budget_max, budget_type, submission_deadline, document_price,
#     security_required, evaluation_type, required_documents_list,
#     bid_bond_amount
#   - Supports single-item or packaged tenders (multiple lots)
#   - Uploaded PDFs sent to ML service for parsing & vectorization
#   - Deducts credit points from buyer's account
#
# GET /buyer/jobs
#   - List all tenders created by the buyer's organization
#   - Filter by status: Draft, Published, Closed, Awarded, Cancelled
#
# PUT /tenders/{tender_id}
#   - Update tender details (only if Draft or Published with no bids)
#
# POST /tenders/{tender_id}/publish
#   - Publish a draft tender (changes status Draft -> Published)
#   - Triggers notifications to matching vendors
#
# POST /tenders/{tender_id}/withdraw
#   - Cancel/withdraw a tender
#   - No refund of points for buyer, but refund for vendors who bid
#
# POST /tenders/{tender_id}/amendments
#   - Upload an amendment PDF explaining changes to a published tender
#   - Notifies all vendors who have viewed/bid on this tender
#
# POST /tenders/{tender_id}/lots
#   - Add a lot/package to a tender
#
# PUT /tenders/{tender_id}/lots/{lot_id}
#   - Update lot details
#
# DELETE /tenders/{tender_id}/lots/{lot_id}
#   - Remove a lot from a tender
#
# --- Tender Detail (Public & Auth) ---
#
# GET /tenders/{tender_id}
#   - Get full tender details
#   - Public users: see limited info (title, buyer, category, dates)
#   - Registered users: see full details based on visibility settings
#   - Restricted tenders: only visible to invited vendors with signed NDA
#
# GET /tenders/{tender_id}/documents
#   - Download tender documents (PDFs, scope of work, BOQ)
#   - Public docs available to all; restricted docs need auth + NDA
#
# --- Clarifications ---
#
# GET /tenders/{tender_id}/clarifications
#   - View clarification Q&A for a tender (vendor questions + buyer answers)
#
# POST /tenders/{tender_id}/clarifications
#   - Vendor asks a clarification question about the tender
#
# POST /tenders/{tender_id}/clarifications/{query_id}/reply
#   - Buyer answers a vendor's clarification question
# ============================================================
