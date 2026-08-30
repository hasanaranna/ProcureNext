# ============================================================
# services/ml_client.py - ML Microservice HTTP Client
# ============================================================

import logging
import os
from typing import List, Union

import httpx
from fastapi import HTTPException

from app.services.ml_schemas import ProcurementDocument

logger = logging.getLogger(__name__)

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", "").rstrip("/")
ML_SERVICE_TIMEOUT = float(os.getenv("ML_SERVICE_TIMEOUT", "120"))


def _require_ml_service_url() -> str:
    if not ML_SERVICE_URL:
        raise HTTPException(
            status_code=503,
            detail="ML service is not configured. Set ML_SERVICE_URL.",
        )
    return ML_SERVICE_URL


def _build_pdf_files(pdf_source: Union[str, bytes, bytearray]) -> dict:
    if isinstance(pdf_source, str):
        if not os.path.exists(pdf_source):
            raise HTTPException(status_code=400, detail="PDF file path does not exist.")
        with open(pdf_source, "rb") as file_handle:
            content = file_handle.read()
        filename = os.path.basename(pdf_source)
    else:
        content = bytes(pdf_source)
        filename = "tender.pdf"

    if not content:
        raise HTTPException(status_code=400, detail="PDF content is empty.")

    return {"file": (filename, content, "application/pdf")}


def _raise_for_ml_response(response: httpx.Response, action: str) -> None:
    if response.status_code < 400:
        return

    detail = response.text
    try:
        payload = response.json()
        if isinstance(payload, dict) and payload.get("detail"):
            detail = payload["detail"]
    except Exception:
        pass

    logger.error("ML service %s failed (%s): %s", action, response.status_code, detail)
    raise HTTPException(
        status_code=502,
        detail=f"ML service {action} failed: {detail}",
    )


def parse_and_embed_tender_pdf_sync(pdf_source: Union[str, bytes, bytearray]) -> ProcurementDocument:
    """Synchronous client for Celery workers."""
    base_url = _require_ml_service_url()
    files = _build_pdf_files(pdf_source)

    with httpx.Client(timeout=ML_SERVICE_TIMEOUT) as client:
        response = client.post(f"{base_url}/documents/tender/parse", files=files)
        _raise_for_ml_response(response, "PDF parsing")
        return ProcurementDocument.model_validate(response.json())


async def parse_and_embed_tender_pdf(pdf_source: Union[str, bytes, bytearray]) -> ProcurementDocument:
    """Async client for FastAPI request handlers."""
    base_url = _require_ml_service_url()
    files = _build_pdf_files(pdf_source)

    async with httpx.AsyncClient(timeout=ML_SERVICE_TIMEOUT) as client:
        response = await client.post(f"{base_url}/documents/tender/parse", files=files)
        _raise_for_ml_response(response, "PDF parsing")
        return ProcurementDocument.model_validate(response.json())


def vectorize_text_sync(text: str) -> List[float]:
    """Synchronous embedding client for service-layer code."""
    base_url = _require_ml_service_url()
    payload = {"text": text or "tender procurement document"}

    with httpx.Client(timeout=ML_SERVICE_TIMEOUT) as client:
        response = client.post(f"{base_url}/embeddings/text", json=payload)
        _raise_for_ml_response(response, "text embedding")
        data = response.json()
        embedding = data.get("embedding")
        if not isinstance(embedding, list):
            raise HTTPException(status_code=502, detail="ML service returned an invalid embedding payload.")
        return embedding


async def vectorize_text(text: str) -> List[float]:
    """Async embedding client."""
    base_url = _require_ml_service_url()
    payload = {"text": text or "tender procurement document"}

    async with httpx.AsyncClient(timeout=ML_SERVICE_TIMEOUT) as client:
        response = await client.post(f"{base_url}/embeddings/text", json=payload)
        _raise_for_ml_response(response, "text embedding")
        data = response.json()
        embedding = data.get("embedding")
        if not isinstance(embedding, list):
            raise HTTPException(status_code=502, detail="ML service returned an invalid embedding payload.")
        return embedding
