# ============================================================
# services/redis.py - Redis Client Configuration
# ============================================================
# PURPOSE:
# Configures and provides the Redis client used across the app.
#
# REDIS USAGE IN PROCURENEXT:
# - Session storage (JWT blacklist for logout)
# - OTP code storage (with TTL for expiry)
# - Rate limiting counters
# - Tender listing cache (hot data)
# - Recommendation result cache
# - Search result cache
# - Celery message broker
# - Real-time notification pub/sub for SSE
# - WebSocket message distribution for chat
#
# FUNCTIONS TO IMPLEMENT:
# - get_redis_client(): Return async Redis client instance
# - set_with_ttl(key, value, ttl): Store with expiration
# - get_value(key): Retrieve value
# - delete_key(key): Remove key
# - increment(key): Atomic increment (for rate limiting)
# - publish(channel, message): Pub/sub for real-time features
# - subscribe(channel): Subscribe to pub/sub channel
# ============================================================
