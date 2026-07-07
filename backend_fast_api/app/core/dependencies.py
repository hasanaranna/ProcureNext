# ============================================================
# dependencies.py - FastAPI Dependency Injection
# ============================================================
# PURPOSE:
# Reusable FastAPI dependencies injected into route handlers.
#
# DEPENDENCIES TO DEFINE:
# - get_db: Yields an async database session (SQLAlchemy AsyncSession)
# - get_current_user: Extracts and validates JWT from Authorization
#   header, returns the authenticated User object
# - get_current_active_user: Extends get_current_user to also check
#   that the user's status is 'Active' (not Suspended/Pending)
# - get_current_admin: Validates user has Admin role
# - get_current_buyer: Validates user belongs to a Buyer organization
# - get_current_vendor: Validates user belongs to a Vendor organization
# - get_redis: Returns the Redis client instance
# - get_optional_user: Returns user if authenticated, None otherwise
#   (used for public endpoints that behave differently for logged-in users)
#
# USAGE:
# @router.get("/endpoint")
# async def handler(db: AsyncSession = Depends(get_db),
#                   user: User = Depends(get_current_user)):
# ============================================================
