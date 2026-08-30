-- ============================================================
-- Migration: Add Tokens, Organization Advance Balance & Platform Pricing
-- ============================================================

-- 1. Ensure organizations have credit_balance with default 250
ALTER TABLE organizations ALTER COLUMN credit_balance SET DEFAULT 250;
UPDATE organizations SET credit_balance = 250 WHERE credit_balance = 0 OR credit_balance IS NULL;

-- 2. Add extra descriptive columns to credit_transactions
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE credit_transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- 3. Create platform_pricing table for admin-configurable token rates
CREATE TABLE IF NOT EXISTS platform_pricing (
    pricing_id          SERIAL PRIMARY KEY,
    price_per_token     NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    tender_publish_cost INT NOT NULL DEFAULT 50,
    bid_cost            INT NOT NULL DEFAULT 20,
    updated_by          INT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at          TIMESTAMP DEFAULT NOW()
);

-- 4. Seed initial default pricing if empty
INSERT INTO platform_pricing (price_per_token, tender_publish_cost, bid_cost)
SELECT 1.00, 50, 20
WHERE NOT EXISTS (SELECT 1 FROM platform_pricing);
