# ============================================================
# search/service.py - Search Business Logic
# ============================================================
# COVERS: FR-03 (Advanced Search with Semantic Matching)
#
# Hybrid tender search: combines Postgres full-text search over the
# tenders.search_vector column with pgvector cosine similarity over the
# tenders.embedding column (populated at tender publish time).
#
# The two result sets are merged with Reciprocal Rank Fusion (RRF), which
# combines them by rank position rather than raw score - the two scoring
# scales (ts_rank_cd is unbounded, cosine similarity is bounded) are not
# directly comparable, and RRF sidesteps normalising them entirely.
#
# If the ML service is unavailable, search degrades to full-text only
# rather than failing.
# ============================================================

import logging

import asyncpg

from app.modules.tenders.service import build_visibility_filter
from app.services.ml_client import vectorize_text

logger = logging.getLogger(__name__)

# Number of candidates taken from each ranking arm before fusion.
CANDIDATE_LIMIT = 50

# RRF smoothing constant. 60 is the value from the original RRF paper and the
# de facto default; it damps the influence of the top few ranks.
RRF_K = 60

# Maximum cosine distance for a tender to count as a semantic match. Without a
# ceiling, the nearest-neighbour arm always returns CANDIDATE_LIMIT rows no
# matter how unrelated they are, so a nonsense query would return a full page of
# irrelevant tenders. Tune if semantic recall feels too tight or too loose.
SEMANTIC_DISTANCE_THRESHOLD = 0.8


def _build_tender_scope(
    viewer_org_id: int | None,
    enlisted_only: bool,
    start_idx: int,
) -> tuple[str, str, list, int]:
    """
    Build the JOIN/WHERE fragments scoping a tender query to what a viewer may see.

    Mirrors the access rules in tenders.service.get_all_published_tenders so that
    search results stay consistent with the plain listing endpoint.

    Returns:
        (join_sql, where_sql, params, next_param_idx)
    """
    join_sql = ""
    where_sql = ""
    params: list = []
    idx = start_idx

    if enlisted_only and viewer_org_id is not None:
        join_sql += (
            f" JOIN enlisted_vendors ev"
            f" ON ev.enlisted_org_id = t.buyer_id AND ev.org_id = ${idx}"
        )
        params.append(viewer_org_id)
        idx += 1
    elif viewer_org_id is not None:
        # Vendors should not see their own organisation's tenders in the feed.
        where_sql += f" AND t.buyer_id != ${idx}"
        params.append(viewer_org_id)
        idx += 1

    visibility_sql, visibility_params = build_visibility_filter(viewer_org_id, idx)
    where_sql += visibility_sql
    params.extend(visibility_params)
    idx += len(visibility_params)

    return join_sql, where_sql, params, idx


async def _list_recent_tenders(
    connection: asyncpg.Connection,
    viewer_org_id: int | None,
    enlisted_only: bool,
) -> list[dict]:
    """Recency-ordered tender list, used when no search query was supplied."""
    join_sql, where_sql, params, _ = _build_tender_scope(viewer_org_id, enlisted_only, 1)

    query = f"""
        SELECT
            t.tender_id,
            t.title,
            t.description,
            t.status,
            o.organization_name AS buyer_org_name,
            t.submission_deadline,
            t.created_at,
            0.0 AS relevance_score
        FROM tenders t
        JOIN organizations o ON t.buyer_id = o.organization_id
        {join_sql}
        WHERE t.status = 'Published'
        {where_sql}
        ORDER BY t.created_at DESC;
    """
    rows = await connection.fetch(query, *params)
    return [dict(row) for row in rows]


async def _embed_query(q: str) -> str | None:
    """
    Vectorise the search query via the ML service.

    Returns the pgvector literal to bind, or None if the ML service is
    unavailable - callers fall back to full-text-only ranking in that case.
    asyncpg has no native vector codec registered here, so the vector is passed
    as a string literal and cast with ::vector, matching the tender write path.
    """
    try:
        vector = await vectorize_text(q)
    except Exception as exc:
        logger.warning("Semantic search unavailable, falling back to full-text only: %s", exc)
        return None

    if not vector:
        return None
    return f"[{','.join(str(float(x)) for x in vector)}]"


