# ============================================================
# exceptions.py - Custom Exception Classes & Handlers
# ============================================================
# PURPOSE:
# Defines application-specific exceptions and registers
# global exception handlers with FastAPI.
#
# EXCEPTION CLASSES TO DEFINE:
# - NotFoundException: Resource not found (404)
# - UnauthorizedException: Authentication required (401)
# - ForbiddenException: Insufficient permissions (403)
# - BadRequestException: Invalid input data (400)
# - ConflictException: Duplicate resource / state conflict (409)
# - InsufficientCreditsException: Not enough credit points for action
# - TenderClosedException: Bid submitted after deadline
# - NDARequiredException: Trying to view restricted tender without NDA
# - DocumentVerificationPendingException: Action requires verified docs
# - PaymentFailedException: SSLCommerz transaction failed
# - RateLimitExceededException: Too many requests (429)
#
# GLOBAL HANDLERS:
# - Register handlers that convert these exceptions into proper
#   HTTP responses with consistent JSON error format:
#   { "detail": "message", "error_code": "SPECIFIC_CODE" }
# ============================================================
