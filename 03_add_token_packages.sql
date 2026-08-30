-- ============================================================
-- 03_add_token_packages.sql
-- Migration: Add token_packages table for admin package management
-- ============================================================

CREATE TABLE IF NOT EXISTS token_packages (
    package_id      SERIAL              PRIMARY KEY,
    package_name    VARCHAR(100)        NOT NULL,
    token_amount    INT                 NOT NULL CHECK (token_amount > 0),
    price_bdt       NUMERIC(10, 2)      NOT NULL CHECK (price_bdt > 0),
    badge           VARCHAR(50),
    is_active       BOOLEAN             DEFAULT TRUE,
    created_at      TIMESTAMP           DEFAULT NOW(),
    updated_at      TIMESTAMP           DEFAULT NOW()
);

-- Seed initial packages if table is empty
INSERT INTO token_packages (package_name, token_amount, price_bdt, badge, is_active)
SELECT 'Starter Pack', 100, 100.00, NULL, TRUE
WHERE NOT EXISTS (SELECT 1 FROM token_packages WHERE token_amount = 100);

INSERT INTO token_packages (package_name, token_amount, price_bdt, badge, is_active)
SELECT 'Growth Bundle', 250, 225.00, 'Popular', TRUE
WHERE NOT EXISTS (SELECT 1 FROM token_packages WHERE token_amount = 250);

INSERT INTO token_packages (package_name, token_amount, price_bdt, badge, is_active)
SELECT 'Pro Business', 500, 400.00, 'Save 20%', TRUE
WHERE NOT EXISTS (SELECT 1 FROM token_packages WHERE token_amount = 500);

INSERT INTO token_packages (package_name, token_amount, price_bdt, badge, is_active)
SELECT 'Enterprise Volume', 1000, 750.00, 'Best Value', TRUE
WHERE NOT EXISTS (SELECT 1 FROM token_packages WHERE token_amount = 1000);
