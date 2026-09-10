# ============================================================
# search/schemas.py - Search Pydantic Schemas
# ============================================================
# COVERS: FR-03 (Advanced Search with Semantic Matching)
#
# Currently implemented: tender search results.
# Vendor/organization search schemas are not implemented yet -
# organization search lives in the organizations module today.
# ============================================================

from datetime import datetime

from pydantic import BaseModel


class TenderSearchResult(BaseModel):
    """
    A single tender in a search result set.

    Mirrors the shape returned by the tender listing endpoints, plus the
    relevance score used to order hybrid (keyword + semantic) search results.
    """

    tender_id: int
    title: str
    description: str
    status: str
    buyer_org_name: str
    submission_deadline: datetime | None = None
    created_at: datetime
    relevance_score: float = 0.0