async def search_tenders(
    connection: asyncpg.Connection,
    q: str,
    viewer_org_id: int | None,
    enlisted_only: bool = False,
) -> list[dict]:
    """
    Hybrid keyword + semantic search over published tenders.

    Args:
        connection: Open asyncpg connection.
        q: Free-text search query. Empty/blank returns a recency-ordered list.
        viewer_org_id: Viewing organisation's id, or None for an anonymous caller.
            (The public-tenders page can reuse this function by passing None - only
            the router-level auth dependency needs to change, not this signature.)
        enlisted_only: Restrict results to buyers the viewer has enlisted.
    """
    q = (q or "").strip()
    if not q:
        return await _list_recent_tenders(connection, viewer_org_id, enlisted_only)

    params: list = []
    idx = 1

    # --- Full-text arm ---
    q_idx = idx
    params.append(q)
    idx += 1
    fts_join, fts_where, fts_params, idx = _build_tender_scope(viewer_org_id, enlisted_only, idx)
    params.extend(fts_params)

    fts_cte = f"""
        fts AS (
            SELECT
                t.tender_id,
                row_number() OVER (
                    ORDER BY ts_rank_cd(t.search_vector, plainto_tsquery('english', ${q_idx})) DESC
                ) AS rank
            FROM tenders t
            {fts_join}
            WHERE t.status = 'Published'
              AND t.search_vector @@ plainto_tsquery('english', ${q_idx})
            {fts_where}
            LIMIT {CANDIDATE_LIMIT}
        )
    """

    # --- Semantic arm (skipped entirely if the ML service is unreachable) ---
    query_vector = await _embed_query(q)

    if query_vector is None:
        query = f"""
            WITH {fts_cte}
            SELECT
                t.tender_id,
                t.title,
                t.description,
                t.status,
                o.organization_name AS buyer_org_name,
                t.submission_deadline,
                t.created_at,
                1.0 / ({RRF_K} + fts.rank) AS relevance_score
            FROM tenders t
            JOIN organizations o ON t.buyer_id = o.organization_id
            JOIN fts ON fts.tender_id = t.tender_id
            ORDER BY relevance_score DESC, t.created_at DESC;
        """
        rows = await connection.fetch(query, *params)
        return [dict(row) for row in rows]

    vec_idx = idx
    params.append(query_vector)
    idx += 1
    vec_join, vec_where, vec_params, idx = _build_tender_scope(viewer_org_id, enlisted_only, idx)
    params.extend(vec_params)

    query = f"""
        WITH {fts_cte},
        vec AS (
            SELECT
                t.tender_id,
                row_number() OVER (ORDER BY t.embedding <=> ${vec_idx}::vector) AS rank
            FROM tenders t
            {vec_join}
            WHERE t.status = 'Published'
              AND t.embedding IS NOT NULL
              AND (t.embedding <=> ${vec_idx}::vector) < {SEMANTIC_DISTANCE_THRESHOLD}
            {vec_where}
            LIMIT {CANDIDATE_LIMIT}
        )
        SELECT
            t.tender_id,
            t.title,
            t.description,
            t.status,
            o.organization_name AS buyer_org_name,
            t.submission_deadline,
            t.created_at,
            COALESCE(1.0 / ({RRF_K} + fts.rank), 0) + COALESCE(1.0 / ({RRF_K} + vec.rank), 0)
                AS relevance_score
        FROM tenders t
        JOIN organizations o ON t.buyer_id = o.organization_id
        LEFT JOIN fts ON fts.tender_id = t.tender_id
        LEFT JOIN vec ON vec.tender_id = t.tender_id
        WHERE fts.tender_id IS NOT NULL OR vec.tender_id IS NOT NULL
        ORDER BY relevance_score DESC, t.created_at DESC;
    """
    rows = await connection.fetch(query, *params)
    return [dict(row) for row in rows]
