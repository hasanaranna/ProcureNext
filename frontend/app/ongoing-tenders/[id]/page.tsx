'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface TenderDocument {
  tender_doc_id: number;
  file_name: string | null;
  file_path: string | null;
  uploaded_at: string | null;
}

interface BidDocument {
  bid_doc_id: number;
  file_path: string | null;
  document_type: string;
}

interface OngoingTenderDetail {
  award_id: number;
  tender_id: number;
  tender_title: string;
  tender_description: string;
  tender_status: string;
  budget_min: number | null;
  budget_max: number | null;
  submission_deadline: string | null;
  tender_public_date: string | null;
  pre_bid_meeting: string | null;
  tender_opening_date: string | null;
  tender_created_at: string | null;
  awarded_at: string | null;
  remarks: string | null;
  winning_bid_id: number;
  winning_bid_amount: number | null;
  winning_bid_description: string | null;
  winning_bid_submitted_at: string | null;
  buyer_org_id: number;
  buyer_org_name: string;
  buyer_org_address: string | null;
  buyer_org_website: string | null;
  vendor_org_id: number;
  vendor_org_name: string;
  vendor_org_address: string | null;
  vendor_org_website: string | null;
  role_in_tender: 'buyer' | 'vendor' | null;
  contract_id?: number;
  contract_status?: string;
  tender_documents: TenderDocument[];
  bid_documents: BidDocument[];
}

