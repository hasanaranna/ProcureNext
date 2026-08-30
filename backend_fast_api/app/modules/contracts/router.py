# ============================================================
# contracts/router.py - Contract & Mutual Review API Endpoints
# ============================================================

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.contracts.schemas import (
    MutualReviewCreateRequest,
    MutualReviewResponse,
    ContractCompleteResponse,
    ContractReviewsSummaryResponse,
)
from app.modules.contracts.service import (
    complete_contract,
    submit_mutual_review,
    get_contract_mutual_reviews,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contracts", tags=["Contracts & Mutual Reviews"])


@router.post("/{contract_id}/complete", response_model=ContractCompleteResponse)
async def mark_contract_completed(
    contract_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Marks an active contract as Completed.
    Required before either counterparty can submit performance reviews.
    """
    user_org_id = current_user.get("organization_id")
    if not user_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            return await complete_contract(connection, contract_id, user_org_id)
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        logger.exception(f"Error completing contract {contract_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.post("/{contract_id}/reviews", response_model=MutualReviewResponse, status_code=status.HTTP_201_CREATED)
async def post_contract_mutual_review(
    contract_id: int,
    payload: MutualReviewCreateRequest,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Submit a mutual review and 1-5 star performance rating for a completed contract.
    Both Buyer and Seller can review each other once upon contract completion.
    """
    user_org_id = current_user.get("organization_id")
    org_user_id = current_user.get("org_user_id")
    if not user_org_id:
        raise HTTPException(status_code=403, detail="User does not belong to any organization.")

    try:
        async with get_db_connection() as connection:
            review = await submit_mutual_review(
                connection=connection,
                contract_id=contract_id,
                reviewer_org_id=user_org_id,
                reviewer_user_id=org_user_id,
                review_data=payload
            )
            return review
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        # Duplicate submission or uncompleted contract
        err_msg = str(ve)
        if "Duplicate review" in err_msg:
            raise HTTPException(status_code=409, detail=err_msg)
        raise HTTPException(status_code=400, detail=err_msg)
    except Exception as e:
        logger.exception(f"Error submitting review for contract {contract_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")


@router.get("/{contract_id}/reviews", response_model=ContractReviewsSummaryResponse)
async def get_contract_reviews(
    contract_id: int,
    current_user: dict = Depends(get_current_user_org)
):
    """
    Retrieves all mutual reviews associated with a specific contract.
    """
    try:
        async with get_db_connection() as connection:
            reviews = await get_contract_mutual_reviews(connection, contract_id)
            return {
                "contract_id": contract_id,
                "total_reviews": len(reviews),
                "reviews": reviews
            }
    except Exception as e:
        logger.exception(f"Error fetching reviews for contract {contract_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
