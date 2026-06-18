# ============================================================
# tenders/schemas.py - Tender Pydantic Schemas
# ============================================================
# PURPOSE:
# Request/response models for tender management.
#
# SCHEMAS TO DEFINE:
#
# Requests:
# - TenderCreateRequest: title, description, category_id, nature_id,
#   method_id, visibility_type, budget_min, budget_max, budget_type,
#   submission_deadline, document_price, security_required,
#   evaluation_type, lots (optional list of LotCreate)
# - TenderUpdateRequest: editable tender fields
# - LotCreateRequest: lot_title, description, budget, delivery_location,
#   tentative_start_date, tentative_completion_date
# - LotUpdateRequest: editable lot fields
# - TenderAmendmentRequest: description of changes, file upload
# - ClarificationRequest: question text
# - ClarificationReplyRequest: answer text
#
# Responses:
# - TenderResponse: Full tender details including buyer org, lots,
#   documents, status, dates, category info
# - TenderListItem: Summary for listing views
# - TenderPublicSummary: Limited info visible to unregistered users
#   (title, buyer name, category, dates - NO detailed description)
# - LotResponse: lot details
# - TenderDocumentResponse: file info
# - ClarificationResponse: question, answer, timestamps
# - TenderAmendmentResponse: amendment details
# ============================================================
