# ============================================================
# contracts/schemas.py - Contract Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - ContractCreateRequest: award_id, contract_value, start_date,
#   completion_date, execution_location, initial terms
# - ContractUpdateRequest: editable terms
# - ContractResponse: Full contract details
# - MilestoneCreateRequest: title, description, due_date, payment_amount
# - MilestoneUpdateRequest: editable milestone fields
# - MilestoneResponse: milestone details with status
# - ContractConfirmRequest: confirmation from a party
# - ContractTerminateRequest: reason for termination
# ============================================================
