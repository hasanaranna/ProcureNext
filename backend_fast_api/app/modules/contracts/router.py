# ============================================================
# contracts/router.py - Contract Management API Endpoints
# ============================================================
# COVERS: FR-13 (Contract Draft & Completion)
#
# After award acceptance, the system generates a contract template.
# Buyer and seller can negotiate terms. Contract signing happens
# offline (physically on legal papers). Both parties confirm
# signing within the system to end the procurement cycle.
#
# ENDPOINTS:
#
# POST /contracts
#   - Generate a draft contract from an award
#   - Auto-populates from tender + award data
#   - Accepts: award_id, initial terms, contract_value,
#     start_date, completion_date, execution_location
#
# GET /contracts/{contract_id}
#   - View contract details
#
# PUT /contracts/{contract_id}
#   - Edit contract terms and conditions (both parties)
#   - Only before both parties confirm signing
#
# POST /contracts/{contract_id}/confirm-signing
#   - A party (buyer or vendor) confirms the contract has been
#     physically signed
#   - When BOTH parties confirm, contract becomes "Active"
#   - Platform involvement ends for this procurement cycle
#
# POST /contracts/{contract_id}/milestones
#   - Add a milestone to the contract
#   - Accepts: title, description, due_date, payment_amount
#
# PUT /contracts/{contract_id}/milestones/{milestone_id}
#   - Update milestone status/details
#
# POST /contracts/{contract_id}/complete
#   - Mark contract as completed
#   - Triggers performance review prompt for buyer
#
# POST /contracts/{contract_id}/terminate
#   - Terminate contract early (requires reason)
# ============================================================
