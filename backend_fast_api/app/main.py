# ============================================================
# main.py - FastAPI Application Entry Point
# ============================================================
# PURPOSE:
# This is the root of the ProcureNext backend application.
#
# RESPONSIBILITIES:
# - Create and configure the FastAPI application instance
# - Register all module routers (auth, users, organizations,
#   tenders, bids, payments, search, admin, etc.)
# - Configure middleware stack:
#     * CORS (frontend at localhost:3000 / production domain)
#     * Rate limiting (protect public endpoints from abuse)
#     * Request logging (structured request/response logs)
#     * Audit middleware (auto-capture critical action logs)
# - Define startup event handlers:
#     * Initialize database connection pool
#     * Initialize Redis connection
#     * Verify S3/MinIO bucket exists
#     * Warm up any caches
# - Define shutdown event handlers:
#     * Close database connections gracefully
#     * Close Redis connections
# - Mount the OpenAPI docs at /docs (Swagger UI)
#
# RUN: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# ============================================================
