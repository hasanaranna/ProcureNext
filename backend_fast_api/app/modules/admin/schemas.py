# ============================================================
# admin/schemas.py - Admin Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - ModifyUserStatusRequest: user_id, new_status, reason
# - VerifyOrgRequest: organization_id, verification_status,
#   review_notes
# - VerifyDocumentRequest: document_id, review_status, review_notes
# - AdminRegisterRequest: email, password, admin_role
# - AdminStatsResponse: quick summary stats
# - UserReportListResponse: paginated list of user reports
# - UserReportResolveRequest: report_id, action, notes
# - PricingHistoryResponse: list of pricing changes
# ============================================================
