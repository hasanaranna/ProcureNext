# ============================================================
# ml_tasks.py - Background ML processing for tender PDFs
# ============================================================

import asyncio
import logging
import os
from datetime import date, datetime
from enum import Enum

from app.core.db import get_db_connection
from app.modules.tenders.service import create_tender_from_parsed_pdf
from app.services.ml_client import parse_and_embed_tender_pdf_sync
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _json_safe(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    return value


def _json_safe_dict(payload: dict) -> dict:
    return {key: _json_safe(value) for key, value in payload.items()}


def _slim_tender_result(payload: dict) -> dict:
    """Return only fields needed by the frontend / TenderResponse."""
    keys = (
        "tender_id",
        "buyer_id",
        "created_by",
        "title",
        "description",
        "status",
        "category",
        "procurement_nature",
        "procurement_method",
        "eligibility_of_tenderer",
        "budget_min",
        "budget_max",
        "submission_deadline",
        "tender_public_date",
        "pre_bid_meeting",
        "tender_opening_date",
        "created_at",
    )
    return _json_safe_dict({key: payload[key] for key in keys if key in payload})


@celery_app.task(name="create_tender_from_pdf_task", bind=True)
def create_tender_from_pdf_task(
    self,
    buyer_id: int,
    org_user_id: int,
    user_id: int,
    pdf_path: str,
    original_filename: str,
) -> dict:
    return asyncio.run(
        _async_create_tender_from_pdf(
            buyer_id=buyer_id,
            org_user_id=org_user_id,
            user_id=user_id,
            pdf_path=pdf_path,
            original_filename=original_filename,
        )
    )


async def _async_create_tender_from_pdf(
    buyer_id: int,
    org_user_id: int,
    user_id: int,
    pdf_path: str,
    original_filename: str,
) -> dict:
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"Temporary PDF not found: {pdf_path}")

    try:
        parsed = parse_and_embed_tender_pdf_sync(pdf_path)
        async with get_db_connection() as connection:
            result = await create_tender_from_parsed_pdf(
                connection=connection,
                buyer_id=buyer_id,
                org_user_id=org_user_id,
                user_id=user_id,
                pdf_path=pdf_path,
                original_filename=original_filename,
                parsed=parsed,
            )
            return _slim_tender_result(result)
    finally:
        if os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except OSError:
                logger.warning("Failed to delete temporary PDF: %s", pdf_path)
