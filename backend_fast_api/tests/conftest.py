# ============================================================
# tests/conftest.py - Pytest Configuration & Fixtures
# ============================================================
# PURPOSE:
# Shared test fixtures and configuration for the entire test suite.
#
# FIXTURES TO DEFINE:
# - app: FastAPI test application instance
# - client: httpx AsyncClient for making test requests
# - db_session: Test database session (uses test DB, rolled back
#   after each test for isolation)
# - test_user: Pre-created test user with valid credentials
# - test_buyer_org: Pre-created buyer organization
# - test_vendor_org: Pre-created vendor organization
# - auth_headers: Authorization headers with valid JWT token
# - buyer_headers: Auth headers for a buyer user
# - vendor_headers: Auth headers for a vendor user
# - admin_headers: Auth headers for an admin user
# - test_tender: Pre-created test tender
# - test_bid: Pre-created test bid
# - mock_redis: Mocked Redis client
# - mock_s3: Mocked S3/MinIO client
# - mock_sslcommerz: Mocked payment gateway
# - mock_ml_service: Mocked ML microservice responses
#
# SETUP:
# - Uses a separate test PostgreSQL database
# - Creates and drops tables before/after test session
# - Each test runs in a transaction that is rolled back
# ============================================================
