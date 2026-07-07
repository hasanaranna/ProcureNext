# ============================================================
# services/sslcommerz.py - SSLCommerz Payment Gateway Integration
# ============================================================
# PURPOSE:
# Integrates with SSLCommerz for processing credit point purchases
# and handling payment lifecycle.
#
# SSLCommerz FLOW:
# 1. Backend creates a payment session with SSLCommerz API
# 2. User is redirected to SSLCommerz hosted payment page
# 3. User completes payment (bKash, Nagad, cards, net banking)
# 4. SSLCommerz sends webhook to our callback URL
# 5. Backend validates the payment and credits points
#
# FUNCTIONS TO IMPLEMENT:
# - create_payment_session(amount, customer_info, tran_id):
#     Call SSLCommerz API to initiate payment
#     Returns: redirect gateway URL
# - validate_payment(callback_data):
#     Verify payment authenticity using val_id
#     Check amount matches expected
#     Prevent replay attacks
# - process_refund(bank_tran_id, amount):
#     Initiate refund through SSLCommerz API
# - get_transaction_status(tran_id):
#     Query SSLCommerz for transaction status
#
# SUPPORTED PAYMENT METHODS:
# - bKash, Nagad, Rocket (Mobile banking)
# - Visa, Mastercard, AMEX (Cards)
# - Internet banking
#
# MODES: Sandbox (testing) and Production (live)
# ============================================================
