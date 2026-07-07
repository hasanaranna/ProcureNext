# ============================================================
# reports/schemas.py - Reporting Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - PlatformStatsResponse: total_users, total_orgs, total_tenders,
#   total_bids, active_tenders, monthly_revenue, growth_rate
# - TenderAnalyticsResponse: volumes_by_category, status_distribution,
#   average_bids_per_tender, trends_over_time
# - VendorAnalyticsResponse: average_ratings, completion_rates,
#   top_vendors, category_distribution
# - RevenueAnalyticsResponse: total_sales, total_refunds, net_revenue,
#   monthly_breakdown
# - ExportRequest: report_type, date_from, date_to, format
# - ExportResponse: download_url or file bytes
# - SystemMetricResponse: metric_type, value, calculated_at
# ============================================================
