# ============================================================
# payments/router.py - Payment & Credit System API Endpoints
# ============================================================
# COVERS: FR-18 (Credit Points & Payments), FR-19 (Bid-Bond),
#         FR-20 (Tender Publishing Cost Config), FR-21 (Payment Gateway)
#
# BUSINESS MODEL:
# - Platform uses a credit point system (1 point = 1 tender action)
# - Users buy points with real money via SSLCommerz
# - Publishing a tender costs points (buyer)
# - Submitting a bid costs points (vendor)
# - Points are refundable at the rate they were purchased
# - Tender cancellation: no refund for buyer, refund for vendors
# - Admin can configure point pricing (variable cost per point)
#
# ENDPOINTS:
#
# POST /finance/credits/initiate
#   - Initiate credit point purchase
#   - Accepts: amount (number of points), payment method
#   - Calls SSLCommerz API to create payment session
#   - Returns: SSLCommerz redirect URL for payment
#
# POST /finance/payment-callback
#   - SSLCommerz webhook callback after payment completion
#   - Validates payment authenticity (val_id, tran_id)
#   - Credits points to organization's credit account
#   - Creates payment and credit_transaction records
#
# POST /finance/payment-fail
#   - SSLCommerz callback for failed payments
#
# POST /finance/payment-cancel
#   - SSLCommerz callback for cancelled payments
#
# POST /finance/refund
#   - Request refund of credit points
#   - Refund at the rate at which points were originally purchased
#   - Creates refund transaction record
#
# GET /finance/balance
#   - View current credit point balance for the organization
#
# GET /finance/history
#   - View complete transaction ledger for the organization
#   - Shows: purchases, deductions (tender publish, bid submit),
#     refunds, bid-bond holds/releases
#   - Paginated with date range filter
#
# --- Admin Pricing ---
#
# POST /admin/update-price
#   - Admin updates the price per credit point (in BDT)
#   - Accepts: new_price_per_point
#   - Rate is constant (1 point = 1 tender/bid action) but
#     the BDT cost per point is variable
# ============================================================
