# ============================================================
# payments/service.py - Payment & Token Management Business Logic
# ============================================================

import uuid
from typing import Optional, List, Dict, Any
# pyrefly: ignore [missing-import]
import asyncpg
from fastapi import HTTPException

from app.modules.payments.schemas import (
    TokenBalanceResponse,
    PricingConfigResponse,
    UpdatePricingRequest,
    TokenPurchaseRequest,
    TokenPurchaseResponse,
    TokenTransactionItem,
    TransactionHistoryResponse,
    TokenPackageResponse,
    CreatePackageRequest,
    UpdatePackageRequest,
)


async def get_organization_token_balance(
    connection: asyncpg.Connection,
    organization_id: int,
    user_id: int,
) -> TokenBalanceResponse:
    row = await connection.fetchrow(
        """
        SELECT 
            o.organization_id,
            o.organization_name,
            COALESCE(o.credit_balance, 0) AS credit_balance,
            oe.role_in_org
        FROM organizations o
        LEFT JOIN organization_employees oe 
            ON o.organization_id = oe.organization_id AND oe.user_id = $2
        WHERE o.organization_id = $1
        """,
        organization_id,
        user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Organization not found.")

    return TokenBalanceResponse(
        organization_id=row["organization_id"],
        organization_name=row["organization_name"],
        credit_balance=int(row["credit_balance"]),
        user_id=user_id,
        role_in_org=row["role_in_org"],
    )


async def get_platform_pricing(
    connection: asyncpg.Connection,
) -> PricingConfigResponse:
    row = await connection.fetchrow(
        """
        SELECT pricing_id, price_per_token, tender_publish_cost, bid_cost, updated_at
        FROM platform_pricing
        ORDER BY pricing_id DESC
        LIMIT 1
        """
    )
    if not row:
        # Create default row if somehow missing
        created = await connection.fetchrow(
            """
            INSERT INTO platform_pricing (price_per_token, tender_publish_cost, bid_cost)
            VALUES (1.00, 50, 20)
            RETURNING pricing_id, price_per_token, tender_publish_cost, bid_cost, updated_at
            """
        )
        return PricingConfigResponse(
            pricing_id=created["pricing_id"],
            price_per_token=float(created["price_per_token"]),
            tender_publish_cost=int(created["tender_publish_cost"]),
            bid_cost=int(created["bid_cost"]),
            updated_at=created["updated_at"],
        )

    return PricingConfigResponse(
        pricing_id=row["pricing_id"],
        price_per_token=float(row["price_per_token"]),
        tender_publish_cost=int(row["tender_publish_cost"]),
        bid_cost=int(row["bid_cost"]),
        updated_at=row["updated_at"],
    )


async def update_platform_pricing(
    connection: asyncpg.Connection,
    admin_user_id: int,
    payload: UpdatePricingRequest,
) -> PricingConfigResponse:
    existing = await connection.fetchrow(
        "SELECT pricing_id FROM platform_pricing ORDER BY pricing_id DESC LIMIT 1"
    )
    if existing:
        row = await connection.fetchrow(
            """
            UPDATE platform_pricing
            SET price_per_token = $1,
                tender_publish_cost = $2,
                bid_cost = $3,
                updated_by = $4,
                updated_at = NOW()
            WHERE pricing_id = $5
            RETURNING pricing_id, price_per_token, tender_publish_cost, bid_cost, updated_at
            """,
            payload.price_per_token,
            payload.tender_publish_cost,
            payload.bid_cost,
            admin_user_id,
            existing["pricing_id"],
        )
    else:
        row = await connection.fetchrow(
            """
            INSERT INTO platform_pricing (price_per_token, tender_publish_cost, bid_cost, updated_by)
            VALUES ($1, $2, $3, $4)
            RETURNING pricing_id, price_per_token, tender_publish_cost, bid_cost, updated_at
            """,
            payload.price_per_token,
            payload.tender_publish_cost,
            payload.bid_cost,
            admin_user_id,
        )

    return PricingConfigResponse(
        pricing_id=row["pricing_id"],
        price_per_token=float(row["price_per_token"]),
        tender_publish_cost=int(row["tender_publish_cost"]),
        bid_cost=int(row["bid_cost"]),
        updated_at=row["updated_at"],
    )


async def purchase_organization_tokens(
    connection: asyncpg.Connection,
    organization_id: int,
    user_id: int,
    payload: TokenPurchaseRequest,
) -> TokenPurchaseResponse:
    if payload.tokens <= 0:
        raise HTTPException(status_code=400, detail="Number of tokens must be greater than zero.")

    pricing = await get_platform_pricing(connection)
    
    # Check if a package matches this exact token amount
    pkg_row = await connection.fetchrow(
        "SELECT price_bdt, package_name FROM token_packages WHERE token_amount = $1 AND is_active = TRUE ORDER BY price_bdt ASC LIMIT 1",
        payload.tokens
    )
    if pkg_row:
        amount_bdt = float(pkg_row["price_bdt"])
        desc = f"Purchased {payload.tokens} tokens ({pkg_row['package_name']} - ৳{amount_bdt:,.2f})"
    else:
        amount_bdt = float(payload.tokens) * float(pricing.price_per_token)
        desc = f"Purchased {payload.tokens} tokens (Rate: ৳{pricing.price_per_token:.2f}/token)"

    gateway_txn_id = f"SSL-{uuid.uuid4().hex[:12].upper()}"
    gateway_val_id = f"VAL-{uuid.uuid4().hex[:8].upper()}"

    async with connection.transaction():
        # 1. Update organization balance
        org_row = await connection.fetchrow(
            """
            UPDATE organizations
            SET credit_balance = COALESCE(credit_balance, 0) + $1
            WHERE organization_id = $2
            RETURNING credit_balance
            """,
            payload.tokens,
            organization_id,
        )
        if not org_row:
            raise HTTPException(status_code=404, detail="Organization not found.")
        
        new_balance = int(org_row["credit_balance"])

        # 2. Insert payment record
        pay_row = await connection.fetchrow(
            """
            INSERT INTO payments (
                organization_id, amount, gateway_transaction_id, gateway_validation_id, status
            )
            VALUES ($1, $2, $3, $4, 'Completed')
            RETURNING transaction_id
            """,
            organization_id,
            amount_bdt,
            gateway_txn_id,
            gateway_val_id,
        )
        payment_id = pay_row["transaction_id"]

        # 3. Insert credit transaction ledger entry
        method_desc = f"{payload.payment_method}"
        if payload.card_type:
            method_desc += f" ({payload.card_type})"
        
        tx_row = await connection.fetchrow(
            """
            INSERT INTO credit_transactions (
                organization_id, user_id, payment_id, amount, transaction_type,
                payment_reference, balance_after, description, payment_method
            )
            VALUES ($1, $2, $3, $4, 'Purchase', $5, $6, $7, $8)
            RETURNING transaction_id
            """,
            organization_id,
            user_id,
            payment_id,
            payload.tokens,
            gateway_txn_id,
            new_balance,
            desc,
            method_desc,
        )

        return TokenPurchaseResponse(
            success=True,
            transaction_id=tx_row["transaction_id"],
            tokens_added=payload.tokens,
            new_balance=new_balance,
            amount_paid_bdt=amount_bdt,
            payment_reference=gateway_txn_id,
            message=f"Successfully purchased {payload.tokens} tokens for ৳{amount_bdt:,.2f}.",
        )


async def get_organization_transactions(
    connection: asyncpg.Connection,
    organization_id: int,
    limit: int = 50,
    offset: int = 0,
) -> TransactionHistoryResponse:
    total_count = await connection.fetchval(
        "SELECT COUNT(*) FROM credit_transactions WHERE organization_id = $1",
        organization_id,
    ) or 0

    current_balance = await connection.fetchval(
        "SELECT COALESCE(credit_balance, 0) FROM organizations WHERE organization_id = $1",
        organization_id,
    ) or 0

    rows = await connection.fetch(
        """
        SELECT 
            ct.transaction_id,
            ct.organization_id,
            ct.user_id,
            u.full_name AS user_name,
            ct.amount,
            ct.transaction_type,
            ct.payment_reference,
            ct.balance_after,
            ct.description,
            ct.payment_method,
            ct.created_at
        FROM credit_transactions ct
        LEFT JOIN users u ON ct.user_id = u.user_id
        WHERE ct.organization_id = $1
        ORDER BY ct.created_at DESC, ct.transaction_id DESC
        LIMIT $2 OFFSET $3
        """,
        organization_id,
        limit,
        offset,
    )

    transactions = [
        TokenTransactionItem(
            transaction_id=r["transaction_id"],
            organization_id=r["organization_id"],
            user_id=r["user_id"],
            user_name=r["user_name"],
            amount=float(r["amount"]),
            transaction_type=str(r["transaction_type"]),
            payment_reference=r["payment_reference"],
            balance_after=float(r["balance_after"]) if r["balance_after"] is not None else 0.0,
            description=r["description"],
            payment_method=r["payment_method"],
            created_at=r["created_at"],
        )
        for r in rows
    ]

    return TransactionHistoryResponse(
        transactions=transactions,
        total_count=int(total_count),
        current_balance=int(current_balance),
    )


async def deduct_tokens_for_tender_publish(
    connection: asyncpg.Connection,
    organization_id: int,
    user_id: int,
    tender_id: int,
    tender_title: str,
) -> int:
    """
    Checks token balance and deducts configured tender_publish_cost from the organization.
    Returns the new balance after deduction.
    """
    pricing = await get_platform_pricing(connection)
    cost = pricing.tender_publish_cost

    # If cost is 0, no deduction needed
    if cost <= 0:
        balance = await connection.fetchval(
            "SELECT COALESCE(credit_balance, 0) FROM organizations WHERE organization_id = $1",
            organization_id,
        ) or 0
        return int(balance)

    current_balance = await connection.fetchval(
        "SELECT COALESCE(credit_balance, 0) FROM organizations WHERE organization_id = $1 FOR UPDATE",
        organization_id,
    )
    if current_balance is None:
        raise HTTPException(status_code=404, detail="Organization not found.")

    if current_balance < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient tokens. Your organization has {current_balance} tokens, but publishing a tender requires {cost} tokens. Please purchase more tokens.",
        )

    new_balance = current_balance - cost
    await connection.execute(
        "UPDATE organizations SET credit_balance = $1 WHERE organization_id = $2",
        new_balance,
        organization_id,
    )

    desc = f"Tender Publish: {tender_title} (ID #{tender_id})"
    await connection.execute(
        """
        INSERT INTO credit_transactions (
            organization_id, user_id, amount, transaction_type,
            payment_reference, balance_after, description, payment_method
        )
        VALUES ($1, $2, $3, 'Deduct', $4, $5, $6, 'Platform Fee')
        """,
        organization_id,
        user_id,
        -cost,
        f"TND-{tender_id}",
        new_balance,
        desc,
    )

    return new_balance


