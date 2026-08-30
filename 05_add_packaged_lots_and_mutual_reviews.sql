-- ============================================================================
-- 05_add_packaged_lots_and_mutual_reviews.sql
-- Migration for ProcureNext:
-- FR-08 (Packaged & Multi-Lot Tenders, Bid Bond, Scheduling)
-- FR-10 (Bid Items & Lot Breakdown)
-- Custom Extension extending FR-14 (Mutual Reviews & Rating System)
-- ============================================================================

-- 1. Custom Enum Types
DO $$ BEGIN
    CREATE TYPE tender_package_type AS ENUM ('SingleItem', 'PackagedLots');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE review_party_role AS ENUM ('BuyerToSeller', 'SellerToBuyer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tenders Table Enhancements
ALTER TABLE public.tenders 
  ADD COLUMN IF NOT EXISTS package_type tender_package_type NOT NULL DEFAULT 'SingleItem',
  ADD COLUMN IF NOT EXISTS bid_bond_amount NUMERIC(15, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP WITHOUT TIME ZONE;

-- 3. Tender Items / Lots Table
CREATE TABLE IF NOT EXISTS public.tender_items (
    item_id SERIAL PRIMARY KEY,
    tender_id INTEGER NOT NULL REFERENCES public.tenders(tender_id) ON DELETE CASCADE,
    lot_number VARCHAR(64) NOT NULL DEFAULT 'LOT-1',
    item_name VARCHAR(255) NOT NULL,
    specifications TEXT,
    quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
    unit_of_measure VARCHAR(32) NOT NULL,
    estimated_unit_price NUMERIC(15, 2),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_items_tender_id ON public.tender_items(tender_id);

-- Optional Lot link on required documents
ALTER TABLE public.tender_required_documents
  ADD COLUMN IF NOT EXISTS target_lot_number VARCHAR(64) DEFAULT NULL;

-- 4. Bid Items Table (Itemized Lot Bids)
CREATE TABLE IF NOT EXISTS public.bid_items (
    bid_item_id SERIAL PRIMARY KEY,
    bid_id INTEGER NOT NULL REFERENCES public.bids(bid_id) ON DELETE CASCADE,
    tender_item_id INTEGER NOT NULL REFERENCES public.tender_items(item_id) ON DELETE RESTRICT,
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    offered_quantity NUMERIC(12, 2) NOT NULL CHECK (offered_quantity > 0),
    total_price NUMERIC(15, 2) GENERATED ALWAYS AS (unit_price * offered_quantity) STORED,
    compliance_remarks TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_bid_tender_item UNIQUE (bid_id, tender_item_id)
);

CREATE INDEX IF NOT EXISTS idx_bid_items_bid_id ON public.bid_items(bid_id);

-- 5. Contract Mutual Reviews (Bidirectional Buyer <-> Seller)
CREATE TABLE IF NOT EXISTS public.contract_mutual_reviews (
    review_id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES public.contracts(contract_id) ON DELETE CASCADE,
    tender_id INTEGER NOT NULL REFERENCES public.tenders(tender_id) ON DELETE CASCADE,
    reviewer_org_id INTEGER NOT NULL REFERENCES public.organizations(organization_id),
    reviewee_org_id INTEGER NOT NULL REFERENCES public.organizations(organization_id),
    reviewer_user_id INTEGER NOT NULL REFERENCES public.organization_employees(org_user_id),
    party_role review_party_role NOT NULL,
    overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
    quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 5),
    timeliness_score INTEGER CHECK (timeliness_score >= 1 AND timeliness_score <= 5),
    communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
    review_text TEXT NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_contract_reviewer_org UNIQUE (contract_id, reviewer_org_id),
    CONSTRAINT chk_different_review_parties CHECK (reviewer_org_id <> reviewee_org_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.contract_mutual_reviews(reviewee_org_id);
CREATE INDEX IF NOT EXISTS idx_reviews_contract ON public.contract_mutual_reviews(contract_id);

-- 6. Organization Reputation Summary
CREATE TABLE IF NOT EXISTS public.organization_reputation (
    organization_id INTEGER PRIMARY KEY REFERENCES public.organizations(organization_id) ON DELETE CASCADE,
    seller_review_count INTEGER NOT NULL DEFAULT 0,
    seller_avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    buyer_review_count INTEGER NOT NULL DEFAULT 0,
    buyer_avg_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    composite_trust_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
