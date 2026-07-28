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
        // Fetch tender details (assuming this endpoint exists based on other pages)
        const tenderRes = await fetch(`/api/tenders/${tenderId}/detail`);
        if (!tenderRes.ok) throw new Error('Failed to fetch tender details');
        const tenderData = await tenderRes.json();
        setTender(tenderData);

        // Fetch bids
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
      
      // Update local state to reflect changes
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
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center" style={{ backgroundColor: '#3a4556' }}>
        <div className="text-white text-xl">Loading tender details...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#3a4556' }}>
        <div className="text-red-400 text-xl">{error}</div>
        <button onClick={() => router.push('/home')} className="text-white underline">Back to Dashboard</button>
      </main>
    );
  }

  return (
    <main
      className="w-full min-h-screen py-10 px-4"
      style={{ backgroundColor: '#3a4556' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/home')}
          className="mb-6 flex items-center gap-2 text-gray-300 hover:text-white transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back to Dashboard</span>
        </button>

        {/* Tender Details Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
          <div className="flex justify-between items-start mb-2">
            <h1 style={{ color: '#111827' }} className="text-3xl font-bold">{tender?.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              tender?.status === 'Awarded' ? 'bg-green-100 text-green-800' : 
              tender?.status === 'Published' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {tender?.status}
            </span>
          </div>
          <p style={{ color: '#6b7280' }} className="text-lg mb-6">{tender?.description}</p>
        </div>

        {/* Toggle Capsule */}
        <div className="mb-6 flex justify-center">
          <div style={{ backgroundColor: '#3a4556', border: '2px solid #4a5668' }} className="rounded-full p-1 flex items-center gap-1">
            <button
              onClick={() => handleTabSwitch('bids')}
              className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeTab === 'bids' ? '#ffffff' : 'transparent',
                color: activeTab === 'bids' ? '#1f2937' : '#d1d5db',
              }}
            >
              View Bids from Sellers
            </button>
            <button
              onClick={() => handleTabSwitch('recommended')}
              className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeTab === 'recommended' ? '#ffffff' : 'transparent',
                color: activeTab === 'recommended' ? '#1f2937' : '#d1d5db',
              }}
            >
              Recommended Sellers
            </button>
          </div>
        </div>

        {/* Tab Content with Fade */}
        <div
          className="transition-opacity duration-200"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          {activeTab === 'bids' ? (
            /* Bids Section */
            <div className="mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Vendor Bids</h2>
                  <p className="text-gray-300 text-sm">{bids.length} vendors have placed bids on this tender</p>
                </div>
              </div>

              {bids.length === 0 ? (
                <div className="bg-white/10 rounded-xl p-8 text-center text-gray-300">
                  No bids have been submitted yet.
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {bids.map((bid) => (
                    <div
                      key={bid.bid_id}
                      className={`bg-white rounded-2xl shadow-lg p-6 border ${
                        bid.status === 'Accepted' ? 'border-green-500 border-2' : 'border-gray-200'
                      } hover:shadow-xl transition relative overflow-hidden`}
                    >
                      {bid.status === 'Accepted' && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                          Winning Bid
                        </div>
                      )}
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div style={{ backgroundColor: '#d1d5db' }} className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                            🏢
                          </div>
                          <div>
                            <h3 style={{ color: '#111827' }} className="text-lg font-bold">{bid.vendor_name}</h3>
                            <p className="text-xs text-gray-500">Submitted: {new Date(bid.submitted_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#374151' }} className="rounded-full px-4 py-1 mt-1">
                          <span className="text-white font-bold text-sm">৳ {parseFloat(bid.financial_amount).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mb-4">
                         <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                           bid.status === 'Accepted' ? 'bg-green-100 text-green-700' :
                           bid.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                           'bg-blue-100 text-blue-700'
                         }`}>
                           {bid.status}
                         </span>
                      </div>

                      {/* Files Capsules */}
                      {bid.documents && bid.documents.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {bid.documents.map((doc) => (
                            <div key={doc.bid_doc_id} style={{ backgroundColor: '#f3f4f6' }} className="rounded-full px-3 py-1 flex items-center gap-2 border border-gray-300">
                              <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                              </svg>
                              <span style={{ color: '#374151' }} className="text-xs font-medium">{doc.document_type}</span>
                              <button 
                                onClick={() => handleViewDocument(doc.bid_doc_id)}
                                className="ml-1 text-blue-600 hover:text-blue-800 text-xs font-semibold"
                              >
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-100">
                        {bid.status === 'Accepted' ? (
                          <div className="text-green-600 font-semibold text-sm flex items-center gap-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Accepted
                          </div>
                        ) : bid.status === 'Rejected' ? (
                          <div className="text-red-500 font-semibold text-sm">
                            Rejected
                          </div>
                        ) : (
                          <button
                            onClick={() => openAcceptModal(bid)}
                            disabled={hasAcceptedBid || isTenderClosed}
                            style={{ 
                              background: (hasAcceptedBid || isTenderClosed) ? '#9ca3af' : 'linear-gradient(135deg, #4a5668 0%, #3a4556 100%)',
                              cursor: (hasAcceptedBid || isTenderClosed) ? 'not-allowed' : 'pointer'
                            }}
                            className="px-6 py-2 rounded-full text-white font-semibold text-sm hover:opacity-90 transition"
                          >
                            Accept Bid
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Recommended Sellers Section - Kept static for now */
            <div className="mb-6">
              <p className="text-gray-400 text-xs text-center mb-6 italic">
                These are our smart recommendations for your current tender. They have performed similar works before or are related to your tender.
              </p>
              <div className="bg-white/10 rounded-xl p-8 text-center text-gray-300">
                AI recommendations will appear here based on tender requirements.
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
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Bid Acceptance</h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to award this tender to <strong>{selectedBid?.vendor_name}</strong> for <strong>৳ {selectedBid ? parseFloat(selectedBid.financial_amount).toLocaleString() : ''}</strong>?
          </p>
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg text-sm mb-6">
            <strong>Warning:</strong> Accepting this bid will automatically reject all other pending bids for this tender. This action cannot be undone.
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={accepting}
              className="px-4 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptBid}
              disabled={accepting}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
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