async def deduct_tokens_for_bid_submission(
    connection: asyncpg.Connection,
    organization_id: int,
    user_id: int,
    tender_id: int,
    bid_id: int,
    tender_title: Optional[str] = None,
) -> int:
    """
    Checks token balance and deducts configured bid_cost from the organization.
    Returns the new balance after deduction.
    """
    pricing = await get_platform_pricing(connection)
    cost = pricing.bid_cost

    if cost <= 0:
        balance = await connection.fetchval(
            "SELECT COALESCE(credit_balance, 0) FROM organizations WHERE organization_id = $1",
            organization_id,
        ) or 0
        return int(balance)

    current_balance = await connection.fetchval(
        "SELECT COALESCE(credit_balance, 0) FROM organizations WHERE organization_id = $1 FOR UPDATE",
        organization_id,
    )
    if current_balance is None:
        raise HTTPException(status_code=404, detail="Organization not found.")

    if current_balance < cost:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient tokens. Your organization has {current_balance} tokens, but submitting a bid requires {cost} tokens. Please purchase more tokens.",
        )

    new_balance = current_balance - cost
    await connection.execute(
        "UPDATE organizations SET credit_balance = $1 WHERE organization_id = $2",
        new_balance,
        organization_id,
    )

    t_desc = f" for '{tender_title}'" if tender_title else ""
    desc = f"Bid Submission{t_desc} (Bid #{bid_id}, Tender #{tender_id})"
    await connection.execute(
        """
        INSERT INTO credit_transactions (
            organization_id, user_id, amount, transaction_type,
            payment_reference, balance_after, description, payment_method
        )
        VALUES ($1, $2, $3, 'Deduct', $4, $5, $6, 'Platform Fee')
        """,
        organization_id,
        user_id,
        -cost,
        f"BID-{bid_id}",
        new_balance,
        desc,
    )

    return new_balance


