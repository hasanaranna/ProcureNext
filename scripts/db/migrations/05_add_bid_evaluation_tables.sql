-- ============================================================
-- 05_add_bid_evaluation_tables.sql
-- ProcureNext - Smart Bid Evaluation (LLM-assisted scoring)
-- ============================================================

-- bid_evaluation_runs: lifecycle state, one row per "Evaluate Bids" press.
-- Mutable — status is updated in place as the run progresses.
CREATE TABLE IF NOT EXISTS public.bid_evaluation_runs (
    id                      SERIAL PRIMARY KEY,
    tender_id               INT NOT NULL REFERENCES public.tenders(tender_id) ON DELETE CASCADE,
    triggered_by_user_id    INT NOT NULL REFERENCES public.organization_employees(org_user_id),
    triggered_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','running','completed','failed','partial')),
    model_name              VARCHAR(100),
    model_version           VARCHAR(100),
    prompt_version          VARCHAR(50),
    weight_config           JSONB NOT NULL,
    error_message           TEXT,
    completed_at            TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bid_eval_runs_tender ON public.bid_evaluation_runs(tender_id, triggered_at DESC);

-- bid_evaluations: results, one row per bid per run.
-- Append-only — a re-run inserts new rows under a new evaluation_run_id, never overwrites.
CREATE TABLE IF NOT EXISTS public.bid_evaluations (
    id                      SERIAL PRIMARY KEY,
    evaluation_run_id       INT NOT NULL REFERENCES public.bid_evaluation_runs(id) ON DELETE CASCADE,
    bid_id                  INT NOT NULL REFERENCES public.bids(bid_id) ON DELETE CASCADE,
    financial_score         NUMERIC(5,2),
    financial_note          TEXT,
    is_low_outlier          BOOLEAN NOT NULL DEFAULT FALSE,
    document_score          NUMERIC(5,2),
    missing_documents       JSONB NOT NULL DEFAULT '[]',
    semantic_relevance_score JSONB,
    llm_subscores           JSONB,
    composite_score         NUMERIC(5,2),
    raw_llm_response        JSONB,
    row_status              VARCHAR(20) NOT NULL DEFAULT 'success'
                             CHECK (row_status IN ('success','needs_review','failed')),
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (evaluation_run_id, bid_id)
);

CREATE INDEX IF NOT EXISTS idx_bid_evaluations_run ON public.bid_evaluations(evaluation_run_id);
