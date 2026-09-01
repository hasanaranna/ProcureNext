# ============================================================
# search/router.py - Search API Endpoints
# ============================================================
# COVERS: FR-03 (Advanced Search with Semantic Matching)
#
# ENDPOINTS:
#
# GET /search/tenders
#   - Hybrid search over published tenders: Postgres full-text matching
#     fused with pgvector semantic similarity, so "building materials"
#     can surface a tender titled "Cement & Rod Supply".
#   - Accepts: q (search text), enlisted_only (restrict to enlisted buyers)
#   - Empty q returns the recency-ordered listing.
#
# NOT YET IMPLEMENTED (see module docstrings for the original design):
#   - vendor search / organization search (org search currently lives in
#     the organizations module)
#   - category / budget / date / location filters
# ============================================================

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.core.db import get_db_connection
from app.modules.auth.dependencies import get_current_user_org
from app.modules.search.schemas import TenderSearchResult
from app.modules.search.service import search_tenders

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/tenders", response_model=List[TenderSearchResult])
async def search_tenders_endpoint(
    q: str = "",
    enlisted_only: bool = False,
    current_user: dict = Depends(get_current_user_org),
):
    """
    Hybrid keyword + semantic search over published tenders for the signed-in
    vendor's dashboard.

    Reuse note: serving anonymous callers (e.g. the public tenders page) only
    requires swapping this router-level auth dependency and passing
    viewer_org_id=None - the service layer already handles that case.
    """
    try:
        async with get_db_connection() as connection:
            return await search_tenders(
                connection,
                q=q,
                viewer_org_id=current_user.get("organization_id"),
                enlisted_only=enlisted_only,
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
