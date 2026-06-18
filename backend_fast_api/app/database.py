# ============================================================
# database.py - Database Engine & Session Management
# ============================================================
# PURPOSE:
# Configures SQLAlchemy async engine and session factory for
# PostgreSQL with pgvector extension.
#
# RESPONSIBILITIES:
# - Create async SQLAlchemy engine from DATABASE_URL
# - Configure connection pooling (pool_size, max_overflow)
# - Create async session factory (AsyncSessionLocal)
# - Define the declarative Base class for all ORM models
# - Provide get_db() async generator for dependency injection
# - Ensure pgvector extension is enabled on startup
#
# DESIGN DECISIONS:
# - AsyncPG driver for non-blocking database operations
# - pgvector extension enables VECTOR column type for storing
#   semantic embeddings (768-dim from all-MiniLM-L6-v2 model)
# - Single PostgreSQL instance for both relational data and
#   vector embeddings, keeping the stack simple
#
# ALL MODELS FROM THESE MODULES WILL INHERIT FROM Base:
# - users, organizations, tenders, bids, evaluations,
#   contracts, payments, notifications, messaging, disputes,
#   audit, reports, vendor_intelligence, invitations
# ============================================================
