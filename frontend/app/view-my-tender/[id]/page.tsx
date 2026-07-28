'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ModalShell from '@/components/ModalShell';

interface BidDocument {
  bid_doc_id: number;
  bid_id: number;
  file_path: string;
  document_type: string;
}

interface Bid {
  bid_id: number;
  vendor_org_id: number;
  submitted_by: number;
  tender_id: number;
  financial_amount: string;
  status: 'Draft' | 'Submitted' | 'UnderEvaluation' | 'Accepted' | 'Rejected' | 'Withdrawn';
  submitted_at: string;
  updated_at: string;
  vendor_name: string;
  documents: BidDocument[];
}

interface Tender {
  tender_id: number;
  title: string;
  description: string;
  status: string;
  budget_min: string;
  budget_max: string;
}

export default function ViewMyTenderPage() {
  const router = useRouter();
  const params = useParams();
  const tenderId = params.id as string;

  const [activeTab, setActiveTab] = useState<'bids' | 'recommended'>('bids');
  const [fadeIn, setFadeIn] = useState(true);
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!tenderId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const tenderRes = await fetch(`/api/tenders/${tenderId}/detail`);
        if (!tenderRes.ok) throw new Error('Failed to fetch tender details');
        const tenderData = await tenderRes.json();
        setTender(tenderData);

        const bidsRes = await fetch(`/api/bids/buyer/tender/${tenderId}`);
        if (!bidsRes.ok) throw new Error('Failed to fetch bids');
        const bidsData = await bidsRes.json();
        setBids(bidsData);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenderId]);

  const handleTabSwitch = (tab: 'bids' | 'recommended') => {
    if (tab === activeTab) return;
    setFadeIn(false);
    setTimeout(() => {
      setActiveTab(tab);
      setFadeIn(true);
    }, 200);
  };

  const handleViewDocument = async (docId: number) => {
    try {
      const res = await fetch(`/api/bids/documents/${docId}/view`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      }
    } catch (e) {
      console.error('Failed to view document', e);
    }
  };

  const openAcceptModal = (bid: Bid) => {
    setSelectedBid(bid);
    setIsModalOpen(true);
  };

  const handleAcceptBid = async () => {
    if (!selectedBid) return;
    setAccepting(true);
    try {
      const res = await fetch(`/api/bids/buyer/${selectedBid.bid_id}/accept`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to accept bid');
      }
      
      setBids(prevBids => 
        prevBids.map(b => 
          b.bid_id === selectedBid.bid_id 
            ? { ...b, status: 'Accepted' } 
            : { ...b, status: 'Rejected' }
        )
      );
      if (tender) {
        setTender({ ...tender, status: 'Awarded' });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const hasAcceptedBid = bids.some(b => b.status === 'Accepted');
  const isTenderClosed = tender?.status === 'Awarded' || tender?.status === 'Closed' || tender?.status === 'Cancelled';

  if (loading) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-accent-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-300 text-lg font-medium">Loading tender details...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-400 text-lg font-medium">{error}</p>
        <button onClick={() => router.push('/home')} className="px-6 py-2.5 bg-white text-navy-900 font-semibold rounded-xl hover:bg-slate-100 transition shadow-lg">
          Back to Dashboard
        </button>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Back Button */}
        <button onClick={() => router.push('/home')}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">Back to Dashboard</span>
        </button>

        {/* Tender Details Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-8 py-6">
            <div className="flex justify-between items-start">
              <h1 className="text-2xl font-black text-white">{tender?.title}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                tender?.status === 'Awarded' ? 'bg-emerald-400/20 text-emerald-300' : 
                tender?.status === 'Published' ? 'bg-accent-400/20 text-accent-300' : 'bg-white/10 text-white'
              }`}>
                {tender?.status}
              </span>
            </div>
          </div>
          <div className="px-8 py-5">
            <p className="text-slate-600 text-sm leading-relaxed">{tender?.description}</p>
          </div>
        </div>

        {/* Toggle Capsule */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full p-1 flex items-center gap-1 bg-navy-900/80 border border-white/10 shadow-lg">
            <button
              onClick={() => handleTabSwitch('bids')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === 'bids' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              View Bids from Sellers
            </button>
            <button
              onClick={() => handleTabSwitch('recommended')}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === 'recommended' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Recommended Sellers
            </button>
          </div>
        </div>

        {/* Tab Content with Fade */}
        <div className="transition-opacity duration-200" style={{ opacity: fadeIn ? 1 : 0 }}>
          {activeTab === 'bids' ? (
            <div className="mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Vendor Bids</h2>
                  <p className="text-slate-400 text-sm">{bids.length} vendors have placed bids on this tender</p>
                </div>
              </div>

              {bids.length === 0 ? (
                <div className="bg-white/5 rounded-2xl p-10 text-center border border-white/10">
                  <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-slate-400 font-medium">No bids have been submitted yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {bids.map((bid) => (
                    <div
                      key={bid.bid_id}
                      className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 hover:shadow-xl relative overflow-hidden ${
                        bid.status === 'Accepted' ? 'border-emerald-400' : 'border-slate-200 hover:border-accent-200'
                      }`}
                    >
                      {bid.status === 'Accepted' && (
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-emerald-600 text-white text-xs font-bold px-5 py-1.5 rounded-bl-xl shadow-md">
                          ✓ Winning Bid
                        </div>
                      )}
                      
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center text-white text-lg flex-shrink-0 shadow-md">
                              🏢
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-navy-900">{bid.vendor_name}</h3>
                              <p className="text-xs text-slate-400">Submitted: {new Date(bid.submitted_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="bg-navy-900 rounded-xl px-4 py-2 mt-1">
                            <span className="text-white font-bold text-sm">৳ {parseFloat(bid.financial_amount).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mb-4">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            bid.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            bid.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-accent-50 text-accent-700 border border-accent-200'
                          }`}>
                            {bid.status}
                          </span>
                        </div>

                        {/* Files Capsules */}
                        {bid.documents && bid.documents.length > 0 && (
                          <div className="mb-4 flex flex-wrap gap-2">
                            {bid.documents.map((doc) => (
                              <div key={doc.bid_doc_id} className="rounded-full px-3 py-1.5 flex items-center gap-2 border border-slate-200 bg-slate-50">
                                <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                                </svg>
                                <span className="text-xs font-medium text-navy-900">{doc.document_type}</span>
                                <button onClick={() => handleViewDocument(doc.bid_doc_id)}
                                  className="ml-1 text-accent-600 hover:text-accent-700 text-xs font-semibold transition">
                                  View
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-slate-100">
                          {bid.status === 'Accepted' ? (
                            <div className="text-emerald-600 font-semibold text-sm flex items-center gap-1">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Accepted
                            </div>
                          ) : bid.status === 'Rejected' ? (
                            <div className="text-red-500 font-semibold text-sm">Rejected</div>
                          ) : (
                            <button
                              onClick={() => openAcceptModal(bid)}
                              disabled={hasAcceptedBid || isTenderClosed}
                              className={`px-6 py-2 rounded-xl text-white font-semibold text-sm transition-all duration-300 ${
                                hasAcceptedBid || isTenderClosed
                                  ? 'bg-slate-300 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-navy-900 to-navy-800 hover:from-navy-800 hover:to-navy-700 shadow-lg hover:shadow-xl hover:scale-[1.02]'
                              }`}
                            >
                              Accept Bid
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-slate-500 text-xs text-center mb-6 italic">
                These are our smart recommendations for your current tender. They have performed similar works before or are related to your tender.
              </p>
              <div className="bg-white/5 rounded-2xl p-10 text-center border border-white/10">
                <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-slate-400 font-medium">AI recommendations will appear here based on tender requirements.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ModalShell
        isOpen={isModalOpen}
        onClose={() => !accepting && setIsModalOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="p-8">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-accent-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-navy-900 mb-2 text-center">Confirm Bid Acceptance</h3>
          <p className="text-slate-600 mb-6 text-center text-sm">
            Are you sure you want to award this tender to <strong className="text-navy-900">{selectedBid?.vendor_name}</strong> for <strong className="text-navy-900">৳ {selectedBid ? parseFloat(selectedBid.financial_amount).toLocaleString() : ''}</strong>?
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <strong>Warning:</strong> Accepting this bid will automatically reject all other pending bids for this tender. This action cannot be undone.
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={accepting}
              className="px-5 py-2.5 rounded-xl text-navy-900 font-semibold hover:bg-slate-100 transition disabled:opacity-50 border border-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptBid}
              disabled={accepting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-600 to-accent-500 text-white font-bold hover:from-accent-700 hover:to-accent-600 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {accepting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Confirming...
                </>
              ) : (
                'Award Tender'
              )}
            </button>
          </div>
        </div>
      </ModalShell>
    </main>
  );
}
