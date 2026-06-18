# ============================================================
# permissions.py - Role-Based Access Control (RBAC)
# ============================================================
# PURPOSE:
# Implements granular permission checks for the ProcureNext
# platform's multi-level access control system.
#
# ACCESS LEVELS (from PDF FR-06):
# 1. Platform Roles:
#    - SuperAdmin: Full platform control
#    - PlatformAdmin: Moderate users, verify documents
#    - Buyer: Create tenders, evaluate bids
#    - Vendor: Browse tenders, submit bids
#    - Public: Read-only access to public tender summaries
#
# 2. Organization Roles (within a company):
#    - Owner (Master Account Holder): Full org control, manages members
#    - ProcurementOfficer: Can create tenders / submit bids
#    - Finance: Manages credits and payments
#    - Viewer: Read-only access to org data
#
# RESPONSIBILITIES:
# - Permission checker functions/decorators for route protection
# - Verify user has the required role for an action
# - Verify user belongs to the correct organization for a resource
# - Row-level security: ensure users only access their own data
#   (e.g., vendor can only see their own draft bids)
# - Tender visibility enforcement: restricted tenders only visible
#   to invited/enlisted vendors
#
# USAGE:
# @router.post("/tender")
# async def create_tender(user = Depends(require_role("Buyer", "Owner"))):
# ============================================================
