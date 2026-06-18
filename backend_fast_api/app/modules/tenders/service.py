# ============================================================
# tenders/service.py - Tender Business Logic
# ============================================================
# PURPOSE:
# Core business logic for the tender lifecycle.
#
# FUNCTIONS TO IMPLEMENT:
# - create_tender(): Validate buyer org, deduct credits, create
#   tender + lots, upload docs to S3, trigger ML parsing task
# - get_tender(): Fetch tender with visibility enforcement
# - update_tender(): Update tender (Draft only or Published with rules)
# - publish_tender(): Draft -> Published, trigger vendor notifications
# - withdraw_tender(): Cancel tender, handle vendor bid refunds
# - add_amendment(): Upload amendment PDF, notify affected vendors
# - create_lot(): Add lot to tender
# - update_lot(): Modify lot details
# - delete_lot(): Remove lot (if no bids on it)
# - list_buyer_tenders(): Paginated list for buyer dashboard
# - list_public_tenders(): Public tender browsing with limited info
# - get_tender_documents(): Fetch docs with access control
# - create_clarification(): Vendor asks question
# - reply_clarification(): Buyer provides answer
# - list_clarifications(): Q&A thread for a tender
# - auto_close_expired_tenders(): Background job to close tenders
#   past their submission_deadline
# ============================================================
