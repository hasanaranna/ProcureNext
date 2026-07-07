# ============================================================
# payments/models.py - Payment & Credit SQLAlchemy Models
# ============================================================
# Maps to ERD Module 10 (Credit & Payment System).
#
# TABLES:
#
# CREDIT_ACCOUNTS
#   - credit_account_id (PK, SERIAL)
#   - organization_id (FK -> ORGANIZATIONS, UNIQUE) - one per org
#   - balance (NUMERIC, DEFAULT 0)
#
# CREDIT_TRANSACTIONS
#   - transaction_id (PK, SERIAL)
#   - organization_id (FK -> ORGANIZATIONS)
#   - amount (NUMERIC) - positive for credits, negative for debits
#   - transaction_type (ENUM: Purchase, Deduct, Refund)
#   - description (TEXT) - e.g., "Tender publish: T-2026-00001"
#   - related_tender_id (FK -> TENDERS, NULLABLE)
#   - related_bid_id (FK -> BIDS, NULLABLE)
#   - payment_reference (VARCHAR, NULLABLE) - links to PAYMENTS
#   - purchase_rate (NUMERIC, NULLABLE) - BDT/point at time of purchase
#   - created_at (TIMESTAMP)
#
# PAYMENTS
#   - payment_id (PK, SERIAL)
#   - organization_id (FK -> ORGANIZATIONS)
#   - amount (NUMERIC) - BDT amount
#   - points_purchased (INTEGER)
#   - gateway_transaction_id (VARCHAR) - SSLCommerz tran_id
#   - val_id (VARCHAR(50)) - SSLCommerz validation ID
#   - status (ENUM: Pending, Completed, Failed, Refunded)
#   - paid_at (TIMESTAMP)
#
# PLATFORM_PRICING (admin-configurable)
#   - pricing_id (PK, SERIAL)
#   - price_per_point (NUMERIC) - BDT cost for 1 credit point
#   - effective_from (TIMESTAMP)
#   - set_by (FK -> USERS) - admin who set the price
#   - created_at (TIMESTAMP)
# ============================================================
