# ============================================================
# services/redis.py - Redis Client Configuration
# ============================================================
# PURPOSE:
# Configures and provides the Redis client used across the app.
#
# REDIS USAGE IN PROCURENEXT:
# - Rate limiting counters (see app/middleware/rate_limiter.py)
# - (Reserved for future use: session storage, OTP codes, caches,
#   pub/sub, etc. per the original design notes below.)
# ============================================================

import os

import redis.asyncio as redis

_redis_client: "redis.Redis | None" = None


def get_redis_client() -> "redis.Redis":
    """Return a lazily-created, process-wide async Redis client.

    Reuses the same REDIS_URL / CELERY_BROKER_URL convention already used
    by app/tasks/celery_app.py so this points at the same Redis instance
    that docker-compose already provisions.
    """
    global _redis_client
    if _redis_client is None:
        redis_url = os.getenv("REDIS_URL") or os.getenv(
            "CELERY_BROKER_URL", "redis://redis:6379/0"
        )
        _redis_client = redis.from_url(redis_url, decode_responses=True)
    return _redis_client