export default function OngoingTenderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenderId = params.id as string;

  const [tender, setTender] = useState<OngoingTenderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mutual Reviews & Contract Completion State
  const [contractStatus, setContractStatus] = useState<string>('Active');
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [completingContract, setCompletingContract] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [overallRating, setOverallRating] = useState(5);
  const [qualityScore, setQualityScore] = useState(5);
  const [timelinessScore, setTimelinessScore] = useState(5);
  const [communicationScore, setCommunicationScore] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!tenderId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tenders/ongoing/${tenderId}`);
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to load ongoing tender details or access denied');
        }
        const data = await res.json();
        setTender(data);
        if (data.contract_status) {
          setContractStatus(data.contract_status);
        }
        if (data.contract_id) {
          fetchReviews(data.contract_id);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading ongoing tender');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [tenderId, router]);

  const fetchReviews = async (cid: number) => {
    try {
      setLoadingReviews(true);
      const res = await fetch(`/api/contracts/${cid}/reviews`);
      if (res.ok) {
        const d = await res.json();
        setReviews(d.reviews || []);
      }
    } catch (e) {
      console.error('Failed to load reviews:', e);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleCompleteContract = async () => {
    if (!tender?.contract_id) return;
    try {
      setCompletingContract(true);
      const res = await fetch(`/api/contracts/${tender.contract_id}/complete`, {
        method: 'POST',
      });
      if (res.ok) {
        setContractStatus('Completed');
        setReviewSuccess('Contract marked as Completed. Both parties may now submit performance reviews.');
        setTimeout(() => setReviewSuccess(null), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || 'Failed to complete contract');
      }
    } catch (e: any) {
      alert(e.message || 'Error completing contract');
    } finally {
      setCompletingContract(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tender?.contract_id) return;
    setReviewError(null);
    setSubmittingReview(true);

    try {
      const res = await fetch(`/api/contracts/${tender.contract_id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall_rating: overallRating,
          quality_score: qualityScore,
          timeliness_score: timelinessScore,
          communication_score: communicationScore,
          review_text: reviewText.trim()
        }),
      });

      if (res.ok) {
        setReviewSuccess('Review submitted successfully! Thank you for rating.');
        setShowReviewModal(false);
        setReviewText('');
        fetchReviews(tender.contract_id);
        setTimeout(() => setReviewSuccess(null), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setReviewError(err.detail || 'Failed to submit review');
      }
    } catch (e: any) {
      setReviewError(e.message || 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleViewTenderDoc = async (docId: number) => {
    try {
      const res = await fetch(`/api/tenders/documents/${docId}/view`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.open(data.url, '_blank');
      }
    } catch (e) {
      console.error('Failed to view tender document', e);
    }
  };

  const handleViewBidDoc = async (docId: number) => {
    try {
      const res = await fetch(`/api/bids/documents/${docId}/view`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.open(data.url, '_blank');
      }
    } catch (e) {
      console.error('Failed to view bid document', e);
    }
  };

  if (loading) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-accent-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-300 text-lg font-medium">Loading ongoing tender details...</p>
        </div>
      </main>
    );
  }

  if (error || !tender) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-400 text-lg font-medium text-center max-w-md">{error || 'Tender not found'}</p>
        <button
          onClick={() => router.push('/ongoing-tenders')}
          className="px-6 py-2.5 bg-white text-navy-900 font-semibold rounded-xl hover:bg-slate-100 transition shadow-lg"
        >
          Back to Ongoing Tenders
        </button>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Navigation */}
        <button
          onClick={() => router.push('/ongoing-tenders')}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">Back to Ongoing Tenders</span>
        </button>

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-navy-900 via-navy-850 to-navy-800 p-8 text-white">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-white/10 text-slate-300 rounded-lg text-xs font-mono font-bold">
                  Tender #{tender.tender_id}
                </span>
                {contractStatus === 'Completed' ? (
                  <span className="px-3 py-1 bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-300" />
                    Contract Completed
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Awarded & Active
                  </span>
                )}
                <span className="px-3 py-1 bg-accent-500/20 text-accent-300 border border-accent-500/30 rounded-lg text-xs font-bold">
                  Award ID: #{tender.award_id}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Awarded on: <strong>{formatDate(tender.awarded_at)}</strong>
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black mb-3 leading-tight">{tender.tender_title}</h1>
            <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">{tender.tender_description}</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50 border-t border-slate-200">
            <div className="p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contract / Award Value</p>
              <p className="text-2xl font-black text-emerald-600">
                ৳ {tender.winning_bid_amount?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Budget</p>
              <p className="text-lg font-bold text-navy-900">
                ৳ {tender.budget_min?.toLocaleString() || 'N/A'} - {tender.budget_max?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Submission Deadline</p>
              <p className="text-lg font-bold text-navy-900">{formatDate(tender.submission_deadline)}</p>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Role</p>
              <p className="text-lg font-black capitalize text-accent-700">
                {tender.role_in_tender === 'buyer' ? '🛒 Buyer (Issuer)' : '🏪 Winning Vendor'}
              </p>
            </div>
          </div>
        </div>

        {/* Lifecycle / Progress Timeline */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 mb-8">
          <h2 className="text-lg font-black text-navy-900 mb-6 flex items-center gap-2">
            <span>Procurement Lifecycle & Progress</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  ✓
                </span>
                <h4 className="font-bold text-emerald-900 text-sm">1. Published</h4>
              </div>
              <p className="text-xs text-emerald-700">Tender created & bidding opened</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  ✓
                </span>
                <h4 className="font-bold text-emerald-900 text-sm">2. Evaluated</h4>
              </div>
              <p className="text-xs text-emerald-700">Proposals reviewed & scored</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                  ✓
                </span>
                <h4 className="font-bold text-emerald-900 text-sm">3. Bid Accepted</h4>
              </div>
              <p className="text-xs text-emerald-700">Award recorded in database</p>
            </div>

            {contractStatus === 'Completed' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 relative shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                    ✓
                  </span>
                  <h4 className="font-bold text-emerald-900 text-sm">4. Contract Completed</h4>
                </div>
                <p className="text-xs text-emerald-700">Fulfillment finalized & reviews unlocked</p>
              </div>
            ) : (
              <div className="bg-accent-50 border-2 border-accent-400 rounded-2xl p-4 relative shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-6 h-6 rounded-full bg-accent-600 text-white text-xs font-bold flex items-center justify-center animate-spin">
                    ⚙
                  </span>
                  <h4 className="font-bold text-accent-900 text-sm">4. Contract Ongoing</h4>
                </div>
                <p className="text-xs text-accent-700">Fulfillment & milestone execution</p>
              </div>
            )}
          </div>
        </div>

        {/* Counterpart Organizations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Buyer Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-700 flex items-center justify-center text-xl font-bold">
                🛒
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Buyer Organization</p>
                <h3 className="text-lg font-black text-navy-900">{tender.buyer_org_name}</h3>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <strong className="text-slate-700">Address:</strong> {tender.buyer_org_address || 'Not specified'}
              </p>
              {tender.buyer_org_website && (
                <p>
                  <strong className="text-slate-700">Website:</strong>{' '}
                  <a
                    href={tender.buyer_org_website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-600 hover:underline"
                  >
                    {tender.buyer_org_website}
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Vendor Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center text-xl font-bold">
                🏆
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase">Winning Vendor</p>
                <h3 className="text-lg font-black text-navy-900">{tender.vendor_org_name}</h3>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <strong className="text-slate-700">Address:</strong> {tender.vendor_org_address || 'Not specified'}
              </p>
              {tender.vendor_org_website && (
                <p>
                  <strong className="text-slate-700">Website:</strong>{' '}
                  <a
                    href={tender.vendor_org_website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-600 hover:underline"
                  >
                    {tender.vendor_org_website}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Contract Performance & Mutual Reviews (Custom Extension) ───────────── */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">⭐</span>
                <h3 className="text-lg font-black text-navy-900">Contract Lifecycle & Mutual Reviews</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  contractStatus === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {contractStatus === 'Completed' ? '✓ Completed' : '⚡ Active Contract'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Bidirectional 1–5 star reviews upon contract completion. Enforces verified counterparty accountability.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {contractStatus !== 'Completed' && tender.role_in_tender === 'buyer' && (
                <button
                  onClick={handleCompleteContract}
                  disabled={completingContract}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {completingContract ? 'Marking Complete...' : '✓ Mark Contract Completed'}
                </button>
              )}

              {contractStatus === 'Completed' && (
                <button
                  onClick={() => {
                    setReviewError(null);
                    setShowReviewModal(true);
                  }}
                  className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <span>⭐</span> Submit Mutual Review
                </button>
              )}
            </div>
          </div>

          {reviewSuccess && (
            <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <span>✓</span> {reviewSuccess}
            </div>
          )}

          {contractStatus !== 'Completed' && (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs text-slate-600">
              <span className="text-lg">ℹ️</span>
              <span>
                This contract is currently in <strong>Active</strong> progress. Once deliverables are delivered and approved, the Buyer can mark the contract as <strong>Completed</strong> to unlock reciprocal 1–5 star ratings.
              </span>
            </div>
          )}

          {/* Submitted Reviews List */}
          <div className="mt-6 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recorded Counterparty Reviews ({reviews.length})
            </h4>

            {loadingReviews ? (
              <p className="text-xs text-slate-400">Loading mutual reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No reviews submitted yet for this contract.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reviews.map((rev) => (
                  <div key={rev.review_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm">
                        {'★'.repeat(rev.overall_rating)}{'☆'.repeat(5 - rev.overall_rating)}
                        <span className="text-navy-900 text-xs ml-1">({rev.overall_rating}/5.0)</span>
                      </div>
                      <span className="px-2 py-0.5 bg-white border border-slate-200 text-[10px] font-bold text-slate-600 rounded-md">
                        {rev.party_role === 'BuyerToSeller' ? '🛒 Buyer → Seller' : '🏪 Seller → Buyer'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {rev.quality_score && (
                        <span className="px-2 py-0.5 bg-white border rounded text-slate-600">
                          Quality: {rev.quality_score}/5
                        </span>
                      )}
                      {rev.timeliness_score && (
                        <span className="px-2 py-0.5 bg-white border rounded text-slate-600">
                          Timeliness: {rev.timeliness_score}/5
                        </span>
                      )}
                      {rev.communication_score && (
                        <span className="px-2 py-0.5 bg-white border rounded text-slate-600">
                          Communication: {rev.communication_score}/5
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                      &quot;{rev.review_text}&quot;
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Reviewed on {formatDate(rev.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Winning Proposal & Award Remarks */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 mb-8">
          <h3 className="text-lg font-black text-navy-900 mb-4">Winning Bid Proposal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Proposal Summary</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {tender.winning_bid_description || 'No specific proposal text provided.'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Award Remarks</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {tender.remarks || 'Tender awarded upon bid acceptance.'}
              </p>
            </div>
          </div>
        </div>

        {/* Documents Hub */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 mb-8">
          <h3 className="text-lg font-black text-navy-900 mb-6">Contract & Associated Documents</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tender Docs */}
            <div>
              <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">
                Tender Specifications & Attachments ({tender.tender_documents.length})
              </h4>
              {tender.tender_documents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No files attached to tender specification.</p>
              ) : (
                <div className="space-y-2">
                  {tender.tender_documents.map((doc) => (
                    <div
                      key={doc.tender_doc_id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                        </svg>
                        <span className="text-sm font-semibold text-navy-900 truncate">
                          {doc.file_name || 'Tender Document'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleViewTenderDoc(doc.tender_doc_id)}
                        className="text-xs font-bold text-accent-600 hover:text-accent-700 px-3 py-1.5 rounded-lg bg-accent-50 hover:bg-accent-100 transition flex-shrink-0"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Winning Bid Docs */}
            <div>
              <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-3">
                Winning Vendor Documents ({tender.bid_documents.length})
              </h4>
              {tender.bid_documents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No uploaded bid documents for this proposal.</p>
              ) : (
                <div className="space-y-2">
                  {tender.bid_documents.map((doc) => (
                    <div
                      key={doc.bid_doc_id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className="w-5 h-5 text-accent-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                        </svg>
                        <span className="text-sm font-semibold text-navy-900 truncate">{doc.document_type}</span>
                      </div>
                      <button
                        onClick={() => handleViewBidDoc(doc.bid_doc_id)}
                        className="text-xs font-bold text-accent-600 hover:text-accent-700 px-3 py-1.5 rounded-lg bg-accent-50 hover:bg-accent-100 transition flex-shrink-0"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <h3 className="text-lg font-black text-navy-900 flex items-center gap-2">
                <span>⭐</span> Submit Mutual Performance Review
              </h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-navy-900 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {reviewError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Overall Rating (1 to 5 Stars) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setOverallRating(star)}
                      className={`text-2xl transition ${
                        star <= overallRating ? 'text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-navy-900 ml-2">
                    {overallRating} of 5 Stars
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Quality (1-5)</label>
                  <select
                    value={qualityScore}
                    onChange={(e) => setQualityScore(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Timeliness (1-5)</label>
                  <select
                    value={timelinessScore}
                    onChange={(e) => setTimelinessScore(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Communication (1-5)</label>
                  <select
                    value={communicationScore}
                    onChange={(e) => setCommunicationScore(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Detailed Feedback Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={4}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Describe counterparty responsiveness, delivery quality, compliance with specifications..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-navy-900 resize-none focus:outline-none focus:ring-2 focus:ring-navy-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl transition shadow disabled:opacity-50"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
