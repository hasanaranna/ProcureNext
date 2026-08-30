# ============================================================
# contracts/service.py - Contract & Mutual Review Business Logic
# ============================================================

import logging
import asyncpg
from app.modules.contracts.schemas import MutualReviewCreateRequest

logger = logging.getLogger(__name__)


async def complete_contract(
    connection: asyncpg.Connection,
    contract_id: int,
    user_org_id: int
) -> dict:
    """
    Transitions a contract to 'Completed' status.
    Can be initiated by the buyer organization.
    """
    contract_row = await connection.fetchrow("""
        SELECT c.contract_id, c.status, t.buyer_id, wb.vendor_org_id
        FROM contracts c
        JOIN awards a ON c.award_id = a.award_id
        JOIN tenders t ON a.tender_id = t.tender_id
        JOIN bids wb ON a.winning_bid_id = wb.bid_id
        WHERE c.contract_id = $1
    """, contract_id)

    if not contract_row:
        raise KeyError("Contract not found.")

    if user_org_id != contract_row["buyer_id"] and user_org_id != contract_row["vendor_org_id"]:
        raise PermissionError("Your organization is not a party to this contract.")

    if contract_row["status"] == "Completed":
        return {
            "contract_id": contract_id,
            "status": "Completed",
            "message": "Contract is already marked as completed."
        }

    await connection.execute("""
        UPDATE contracts
        SET status = 'Completed'
        WHERE contract_id = $1
    """, contract_id)

    return {
        "contract_id": contract_id,
        "status": "Completed",
        "message": "Contract has been successfully marked as completed. Both parties may now submit mutual reviews."
    }


async def submit_mutual_review(
    connection: asyncpg.Connection,
    contract_id: int,
    reviewer_org_id: int,
    reviewer_user_id: int,
    review_data: MutualReviewCreateRequest
) -> dict:
    """
    Submits a mutual post-contract performance review (1 to 5 stars).
    Enforces:
      1. Contract must be 'Completed'.
      2. Reviewer must be Buyer or Seller on the contract.
      3. Exactly one review per organization per contract (no duplicate submissions).
      4. Rating bounded 1 to 5 stars.
    """
    # 1. Fetch contract parties and status
    contract_row = await connection.fetchrow("""
        SELECT c.contract_id, c.status, a.tender_id, t.buyer_id, wb.vendor_org_id AS seller_id
        FROM contracts c
        JOIN awards a ON c.award_id = a.award_id
        JOIN tenders t ON a.tender_id = t.tender_id
        JOIN bids wb ON a.winning_bid_id = wb.bid_id
        WHERE c.contract_id = $1
    """, contract_id)

    if not contract_row:
        raise KeyError("Contract not found.")

    tender_id = contract_row["tender_id"]
    buyer_id = contract_row["buyer_id"]
    seller_id = contract_row["seller_id"]

    # 2. Rule: Contract status must be Completed
    if str(contract_row["status"]).lower() != "completed":
        raise ValueError("Mutual reviews are only permitted after contract completion.")

    # 3. Rule: Reviewer must be a counterparty
    if reviewer_org_id == buyer_id:
        reviewee_org_id = seller_id
        party_role = "BuyerToSeller"
    elif reviewer_org_id == seller_id:
        reviewee_org_id = buyer_id
        party_role = "SellerToBuyer"
    else:
        raise PermissionError("Your organization is not a party to this contract.")

    # 4. Rule: No duplicate submissions by the same organization
    existing_review = await connection.fetchval("""
        SELECT 1 FROM contract_mutual_reviews
        WHERE contract_id = $1 AND reviewer_org_id = $2
    """, contract_id, reviewer_org_id)

    if existing_review:
        raise ValueError("Duplicate review: your organization has already submitted a review for this contract.")

    # 5. Insert review
    insert_query = """
        INSERT INTO contract_mutual_reviews (
            contract_id, tender_id, reviewer_org_id, reviewee_org_id, reviewer_user_id,
            party_role, overall_rating, quality_score, timeliness_score, communication_score,
            review_text
        )
        VALUES (
            $1, $2, $3, $4, $5,
            $6::public.review_party_role, $7, $8, $9, $10,
            $11
        )
        RETURNING *;
    """
    row = await connection.fetchrow(
        insert_query,
        contract_id,
        tender_id,
        reviewer_org_id,
        reviewee_org_id,
        reviewer_user_id,
        party_role,
        review_data.overall_rating,
        review_data.quality_score,
        review_data.timeliness_score,
        review_data.communication_score,
        review_data.review_text
    )

    # 6. Update organization reputation aggregates
    try:
        await update_organization_reputation(connection, reviewee_org_id)
    except Exception as e:
        logger.warning(f"Failed to update organization reputation aggregate: {e}")

    ret = dict(row)
    ret["party_role"] = str(ret["party_role"])
    return ret


async def update_organization_reputation(
    connection: asyncpg.Connection,
    organization_id: int
):
    """
    Recalculates and persists aggregated review metrics for an organization.
    """
    stats = await connection.fetchrow("""
        SELECT 
            COUNT(*) FILTER (WHERE party_role = 'BuyerToSeller') AS seller_count,
            COALESCE(ROUND(AVG(overall_rating) FILTER (WHERE party_role = 'BuyerToSeller'), 2), 0.00) AS seller_avg,
            COUNT(*) FILTER (WHERE party_role = 'SellerToBuyer') AS buyer_count,
            COALESCE(ROUND(AVG(overall_rating) FILTER (WHERE party_role = 'SellerToBuyer'), 2), 0.00) AS buyer_avg
        FROM contract_mutual_reviews
        WHERE reviewee_org_id = $1
    """, organization_id)

    seller_count = stats["seller_count"] or 0
    seller_avg = float(stats["seller_avg"] or 0.0)
    buyer_count = stats["buyer_count"] or 0
    buyer_avg = float(stats["buyer_avg"] or 0.0)

    # Composite trust score on a 0-100 scale
    total_reviews = seller_count + buyer_count
    if total_reviews > 0:
        composite = round(((seller_avg * 0.7) + (buyer_avg * 0.3)) * 20.0, 2)
    else:
        composite = 0.00

    upsert_query = """
        INSERT INTO organization_reputation (
            organization_id, seller_review_count, seller_avg_rating,
            buyer_review_count, buyer_avg_rating, composite_trust_score, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (organization_id) DO UPDATE SET
            seller_review_count = EXCLUDED.seller_review_count,
            seller_avg_rating = EXCLUDED.seller_avg_rating,
            buyer_review_count = EXCLUDED.buyer_review_count,
            buyer_avg_rating = EXCLUDED.buyer_avg_rating,
            composite_trust_score = EXCLUDED.composite_trust_score,
            updated_at = NOW();
    """
    await connection.execute(
        upsert_query,
        organization_id,
        seller_count,
        seller_avg,
        buyer_count,
        buyer_avg,
        composite
    )


async def get_contract_mutual_reviews(
    connection: asyncpg.Connection,
    contract_id: int
) -> list[dict]:
    """
    Retrieves all mutual reviews submitted for a contract.
    """
    rows = await connection.fetch("""
        SELECT *
        FROM contract_mutual_reviews
        WHERE contract_id = $1
        ORDER BY created_at ASC
    """, contract_id)

    results = []
    for r in rows:
        d = dict(r)
        d["party_role"] = str(d["party_role"])
        results.append(d)
    return results
