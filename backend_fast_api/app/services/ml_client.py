# ============================================================
# services/ml_client.py - ML Microservice HTTP Client
# ============================================================
# PURPOSE:
# HTTP client for communicating with the separate ML microservice.
# The ML service handles all AI/NLP heavy computation:
# - Semantic search embedding generation
# - Vendor matching and ranking
# - PDF document parsing and text extraction
# - Tender auto-categorization
# - Bid risk and price anomaly detection
#
# The ML service is a separate Python service (handled by the
# AI/Intelligent Systems Developer - Safayat Saif).
#
# FUNCTIONS TO IMPLEMENT:
# - parse_document(file_path, doc_type):
#     POST /documents/{type}/parse
#     Sends a PDF to ML service for OCR/text extraction
#     Returns: parsed text, detected keywords, vector embedding
#
# - get_tender_recommendations(tender_id):
#     GET /tenders/{tender_id}/recommendations
#     Get top-10 vendor recommendations with explanations
#     Returns: ranked vendors with match scores and reasons
#
# - vectorize_text(text):
#     POST /embeddings/generate
#     Convert text to vector embedding for semantic search
#     Returns: 768-dim vector (from all-MiniLM-L6-v2)
#
# - get_tender_feed(vendor_profile):
#     GET /vendors/{vendor_id}/matching-tenders
#     Get matching tenders for a vendor's profile
#
# DESIGN:
# - Uses httpx async HTTP client for non-blocking calls
# - Includes retry logic and timeout handling
# - Falls back gracefully if ML service is unavailable
# ============================================================
