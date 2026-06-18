# ============================================================
# search/filters.py - Search Filter Definitions
# ============================================================
# PURPOSE:
# Defines reusable filter specifications for search queries.
#
# FILTER GROUPS TO DEFINE:
# - TenderFilters: category, procurement_nature, procurement_method,
#   budget_range, location, date_ranges (publish, deadline),
#   visibility_type, organization
# - VendorFilters: skills, location, rating_range, org_type
# - OrgFilters: name, type, verification_status, location
#
# Each filter maps to a SQLAlchemy query clause.
# Supports dynamic filter building from query parameters.
# ============================================================
