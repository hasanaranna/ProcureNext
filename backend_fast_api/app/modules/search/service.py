# ============================================================
# search/service.py - Search Business Logic
# ============================================================
# PURPOSE:
# Coordinates between basic database search and ML-powered
# semantic search to deliver unified results.
#
# FUNCTIONS TO IMPLEMENT:
# - search_tenders(): Combine keyword search (SQL ILIKE/tsvector)
#   with semantic search (ML service vectorizes query ->
#   pgvector cosine similarity on tender embeddings).
#   Merge results, de-duplicate, rank by combined relevance.
#   Apply visibility rules (public users see limited info).
# - search_vendors(): Similar hybrid search on vendor profiles
# - search_organizations(): Basic keyword search on org names
# - vectorize_query(): Send query text to ML service for embedding
# - semantic_similarity_search(): Query pgvector for nearest
#   neighbor tenders/vendors to the query embedding
# - apply_filters(): Apply filter criteria to search results
# - build_search_response(): Format and paginate results
# ============================================================
