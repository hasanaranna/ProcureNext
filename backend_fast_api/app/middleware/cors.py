# ============================================================
# middleware/cors.py - CORS Configuration
# ============================================================
# PURPOSE:
# Configures Cross-Origin Resource Sharing for the FastAPI app.
#
# RESPONSIBILITIES:
# - Allow requests from the Next.js frontend (localhost:3000 in dev,
#   production domain in prod)
# - Configure allowed HTTP methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)
# - Configure allowed headers (Authorization, Content-Type, etc.)
# - Handle preflight OPTIONS requests
# - Set appropriate credentials and expose headers
#
# Origins are loaded from the CORS_ORIGINS environment variable.
# ============================================================