def _format_package(row: dict, base_price_per_token: float) -> TokenPackageResponse:
    token_amount = int(row["token_amount"])
    price_bdt = float(row["price_bdt"])
    original_price = float(token_amount) * float(base_price_per_token)
    savings_bdt = max(0.0, original_price - price_bdt)
    savings_pct = int(round((savings_bdt / original_price) * 100)) if original_price > 0 else 0
    return TokenPackageResponse(
        package_id=row["package_id"],
        package_name=row["package_name"],
        token_amount=token_amount,
        price_bdt=price_bdt,
        badge=row.get("badge"),
        is_active=bool(row.get("is_active", True)),
        original_price_bdt=original_price,
        savings_percentage=savings_pct,
        savings_bdt=savings_bdt,
        created_at=row.get("created_at"),
        updated_at=row.get("updated_at"),
    )


async def list_active_token_packages(connection: asyncpg.Connection) -> List[TokenPackageResponse]:
    pricing = await get_platform_pricing(connection)
    rows = await connection.fetch(
        "SELECT * FROM token_packages WHERE is_active = TRUE ORDER BY token_amount ASC"
    )
    return [_format_package(dict(r), pricing.price_per_token) for r in rows]


async def list_all_token_packages_admin(connection: asyncpg.Connection) -> List[TokenPackageResponse]:
    pricing = await get_platform_pricing(connection)
    rows = await connection.fetch(
        "SELECT * FROM token_packages ORDER BY token_amount ASC"
    )
    return [_format_package(dict(r), pricing.price_per_token) for r in rows]


