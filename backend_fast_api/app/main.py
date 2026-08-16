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

import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import check_db_connection
from app.modules.organizations.router import router as organizations_router
from app.modules.auth.router import router as auth_router
from app.modules.admin.router import router as admin_router
from app.modules.tenders.router import router as tenders_router
from app.modules.bids.router import router as bids_router
from app.modules.messaging.router import router as messaging_router
from app.modules.payments.router import router as payments_router
from app.modules.audit.router import router as audit_router
from app.modules.messaging.websocket import websocket_endpoint

logger = logging.getLogger("app.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify DB connection on startup
    logger.info("Verifying database connection at application initialization...")
    is_connected = await check_db_connection()
    if is_connected:
        logger.info("Database connection successfully established.")
    else:
        logger.warning("Database connection check failed at initialization. Some features may not work properly.")
    yield
    logger.info("ProcureNext backend shutting down.")


app = FastAPI(
    title="ProcureNext FastAPI Backend",
    lifespan=lifespan
)

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

app.include_router(organizations_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(tenders_router)
app.include_router(bids_router)
app.include_router(messaging_router)
app.include_router(payments_router)
app.include_router(audit_router)

app.add_api_websocket_route("/ws/messages", websocket_endpoint)

@app.get("/health")
async def health_check() -> dict:
    db_ok = await check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected"
    }


