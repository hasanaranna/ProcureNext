-- ============================================================
-- 04_add_eligibility_and_update_vector384.sql
-- ProcureNext - Support 384-dimensional Embeddings & Eligibility
-- ============================================================

-- 1. Alter tenders embedding column to VECTOR(384) to match all-MiniLM-L6-v2 output
ALTER TABLE public.tenders ALTER COLUMN embedding TYPE VECTOR(384);

-- 2. Add eligibility_of_tenderer column to tenders table
ALTER TABLE public.tenders ADD COLUMN IF NOT EXISTS eligibility_of_tenderer TEXT;

-- 3. Ensure procurement_nature lookup table has required default entries
INSERT INTO public.procurement_nature (name)
VALUES ('Goods'), ('Works'), ('Services'), ('Consultancy')
ON CONFLICT (name) DO NOTHING;

-- 4. Ensure procurement_method lookup table has required default entries
INSERT INTO public.procurement_method (method_code, description)
VALUES 
    ('OTM', 'Open Tendering Method'),
    ('RFQ', 'Request for Quotation'),
    ('RFP', 'Request for Proposal'),
    ('ReverseAuction', 'Reverse Auction'),
    ('Direct', 'Direct Procurement')
ON CONFLICT (method_code) DO NOTHING;
