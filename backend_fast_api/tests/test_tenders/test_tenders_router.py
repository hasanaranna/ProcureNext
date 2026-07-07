# ============================================================
# tests/test_tenders/test_tenders_router.py - Tender Endpoint Tests
# ============================================================
# TEST CASES TO IMPLEMENT:
# - test_create_tender_draft: Creates tender in Draft status
# - test_publish_tender: Draft -> Published transition
# - test_create_tender_with_lots: Multi-lot/package tender
# - test_withdraw_tender: Cancel a tender, vendor refunds
# - test_add_amendment: Upload amendment PDF
# - test_create_clarification: Vendor asks question
# - test_reply_clarification: Buyer answers question
# - test_vendor_cannot_create_tender: RBAC enforcement
# - test_list_buyer_tenders: Paginated buyer dashboard
# - test_tender_visibility_public: Public info only for unauth
# - test_tender_visibility_restricted: Restricted tender hidden
# - test_insufficient_credits: Rejects if not enough points
# ============================================================