async def create_token_package(
    connection: asyncpg.Connection,
    data: CreatePackageRequest,
) -> TokenPackageResponse:
    pricing = await get_platform_pricing(connection)
    row = await connection.fetchrow(
        """
        INSERT INTO token_packages (package_name, token_amount, price_bdt, badge, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *
        """,
        data.package_name.strip(),
        data.token_amount,
        data.price_bdt,
        data.badge.strip() if data.badge else None,
        data.is_active,
    )
    return _format_package(dict(row), pricing.price_per_token)


async def update_token_package(
    connection: asyncpg.Connection,
    package_id: int,
    data: UpdatePackageRequest,
) -> TokenPackageResponse:
    pricing = await get_platform_pricing(connection)
    existing = await connection.fetchrow("SELECT * FROM token_packages WHERE package_id = $1", package_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Token package not found.")

    package_name = data.package_name.strip() if data.package_name is not None else existing["package_name"]
    token_amount = data.token_amount if data.token_amount is not None else existing["token_amount"]
    price_bdt = data.price_bdt if data.price_bdt is not None else existing["price_bdt"]
    badge = data.badge.strip() if data.badge is not None else existing["badge"]
    is_active = data.is_active if data.is_active is not None else existing["is_active"]

    row = await connection.fetchrow(
        """
        UPDATE token_packages
        SET package_name = $1, token_amount = $2, price_bdt = $3, badge = $4, is_active = $5, updated_at = NOW()
        WHERE package_id = $6
        RETURNING *
        """,
        package_name,
        token_amount,
        price_bdt,
        badge,
        is_active,
        package_id,
    )
    return _format_package(dict(row), pricing.price_per_token)


async def delete_token_package(connection: asyncpg.Connection, package_id: int) -> bool:
    res = await connection.execute("DELETE FROM token_packages WHERE package_id = $1", package_id)
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Token package not found.")
    return True
