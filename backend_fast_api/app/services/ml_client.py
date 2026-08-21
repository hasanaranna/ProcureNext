# ============================================================
# services/ml_client.py - ML Microservice & Extraction Client
# ============================================================

import os
import sys
import logging
from typing import Optional, List, Union
import httpx

try:
    from app.services.tender_parser import (
        ProcurementDocument,
        parse_and_embed_tender_pdf as _parse_and_embed_tender_pdf,
        generate_embedding as _generate_embedding,
        extract_text_from_pdf as _extract_text_from_pdf,
    )
except ImportError:
    try:
        from ml.src.tender_parser import (
            ProcurementDocument,
            parse_and_embed_tender_pdf as _parse_and_embed_tender_pdf,
            generate_embedding as _generate_embedding,
            extract_text_from_pdf as _extract_text_from_pdf,
        )
    except ImportError:
        from src.tender_parser import (
            ProcurementDocument,
            parse_and_embed_tender_pdf as _parse_and_embed_tender_pdf,
            generate_embedding as _generate_embedding,
            extract_text_from_pdf as _extract_text_from_pdf,
        )

logger = logging.getLogger(__name__)

ML_SERVICE_URL = os.getenv("ML_SERVICE_URL")


async def parse_and_embed_tender_pdf(pdf_source: Union[str, bytes, bytearray]) -> ProcurementDocument:
    """
    Parse a tender PDF and compute its 384-dimensional embedding vector.
    If ML_SERVICE_URL is defined, attempts to call the microservice endpoint.
    Otherwise, executes the Python extraction pipeline directly.
    """
    if ML_SERVICE_URL:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = None
                if isinstance(pdf_source, str) and os.path.exists(pdf_source):
                    with open(pdf_source, "rb") as f:
                        content = f.read()
                    files = {"file": (os.path.basename(pdf_source), content, "application/pdf")}
                elif isinstance(pdf_source, (bytes, bytearray)):
                    files = {"file": ("tender.pdf", bytes(pdf_source), "application/pdf")}

                if files:
                    resp = await client.post(f"{ML_SERVICE_URL.rstrip('/')}/documents/tender/parse", files=files)
                    if resp.status_code == 200:
                        data = resp.json()
                        return ProcurementDocument(**data)
        except Exception as e:
            logger.warning(f"Failed to communicate with external ML service at {ML_SERVICE_URL}: {e}. Falling back to internal engine.")

    # Execute Python extraction & embedding pipeline directly
    return _parse_and_embed_tender_pdf(pdf_source)


def vectorize_text(text: str) -> List[float]:
    """
    Generate 384-dimensional vector embedding for the given text.
    """
    return _generate_embedding(text)
