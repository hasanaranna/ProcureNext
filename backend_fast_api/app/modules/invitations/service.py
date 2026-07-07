# ============================================================
# invitations/service.py - Invitation & NDA Business Logic
# ============================================================
# FUNCTIONS TO IMPLEMENT:
# - invite_vendors(): Create invitation records, send notifications
# - list_tender_invitations(): Get all invitations for a tender
# - accept_invitation(): Update status, notify buyer
# - decline_invitation(): Update status, notify buyer
# - upload_nda(): Save signed NDA to S3, update NDA record
# - check_nda_status(): Verify vendor has signed NDA for a tender
# - get_vendor_invitations(): List all invitations for a vendor org
# - validate_restricted_access(): Check if vendor can view restricted
#   tender (must be invited + NDA signed)
# ============================================================
