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

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.modules.organizations.router import router as organizations_router
from app.modules.auth.router import router as auth_router
load_dotenv()

app = FastAPI(title="ProcureNext FastAPI Backend")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(organizations_router)
app.include_router(auth_router)

@app.get("/health")
async def health_check() -> dict:
	return {"status": "ok"}
