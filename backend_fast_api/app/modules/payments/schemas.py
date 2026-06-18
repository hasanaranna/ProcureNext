# ============================================================
# payments/schemas.py - Payment & Credit Pydantic Schemas
# ============================================================
# SCHEMAS TO DEFINE:
# - CreditPurchaseRequest: number_of_points, payment_method
# - CreditPurchaseResponse: sslcommerz_redirect_url, transaction_id
# - PaymentCallbackData: tran_id, val_id, amount, status, card_type
#   (fields from SSLCommerz webhook)
# - CreditBalanceResponse: balance, organization_id
# - TransactionHistoryResponse: paginated list of CreditTransaction
# - CreditTransaction: id, amount, type (Purchase/Deduct/Refund),
#   description, payment_reference, created_at
# - RefundRequest: number_of_points, reason
# - RefundResponse: refund_amount_bdt, new_balance
# - PriceUpdateRequest: new_price_per_point (admin only)
# - PricingInfo: current_price_per_point, currency
# ============================================================
