# ============================================================
# payments/router.py - Payment & Credit System API Endpoints
# ============================================================
# COVERS: FR-08 (Credit Points & Payments / Monetization)

from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from typing import List
from app.modules.payments.schemas import (
    TokenBalanceResponse,
    PricingConfigResponse,
    TokenPurchaseRequest,
    TokenPurchaseResponse,
    TransactionHistoryResponse,
    TokenPackageResponse,
)
from app.modules.payments.service import (
    get_organization_token_balance,
    get_platform_pricing,
    purchase_organization_tokens,
    get_organization_transactions,
    list_active_token_packages,
)

router = APIRouter(prefix="/payments", tags=["Payments & Tokens"])


@router.get("/packages", response_model=List[TokenPackageResponse])
async def get_active_packages():
    """
    Get all active token packages and bundles with calculated savings percentage.
    """
    async with get_db_connection() as connection:
        return await list_active_token_packages(connection)


@router.get("/balance", response_model=TokenBalanceResponse)
async def get_balance(
    current_user: dict = Depends(get_current_user_org),
):
    """
    Get current token/credit balance for the authenticated user's organization.
    """
    org_id = current_user.get("organization_id")
    user_id = current_user.get("user_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    async with get_db_connection() as connection:
        return await get_organization_token_balance(connection, org_id, user_id)


@router.get("/pricing", response_model=PricingConfigResponse)
async def get_pricing():
    """
    Get current platform token pricing and activity costs (cost to publish tender, cost to bid).
    """
    async with get_db_connection() as connection:
        return await get_platform_pricing(connection)


@router.post("/purchase", response_model=TokenPurchaseResponse, status_code=status.HTTP_200_OK)
async def purchase_tokens(
    payload: TokenPurchaseRequest,
    current_user: dict = Depends(get_current_user_org),
):
    """
    Purchase credit tokens for the organization via payment gateway (SSLCommerz integration).
    Updates organization balance and registers transaction ledger entry.
    """
    org_id = current_user.get("organization_id")
    user_id = current_user.get("user_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    async with get_db_connection() as connection:
        return await purchase_organization_tokens(
            connection=connection,
            organization_id=org_id,
            user_id=user_id,
            payload=payload,
        )


@router.get("/transactions", response_model=TransactionHistoryResponse)
async def list_transactions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: dict = Depends(get_current_user_org),
):
    """
    Retrieve token transaction history for the authenticated user's organization.
    """
    org_id = current_user.get("organization_id")
    if not org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    async with get_db_connection() as connection:
        return await get_organization_transactions(
            connection=connection,
            organization_id=org_id,
            limit=limit,
            offset=offset,
        )
