'use client';

import { useEffect, useRef, useState } from 'react';

interface SemanticRelevance {
  raw: number;
  normalized: number;
}

interface LlmSubscores {
  clarity_score: number;
  clarity_justification: string;
  completeness_score: number;
  completeness_justification: string;
  feasibility_score: number;
  feasibility_justification: string;
  risk_flags: string[];
  risk_justification: string;
}

interface BidEvaluationResult {
  id: number;
  evaluation_run_id: number;
  bid_id: number;
  vendor_name: string | null;
  financial_score: number | null;
  financial_note: string | null;
  is_low_outlier: boolean;
  document_score: number | null;
  missing_documents: string[];
  semantic_relevance_score: SemanticRelevance | null;
  llm_subscores: LlmSubscores | null;
  composite_score: number | null;
  row_status: 'success' | 'needs_review' | 'failed';
  created_at: string | null;
}

interface EvaluationRun {
  id: number;
  tender_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  model_name: string | null;
  model_version: string | null;
  prompt_version: string | null;
  weight_config: Record<string, number>;
  error_message: string | null;
  completed_at: string | null;
}

interface EvaluationRunWithResults {
  run: EvaluationRun;
  results: BidEvaluationResult[];
}

const POLL_INTERVAL_MS = 4000;

export default function BidEvaluationPanel({ tenderId, bidsCount }: { tenderId: string; bidsCount: number }) {
  const [data, setData] = useState<EvaluationRunWithResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedBidId, setExpandedBidId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const fetchLatest = async () => {
    try {
      const res = await fetch(`/api/bids/buyer/tender/${tenderId}/evaluation-runs/latest`);
      if (res.status === 404) {
        setData(null);
        stopPolling();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch evaluation status');
      const result: EvaluationRunWithResults = await res.json();
      setData(result);
      if (result.run.status === 'pending' || result.run.status === 'running') {
        startPolling();
      } else {
        stopPolling();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load evaluation status');
      stopPolling();
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(fetchLatest, POLL_INTERVAL_MS);
  };

  useEffect(() => {
    fetchLatest();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  const handleEvaluate = async () => {
    setTriggering(true);
    setError(null);
    try {
      const res = await fetch(`/api/bids/buyer/tender/${tenderId}/evaluate`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to start evaluation');
      }
      await fetchLatest();
    } catch (err: any) {
      setError(err.message || 'Failed to start evaluation');
    } finally {
      setTriggering(false);
    }
  };

  const run = data?.run;
  const results = data?.results || [];
  const isActive = run?.status === 'pending' || run?.status === 'running';

  return (
    <div className="mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Smart Bid Evaluation</h2>
          <p className="text-slate-400 text-xs">
            Financial 20% · Documents 20% · Semantic Relevance 5% · LLM Rubric 55%
          </p>
        </div>
        <button
          onClick={handleEvaluate}
          disabled={triggering || isActive || bidsCount === 0}
          className="px-5 py-2.5 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
        >
          {isActive ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Evaluating...
            </>
          ) : run ? (
            '🔄 Re-run Evaluation'
          ) : (
            '🧠 Evaluate Bids'
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs mb-4">{error}</div>
      )}

      {loading ? (
        <div className="bg-white/5 rounded-2xl p-10 text-center border border-white/10">
          <p className="text-slate-400 font-medium text-sm">Loading evaluation status...</p>
        </div>
      ) : !run ? (
        <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
          <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-slate-300 font-medium">
            {bidsCount === 0 ? 'No bids submitted yet — nothing to evaluate.' : 'No evaluation run yet.'}
          </p>
          {bidsCount > 0 && (
            <p className="text-slate-400 text-xs mt-1">Click "Evaluate Bids" to score all {bidsCount} bids with AI.</p>
          )}
        </div>
      ) : isActive ? (
        <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
          <svg className="animate-spin h-8 w-8 text-accent-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-300 font-medium">Evaluating {bidsCount} bids... this can take a minute.</p>
        </div>
      ) : (
        <>
          {run.status === 'partial' && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs mb-4">
              Some bids could not be scored by the LLM after retries and need manual review.
            </div>
          )}
          {run.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs mb-4">
              Evaluation failed{run.error_message ? `: ${run.error_message}` : '.'} Click "Re-run Evaluation" to try again.
            </div>
          )}

          <div className="space-y-4">
            {results.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h3 className="text-base font-bold text-navy-900">{r.vendor_name || 'Vendor'}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {r.missing_documents.length > 0 && (
                        <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-full">
                          ⚠ Incomplete Documents ({r.missing_documents.length})
                        </span>
                      )}
                      {r.is_low_outlier && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-full">
                          Potentially Low Bid
                        </span>
                      )}
                      {r.row_status === 'needs_review' && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-full">
                          Needs Review
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {r.composite_score !== null ? (
                      <>
                        <div className="text-3xl font-black text-navy-900">{r.composite_score.toFixed(1)}</div>
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Composite Score</div>
                      </>
                    ) : (
                      <div className="text-sm font-bold text-amber-700">Pending Review</div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Financial</div>
                    <div className="text-sm font-bold text-navy-900">{r.financial_score?.toFixed(1) ?? '—'}</div>
                    {r.financial_note && <div className="text-[10px] text-slate-500 mt-0.5">{r.financial_note}</div>}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Documents</div>
                    <div className="text-sm font-bold text-navy-900">{r.document_score?.toFixed(1) ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Relevance</div>
                    <div className="text-sm font-bold text-navy-900">
                      {r.semantic_relevance_score?.normalized.toFixed(1) ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">LLM Rubric</div>
                    <div className="text-sm font-bold text-navy-900">
                      {r.llm_subscores
                        ? (
                            (r.llm_subscores.clarity_score + r.llm_subscores.completeness_score + r.llm_subscores.feasibility_score) / 3
                          ).toFixed(1)
                        : '—'}
                    </div>
                  </div>
                </div>

                {r.llm_subscores && (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedBidId(expandedBidId === r.bid_id ? null : r.bid_id)}
                      className="text-xs font-semibold text-accent-600 hover:text-accent-700"
                    >
                      {expandedBidId === r.bid_id ? 'Hide' : 'Show'} LLM rubric details ▾
                    </button>
                    {expandedBidId === r.bid_id && (
                      <div className="mt-3 space-y-2 text-xs bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div>
                          <strong className="text-navy-900">Clarity ({r.llm_subscores.clarity_score}):</strong>{' '}
                          <span className="text-slate-600">{r.llm_subscores.clarity_justification}</span>
                        </div>
                        <div>
                          <strong className="text-navy-900">Completeness ({r.llm_subscores.completeness_score}):</strong>{' '}
                          <span className="text-slate-600">{r.llm_subscores.completeness_justification}</span>
                        </div>
                        <div>
                          <strong className="text-navy-900">Feasibility ({r.llm_subscores.feasibility_score}):</strong>{' '}
                          <span className="text-slate-600">{r.llm_subscores.feasibility_justification}</span>
                        </div>
                        {r.llm_subscores.risk_flags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {r.llm_subscores.risk_flags.map((flag, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold rounded-full">
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
