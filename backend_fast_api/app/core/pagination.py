# ============================================================
# pagination.py - Pagination Utilities
# ============================================================
# PURPOSE:
# Provides reusable pagination logic for list endpoints.
#
# RESPONSIBILITIES:
# - Define PaginationParams dependency (page, page_size with defaults)
# - Define PaginatedResponse schema (items, total, page, page_size,
#   total_pages, has_next, has_previous)
# - Utility function to apply LIMIT/OFFSET to SQLAlchemy queries
# - Support cursor-based pagination for real-time feeds
#   (tender feed, notification stream) where offset-based
#   pagination would miss new items
#
# USED BY:
# - Tender listing (public and dashboard)
# - Bid listing
# - Notification listing
# - Audit log viewing
# - Search results
# - Message thread listing
# ============================================================
