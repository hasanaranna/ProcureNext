# ============================================================
# invitations/router.py - Invitation & NDA API Endpoints
# ============================================================
# COVERS: FR-12 (Restricted Invitations), FR-15 (NDA Workflow)
#
# Buyers can create "Restricted" tenders visible only to invited vendors.
# Invited vendors must sign an NDA before viewing full tender details.
#
# ENDPOINTS:
#
# POST /tenders/{tender_id}/invite
#   - Buyer invites specific vendor organizations to a restricted tender
#   - Accepts: list of vendor_org_ids
#   - Sends invitation notification to each vendor
#   - Only works for tenders with visibility_type = Restricted
#
# GET /tenders/{tender_id}/invitations
#   - Buyer views all invitations sent for a tender and their statuses
#
# POST /tenders/{tender_id}/invitations/{invitation_id}/accept
#   - Vendor accepts the tender invitation
#
# POST /tenders/{tender_id}/invitations/{invitation_id}/decline
#   - Vendor declines the tender invitation
#
# GET /tenders/{tender_id}/nda
#   - Get the NDA document/template for a restricted tender
#
# POST /tenders/{tender_id}/nda-signature
#   - Vendor uploads signed NDA (digital signature or scanned copy)
#   - After NDA is signed, vendor can view full restricted tender details
#
# GET /vendor/invitations
#   - Vendor views all tender invitations they've received
#   - Filterable by status: Pending, Accepted, Declined
# ============================================================
