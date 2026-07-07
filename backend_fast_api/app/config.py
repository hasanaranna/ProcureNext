# ============================================================
# config.py - Application Configuration & Settings
# ============================================================
# PURPOSE:
# Centralized configuration using Pydantic BaseSettings.
# All environment variables from .env are loaded and validated here.
#
# SETTINGS GROUPS:
# - App settings: APP_NAME, APP_ENV, DEBUG, SECRET_KEY, API_V1_PREFIX
# - Database: DATABASE_URL (PostgreSQL + pgvector connection string)
# - Redis: REDIS_URL (caching, sessions, rate limiting, Celery broker)
# - JWT: SECRET_KEY, ALGORITHM, token expiry durations
# - SSLCommerz: STORE_ID, STORE_PASSWORD, SANDBOX mode, callback URLs
# - S3/MinIO: ENDPOINT_URL, ACCESS_KEY, SECRET_KEY, BUCKET_NAME
# - Email/SMTP: host, port, credentials for transactional emails
# - OTP Service: API key and base URL for SMS OTP verification
# - ML Service: URL for the ML microservice (semantic search, recommendations)
# - CORS: Allowed origins list for frontend domains
# - Frontend URL: Used for constructing links in emails (password reset, etc.)
#
# USAGE:
# from app.config import settings
# print(settings.DATABASE_URL)
# ============================================================
