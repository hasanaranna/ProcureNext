# ============================================================
# reports/router.py - Reporting & Analytics API Endpoints
# ============================================================
# COVERS: FR-20/FR-24 (Reporting & Analytics)
#
# System reports for both admin and registered users.
# Reports should be exportable as CSV/PDF.
#
# ENDPOINTS:
#
# --- Admin Reports ---
#
# GET /admin/stats
#   - Platform-wide statistics dashboard
#   - Returns: total users, total orgs, total tenders, total bids,
#     active tenders, revenue from credit sales, monthly growth
#
# GET /admin/reports/tenders
#   - Tender analytics: volumes by category, status distribution,
#     average bid counts per tender, publication trends over time
#
# GET /admin/reports/vendors
#   - Vendor performance analytics: average ratings, completion rates,
#     most active vendors, vendor distribution by category
#
# GET /admin/reports/revenue
#   - Revenue analytics: credit sales, refunds, net revenue,
#     revenue by month, top buyers by spend
#
# GET /admin/reports/fraud
#   - Anomaly detection reports: unusual bidding patterns,
#     price anomalies, suspicious activity indicators
#
# --- User Reports ---
#
# GET /reports/my-tenders
#   - Buyer: statistics on their tenders (published, awarded, etc.)
#
# GET /reports/my-bids
#   - Vendor: statistics on their bids (submitted, won, lost)
#
# GET /reports/export
#   - Export any report as CSV or PDF
#   - Accepts: report_type, date_range, format (csv/pdf)
# ============================================================
