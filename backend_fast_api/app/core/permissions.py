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
# ============================================================

from typing import Callable, Iterable, Optional
from fastapi import Depends, HTTPException, status
from app.modules.auth.dependencies import get_current_user_org, get_current_admin


# Standard intra-organization roles
VALID_ORG_ROLES = {"Owner", "ProcurementOfficer", "Finance", "Viewer"}

# Role capability groupings
TENDER_MANAGERS = {"Owner", "ProcurementOfficer"}
BID_SUBMITTERS = {"Owner", "ProcurementOfficer"}
FINANCE_MANAGERS = {"Owner", "Finance"}
ORG_ADMINS = {"Owner"}


def require_role(*allowed_roles: str) -> Callable:
    """
    FastAPI dependency factory that verifies the authenticated user
    has one of the specified intra-organization roles.
    """
    async def _role_checker(
        current_user: dict = Depends(get_current_user_org)
    ) -> dict:
        user_role = current_user.get("role_in_org")
        if not user_role or user_role not in allowed_roles:
            roles_str = ", ".join(allowed_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {roles_str} (current role: {user_role})."
            )
        return current_user

    return _role_checker


def require_org_owner() -> Callable:
    """Requires Owner role within the organization."""
    return require_role("Owner")


def require_procurement_access() -> Callable:
    """Requires Owner or ProcurementOfficer role."""
    return require_role("Owner", "ProcurementOfficer")


def require_finance_access() -> Callable:
    """Requires Owner or Finance role."""
    return require_role("Owner", "Finance")


def validate_resource_ownership(
    user_org_id: int,
    resource_org_id: int,
    resource_name: str = "resource"
) -> None:
    """
    Verifies that the calling organization owns the target resource.
    Raises 403 Forbidden if not the owner.
    """
    if user_org_id != resource_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You do not have permission to access or modify this {resource_name}."
        )


def validate_contract_party(
    user_org_id: int,
    buyer_org_id: int,
    seller_org_id: int
) -> None:
    """
    Verifies that the calling organization is a legitimate party (Buyer or Seller)
    to a contract.
    """
    if user_org_id not in (buyer_org_id, seller_org_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Your organization is not a party to this contract."
        )

