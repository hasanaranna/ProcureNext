'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ModalShell from '@/components/ModalShell';

interface BidDocument {
  bid_doc_id: number;
  bid_id: number;
  file_path: string;
  document_type: string;
  req_doc_id?: number | null;
}

interface BidSecurity {
  security_id: number;
  security_amount: number | null;
  security_type: string | null;
  bid_security_doc_path: string | null;
  valid_until: string | null;
}

interface ComplianceMatrixItem {
  req_doc_id: number;
  custom_doc_name: string;
  is_mandatory: boolean;
  is_submitted: boolean;
  bid_doc_id: number | null;
  file_path: string | null;
}

interface EvaluatedBid {
  bid_id: number;
  vendor_org_id: number;
  submitted_by: number;
  tender_id: number;
  financial_amount: number | null;
  description: string | null;
  status: 'Draft' | 'Submitted' | 'UnderEvaluation' | 'Accepted' | 'Rejected' | 'Withdrawn';
  submitted_at: string;
  updated_at: string;
  vendor_name: string;
  vendor_address?: string | null;
  vendor_website?: string | null;
  vendor_verification_status?: string | null;
  vendor_rating: number;
  total_ratings_count: number;
  completed_contracts_count: number;
  is_enlisted: boolean;
  budget_variance_pct: number | null;
  avg_variance_pct: number | null;
  is_lowest_bid: boolean;
  compliance_score_pct: number;
  mandatory_docs_satisfied: boolean;
  documents: BidDocument[];
  compliance_matrix: ComplianceMatrixItem[];
  securities: BidSecurity[];
}

interface BidComparisonSummary {
  total_bids: number;
  min_amount: number | null;
  max_amount: number | null;
  avg_amount: number | null;
  budget_min: number | null;
  budget_max: number | null;
  lowest_bid_id: number | null;
  fully_compliant_bids_count: number;
}

interface TenderComparisonData {
  tender_id: number;
  tender_title: string;
  tender_status: string;
  budget_min: number | null;
  budget_max: number | null;
  required_documents: RequiredDocument[];
  summary: BidComparisonSummary;
  bids: EvaluatedBid[];
}

const ALL_ROLES = ["Owner", "ProcurementOfficer", "Finance", "Viewer", "TenderReceiver"] as const;
const ROLE_LABELS: Record<string, string> = {
  Owner: "Owner",
  ProcurementOfficer: "Procurement Officer",
  Finance: "Finance",
  Viewer: "Viewer",
  TenderReceiver: "Tender Receiver",
};

interface RequiredDocument {
  req_doc_id: number;
  custom_doc_name: string | null;
  is_mandatory: boolean;
  allowed_roles: string[];
}

interface Tender {
  tender_id: number;
  title: string;
  description: string;
  status: string;
  budget_min: string;
  budget_max: string;
  required_documents?: RequiredDocument[];
}

export default function ViewMyTenderPage() {
  const router = useRouter();
  const params = useParams();
  const tenderId = params.id as string;

  const [activeTab, setActiveTab] = useState<'bids' | 'compare' | 'recommended'>('bids');
  const [fadeIn, setFadeIn] = useState(true);
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [comparisonData, setComparisonData] = useState<TenderComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedBid, setSelectedBid] = useState<EvaluatedBid | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const [showManageAccess, setShowManageAccess] = useState(false);
  const [reqDocs, setReqDocs] = useState<RequiredDocument[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Comparison Matrix Interactive State
  const [filterMode, setFilterMode] = useState<'all' | 'compliant' | 'enlisted'>('all');
  const [sortMode, setSortMode] = useState<'price_asc' | 'price_desc' | 'rating_desc' | 'compliance_desc' | 'date_desc'>('price_asc');
  const [pinnedBidIds, setPinnedBidIds] = useState<number[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!tenderId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [tenderRes, compareRes] = await Promise.all([
          fetch(`/api/tenders/${tenderId}/detail`),
          fetch(`/api/bids/buyer/tender/${tenderId}/compare`)
        ]);

        if (!tenderRes.ok) throw new Error('Failed to fetch tender details');
        const tenderData = await tenderRes.json();
        setTender(tenderData);
        setReqDocs(tenderData.required_documents || []);

        if (compareRes.ok) {
          const compData: TenderComparisonData = await compareRes.json();
          setComparisonData(compData);
          setPinnedBidIds(compData.bids.map((b) => b.bid_id));
        } else {
          // Fallback if compare endpoint fails
          const fallbackRes = await fetch(`/api/bids/buyer/tender/${tenderId}`);
          if (fallbackRes.ok) {
            const rawBids = await fallbackRes.json();
            const fallbackCompData: TenderComparisonData = {
              tender_id: tenderData.tender_id,
              tender_title: tenderData.title,
              tender_status: tenderData.status,
              budget_min: parseFloat(tenderData.budget_min) || null,
              budget_max: parseFloat(tenderData.budget_max) || null,
              required_documents: tenderData.required_documents || [],
              summary: {
                total_bids: rawBids.length,
                min_amount: rawBids.length ? Math.min(...rawBids.map((b: any) => parseFloat(b.financial_amount) || 0)) : null,
                max_amount: rawBids.length ? Math.max(...rawBids.map((b: any) => parseFloat(b.financial_amount) || 0)) : null,
                avg_amount: rawBids.length ? rawBids.reduce((acc: number, b: any) => acc + (parseFloat(b.financial_amount) || 0), 0) / rawBids.length : null,
                budget_min: parseFloat(tenderData.budget_min) || null,
                budget_max: parseFloat(tenderData.budget_max) || null,
                lowest_bid_id: rawBids[0]?.bid_id || null,
                fully_compliant_bids_count: rawBids.length,
              },
              bids: rawBids.map((b: any) => ({
                ...b,
                financial_amount: parseFloat(b.financial_amount) || 0,
                vendor_rating: 4.5,
                total_ratings_count: 0,
                completed_contracts_count: 0,
                is_enlisted: false,
                budget_variance_pct: 0,
                avg_variance_pct: 0,
                is_lowest_bid: false,
                compliance_score_pct: 100,
                mandatory_docs_satisfied: true,
                compliance_matrix: [],
                securities: [],
              })),
            };
            setComparisonData(fallbackCompData);
            setPinnedBidIds(fallbackCompData.bids.map((b) => b.bid_id));
          }
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenderId]);

  const bids = comparisonData?.bids || [];
  const summary = comparisonData?.summary;

  const toggleRole = (reqDocId: number, role: string) => {
    if (role === "Owner") return;
    setReqDocs((prev) =>
      prev.map((doc) => {
        if (doc.req_doc_id === reqDocId) {
          const roles = doc.allowed_roles || ["Owner"];
          const updatedRoles = roles.includes(role)
            ? roles.filter((r) => r !== role)
            : [...roles, role];
          return { ...doc, allowed_roles: updatedRoles };
        }
        return doc;
      })
    );
  };

  const handleCancelAccess = () => {
    setReqDocs(tender?.required_documents || []);
    setShowManageAccess(false);
  };

  const handleSaveAccess = async () => {
    setSavingAccess(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/tenders/${tenderId}/required-documents/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documents: reqDocs.map((doc) => ({
            req_doc_id: doc.req_doc_id,
            allowed_roles: doc.allowed_roles,
          })),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to update document access");
      }
      if (tender) {
        setTender({ ...tender, required_documents: reqDocs });
      }
      setShowManageAccess(false);
    } catch (err: any) {
      alert(err.message || "Failed to update document access");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleTabSwitch = (tab: 'bids' | 'compare' | 'recommended') => {
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

  const openAcceptModal = (bid: EvaluatedBid) => {
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
      
      if (comparisonData) {
        const updatedBids = comparisonData.bids.map(b => 
          b.bid_id === selectedBid.bid_id 
            ? { ...b, status: 'Accepted' as const } 
            : { ...b, status: 'Rejected' as const }
        );
        setComparisonData({
          ...comparisonData,
          tender_status: 'Awarded',
          bids: updatedBids,
        });
      }

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

  const togglePinBid = (bidId: number) => {
    setPinnedBidIds(prev =>
      prev.includes(bidId)
        ? prev.filter(id => id !== bidId)
        : [...prev, bidId]
    );
  };

  const selectAllBids = () => {
    setPinnedBidIds(bids.map(b => b.bid_id));
  };

  const toggleDescription = (bidId: number) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [bidId]: !prev[bidId]
    }));
  };

  // Filtered and Sorted Bids for Comparison Matrix
  const displayedComparisonBids = useMemo(() => {
    let list = [...bids];

    // Filter
    if (filterMode === 'compliant') {
      list = list.filter(b => b.mandatory_docs_satisfied && b.compliance_score_pct >= 100);
    } else if (filterMode === 'enlisted') {
      list = list.filter(b => b.is_enlisted);
    }

    // Pinned Filter (if user isolated specific bids)
    if (pinnedBidIds.length > 0) {
      list = list.filter(b => pinnedBidIds.includes(b.bid_id));
    }

    // Sort
    list.sort((a, b) => {
      if (sortMode === 'price_asc') {
        return (a.financial_amount || 0) - (b.financial_amount || 0);
      }
      if (sortMode === 'price_desc') {
        return (b.financial_amount || 0) - (a.financial_amount || 0);
      }
      if (sortMode === 'rating_desc') {
        return b.vendor_rating - a.vendor_rating;
      }
      if (sortMode === 'compliance_desc') {
        return b.compliance_score_pct - a.compliance_score_pct;
      }
      if (sortMode === 'date_desc') {
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      }
      return 0;
    });

    return list;
  }, [bids, filterMode, sortMode, pinnedBidIds]);

  const hasAcceptedBid = bids.some(b => b.status === 'Accepted');
  const isTenderClosed = tender?.status === 'Awarded' || tender?.status === 'Closed' || tender?.status === 'Cancelled';

  const compliantCount = bids.filter(b => b.mandatory_docs_satisfied && b.compliance_score_pct >= 100).length;
  const enlistedCount = bids.filter(b => b.is_enlisted).length;

  if (loading) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-accent-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-300 text-lg font-medium">Loading tender comparison workbench...</p>
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
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Back Button */}
        <button onClick={() => router.push('/home')}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">Back to Dashboard</span>
        </button>

        {/* Tender Details Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-3">
          <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-white">{tender?.title}</h1>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    tender?.status === 'Awarded' ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-500/30' : 
                    tender?.status === 'Published' ? 'bg-accent-400/20 text-accent-300 border border-accent-500/30' : 'bg-white/10 text-white'
                  }`}>
                    {tender?.status}
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1">
                  Budget: <strong className="text-white">৳ {tender?.budget_min ? parseFloat(tender.budget_min).toLocaleString() : '0'}</strong> – <strong className="text-white">৳ {tender?.budget_max ? parseFloat(tender.budget_max).toLocaleString() : '0'}</strong>
                </p>
              </div>

              {bids.length > 1 && (
                <button
                  onClick={() => handleTabSwitch('compare')}
                  className="px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Compare All {bids.length} Bids
                </button>
              )}
            </div>
          </div>
          <div className="px-8 py-5">
            <p className="text-slate-600 text-sm leading-relaxed">{tender?.description}</p>
          </div>
        </div>

        {/* Awarded Banner if Tender is Awarded */}
        {(tender?.status === 'Awarded' || hasAcceptedBid) && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-5 shadow-xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
                🏆
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Tender Awarded & Ongoing</h3>
                <p className="text-emerald-100 text-xs mt-0.5">
                  Winning bid accepted. You can view contracts, fulfillment details, and counterpart information.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/ongoing-tenders/${tenderId}`)}
              className="px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs rounded-xl shadow transition-all whitespace-nowrap flex items-center gap-1.5"
            >
              View in Ongoing Tenders
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        )}

        {/* Manage Document Access Button */}
        <div className="flex justify-end mb-6">
          <button
            type="button"
            onClick={() => setShowManageAccess(!showManageAccess)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all duration-200 shadow-md ${
              showManageAccess
                ? 'bg-accent-500/20 text-accent-300 border-accent-500/40'
                : 'bg-navy-900/80 text-slate-300 border-white/10 hover:bg-navy-800 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Manage Document Access {showManageAccess ? '▲' : '▼'}
          </button>
        </div>

        {/* Expandable Document Access Panel */}
        {showManageAccess && (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Required Document Permissions</h3>
              {saveMessage && <span className="text-xs text-emerald-600 font-semibold">{saveMessage}</span>}
            </div>

            {reqDocs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No required seller documents specified for this tender.</p>
            ) : (
              <div className="space-y-3">
                {reqDocs.map((doc) => (
                  <div key={doc.req_doc_id} className="bg-slate-50 rounded-xl border border-slate-200 p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-accent-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-navy-900 font-semibold">{doc.custom_doc_name || 'Document'}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-2">Who can view this document in seller organization:</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {ALL_ROLES.map((role) => {
                        const isChecked = role === 'Owner' || (doc.allowed_roles || []).includes(role);
                        return (
                          <label key={role} className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${role === 'Owner' ? 'opacity-60' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={role === 'Owner'}
                              onChange={() => toggleRole(doc.req_doc_id, role)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-accent-600 focus:ring-accent-500 focus:ring-offset-0 disabled:opacity-60"
                            />
                            <span className="text-slate-600 font-medium">{ROLE_LABELS[role]}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleSaveAccess}
                    disabled={savingAccess}
                    className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingAccess ? 'Saving...' : 'Save Access Settings'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAccess}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-navy-900 text-xs font-semibold rounded-xl transition border border-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toggle Capsule */}
        <div className="mb-6 flex justify-center">
          <div className="rounded-full p-1 flex items-center gap-1 bg-navy-900/80 border border-white/10 shadow-lg">
            <button
              onClick={() => handleTabSwitch('bids')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'bids' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Bid Cards ({bids.length})
            </button>
            <button
              onClick={() => handleTabSwitch('compare')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'compare' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              ⚖️ Compare Bids Matrix
            </button>
            <button
              onClick={() => handleTabSwitch('recommended')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                activeTab === 'recommended' ? 'bg-white text-navy-900 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌟 Recommended Sellers
            </button>
          </div>
        </div>

        {/* Tab Content with Fade */}
        <div className="transition-opacity duration-200" style={{ opacity: fadeIn ? 1 : 0 }}>
          
          {/* ============================================================ */}
          {/* 1. LIST VIEW TAB */}
          {/* ============================================================ */}
          {activeTab === 'bids' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Vendor Proposals</h2>
                  <p className="text-slate-400 text-sm">{bids.length} vendors have placed bids on this tender</p>
                </div>
                {bids.length > 1 && (
                  <button
                    onClick={() => handleTabSwitch('compare')}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition flex items-center gap-1.5"
                  >
                    Switch to Comparison Matrix ➔
                  </button>
                )}
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
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-navy-900">{bid.vendor_name}</h3>
                                {bid.is_enlisted && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200">
                                    ⭐ Enlisted Partner
                                  </span>
                                )}
                                {bid.is_lowest_bid && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-300">
                                    🏆 Lowest Proposal
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                Submitted: {new Date(bid.submitted_at).toLocaleString()} • Rating: ⭐ {bid.vendor_rating || 0.0} ({bid.total_ratings_count || 0})
                              </p>
                            </div>
                          </div>
                          <div className="bg-navy-900 rounded-xl px-4 py-2 mt-1 text-right">
                            <span className="text-white font-bold text-sm">৳ {bid.financial_amount ? bid.financial_amount.toLocaleString() : '0'}</span>
                            {bid.budget_variance_pct !== null && bid.budget_variance_pct !== undefined && (
                              <p className={`text-[10px] font-bold ${bid.budget_variance_pct <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {bid.budget_variance_pct <= 0 ? `${bid.budget_variance_pct}% vs budget` : `+${bid.budget_variance_pct}% vs budget`}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Badge & Compliance */}
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            bid.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            bid.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-accent-50 text-accent-700 border border-accent-200'
                          }`}>
                            {bid.status}
                          </span>

                          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            bid.compliance_score_pct >= 100 && bid.mandatory_docs_satisfied
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {bid.compliance_score_pct}% Document Compliance
                          </span>
                        </div>

                        {/* Description */}
                        {bid.description && (
                          <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Proposal Description</h4>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{bid.description}</p>
                          </div>
                        )}

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
          )}

          {/* ============================================================ */}
          {/* 2. BID COMPARISON MATRIX TAB */}
          {/* ============================================================ */}
          {activeTab === 'compare' && (
            <div className="mb-8">
              {/* Summary KPIs Banner */}
              {summary && summary.total_bids > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 shadow-lg text-white">
                    <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1">Total Proposals</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-black">{summary.total_bids}</span>
                      <span className="text-xs text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                        {summary.fully_compliant_bids_count} Compliant
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-900/60 to-teal-900/60 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 shadow-lg text-white">
                    <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">Lowest Proposal</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-emerald-300">
                        ৳ {summary.min_amount ? summary.min_amount.toLocaleString() : 'N/A'}
                      </span>
                      <span className="text-xs bg-emerald-400 text-navy-950 font-bold px-2 py-0.5 rounded-full">
                        Best Price
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 shadow-lg text-white">
                    <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1">Average Proposal</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black">
                        ৳ {summary.avg_amount ? summary.avg_amount.toLocaleString() : 'N/A'}
                      </span>
                      <span className="text-xs text-slate-300">
                        Max: ৳ {summary.max_amount ? summary.max_amount.toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-5 shadow-lg text-white">
                    <p className="text-slate-300 text-xs font-semibold uppercase tracking-wider mb-1">Tender Budget Ceiling</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-accent-300">
                        ৳ {summary.budget_max ? summary.budget_max.toLocaleString() : 'N/A'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Min: ৳ {summary.budget_min ? summary.budget_min.toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Bar: Filters, Sorting, Selection */}
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase mr-1">Filter:</span>
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterMode === 'all'
                          ? 'bg-navy-900 text-white shadow'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All Proposals ({bids.length})
                    </button>
                    <button
                      onClick={() => setFilterMode('compliant')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterMode === 'compliant'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ✅ 100% Compliant ({compliantCount})
                    </button>
                    <button
                      onClick={() => setFilterMode('enlisted')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filterMode === 'enlisted'
                          ? 'bg-purple-600 text-white shadow'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ⭐ Enlisted Partners ({enlistedCount})
                    </button>
                  </div>

                  {/* Sort & Select Tools */}
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                    <div className="flex items-center gap-2">
                      <label htmlFor="bid-sort-select" className="text-xs font-bold text-slate-400 uppercase">Sort:</label>
                      <select
                        id="bid-sort-select"
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-accent-500"
                      >
                        <option value="price_asc">Price: Low to High 💰</option>
                        <option value="price_desc">Price: High to Low 📈</option>
                        <option value="rating_desc">Vendor Rating ⭐</option>
                        <option value="compliance_desc">Document Compliance 📄</option>
                        <option value="date_desc">Submission Date 🕒</option>
                      </select>
                    </div>

                    {pinnedBidIds.length < bids.length ? (
                      <button
                        onClick={selectAllBids}
                        className="text-xs font-bold text-accent-600 hover:text-accent-700 underline"
                      >
                        Reset Selection ({bids.length})
                      </button>
                    ) : null}

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-navy-900 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-200"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </button>
                  </div>
                </div>
              </div>

              {/* Matrix Layout */}
              {displayedComparisonBids.length === 0 ? (
                <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                  <p className="text-slate-300 font-semibold mb-2">No bids match the active filter criteria.</p>
                  <button
                    onClick={() => { setFilterMode('all'); selectAllBids(); }}
                    className="px-4 py-2 bg-white text-navy-900 font-bold text-xs rounded-xl hover:bg-slate-100 transition shadow"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {displayedComparisonBids.map((bid) => {
                    const isExpanded = !!expandedDescriptions[bid.bid_id];

                    return (
                      <div
                        key={bid.bid_id}
                        className={`bg-white rounded-2xl shadow-xl border-2 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                          bid.status === 'Accepted'
                            ? 'border-emerald-500 ring-4 ring-emerald-500/10'
                            : bid.is_lowest_bid
                            ? 'border-amber-400/80 ring-2 ring-amber-400/20'
                            : 'border-slate-200 hover:border-accent-400'
                        }`}
                      >
                        {/* Top Header */}
                        <div className="bg-slate-50 p-5 border-b border-slate-200">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={pinnedBidIds.includes(bid.bid_id)}
                                onChange={() => togglePinBid(bid.bid_id)}
                                title="Pin or isolate this bid in comparison"
                                className="w-4 h-4 rounded text-accent-600 focus:ring-accent-500 cursor-pointer"
                              />
                              <h3 className="text-base font-black text-navy-900 leading-tight">
                                {bid.vendor_name}
                              </h3>
                            </div>

                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full whitespace-nowrap ${
                              bid.status === 'Accepted' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              bid.status === 'Rejected' ? 'bg-red-100 text-red-800 border border-red-300' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {bid.status}
                            </span>
                          </div>

                          {/* Highlight Badges */}
                          <div className="flex flex-wrap gap-1.5">
                            {bid.is_lowest_bid && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                                🏆 Lowest Bid
                              </span>
                            )}
                            {bid.is_enlisted && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-bold rounded-md flex items-center gap-1">
                                ⭐ Enlisted Partner
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-md">
                              {bid.vendor_verification_status || 'Verified'}
                            </span>
                          </div>
                        </div>

                        {/* Main Comparison Body */}
                        <div className="p-5 flex-1 flex flex-col gap-5">
                          
                          {/* 1. Financial Dimension */}
                          <div className="bg-navy-950 text-white rounded-xl p-4 shadow">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Financial Proposal</p>
                            <div className="flex items-baseline justify-between mb-2">
                              <span className="text-2xl font-black text-white">
                                ৳ {bid.financial_amount ? bid.financial_amount.toLocaleString() : '0'}
                              </span>
                              {bid.budget_variance_pct !== null && bid.budget_variance_pct !== undefined && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  bid.budget_variance_pct <= 0 ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-400/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {bid.budget_variance_pct <= 0 ? `${bid.budget_variance_pct}% vs ceiling` : `+${bid.budget_variance_pct}% vs ceiling`}
                                </span>
                              )}
                            </div>
                            {bid.avg_variance_pct !== null && bid.avg_variance_pct !== undefined && (
                              <p className="text-[10px] text-slate-300">
                                {bid.avg_variance_pct <= 0 ? `${Math.abs(bid.avg_variance_pct)}% below average bid` : `+${bid.avg_variance_pct}% above average bid`}
                              </p>
                            )}
                          </div>

                          {/* 2. Vendor Credibility & Track Record */}
                          <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3.5">
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vendor Reputation</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400 text-[10px] block">Performance Rating</span>
                                <span className="font-bold text-navy-900 flex items-center gap-1">
                                  ⭐ {bid.vendor_rating ? bid.vendor_rating.toFixed(1) : '0.0'}
                                  <span className="text-[10px] text-slate-400 font-normal">({bid.total_ratings_count || 0})</span>
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">Completed Contracts</span>
                                <span className="font-bold text-navy-900">{bid.completed_contracts_count || 0} Contracts</span>
                              </div>
                              {bid.vendor_address && (
                                <div className="col-span-2 mt-1 text-[11px] text-slate-500 truncate">
                                  📍 {bid.vendor_address}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 3. Document Compliance Matrix */}
                          <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Document Checklist</h4>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                bid.compliance_score_pct >= 100 && bid.mandatory_docs_satisfied
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {bid.compliance_score_pct}% Compliant
                              </span>
                            </div>

                            {bid.compliance_matrix && bid.compliance_matrix.length > 0 ? (
                              <div className="space-y-1.5">
                                {bid.compliance_matrix.map((doc) => (
                                  <div key={doc.req_doc_id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200/80">
                                    <div className="flex items-center gap-1.5 truncate mr-2">
                                      {doc.is_submitted ? (
                                        <span className="text-emerald-600 font-bold flex-shrink-0">✓</span>
                                      ) : (
                                        <span className="text-red-500 font-bold flex-shrink-0">✗</span>
                                      )}
                                      <span className="text-navy-900 font-medium truncate text-[11px]">
                                        {doc.custom_doc_name}
                                        {doc.is_mandatory && <span className="text-red-500 text-[10px] ml-0.5">*</span>}
                                      </span>
                                    </div>
                                    {doc.is_submitted && doc.bid_doc_id ? (
                                      <button
                                        onClick={() => handleViewDocument(doc.bid_doc_id!)}
                                        className="text-[10px] text-accent-600 hover:text-accent-700 font-bold hover:underline whitespace-nowrap"
                                      >
                                        View ↗
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-red-500 font-semibold italic">Missing</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">No specific document requirements.</p>
                            )}
                          </div>

                          {/* 4. Bid Security & Guarantee */}
                          {bid.securities && bid.securities.length > 0 && (
                            <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3.5">
                              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bid Security</h4>
                              {bid.securities.map((sec) => (
                                <div key={sec.security_id} className="text-xs bg-white p-2.5 rounded-lg border border-slate-200">
                                  <div className="flex justify-between font-bold text-navy-900">
                                    <span>৳ {sec.security_amount ? sec.security_amount.toLocaleString() : '0'}</span>
                                    <span className="text-slate-500 text-[10px]">{sec.security_type}</span>
                                  </div>
                                  {sec.valid_until && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">Valid until: {sec.valid_until}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 5. Technical Proposal Overview */}
                          {bid.description && (
                            <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3.5">
                              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Proposal Overview</h4>
                              <p className={`text-xs text-slate-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {bid.description}
                              </p>
                              {bid.description.length > 90 && (
                                <button
                                  onClick={() => toggleDescription(bid.bid_id)}
                                  className="text-[10px] text-accent-600 hover:text-accent-700 font-bold mt-1"
                                >
                                  {isExpanded ? 'Show Less ▲' : 'Read Full Scope ▼'}
                                </button>
                              )}
                            </div>
                          )}

                          <p className="text-[10px] text-slate-400 mt-auto">
                            Submitted on {new Date(bid.submitted_at).toLocaleDateString()} at {new Date(bid.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200">
                          {bid.status === 'Accepted' ? (
                            <div className="w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5 shadow">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Winning Bid Awarded
                            </div>
                          ) : bid.status === 'Rejected' ? (
                            <div className="w-full py-2.5 bg-slate-200 text-slate-500 font-bold text-xs rounded-xl text-center">
                              Proposal Rejected
                            </div>
                          ) : (
                            <button
                              onClick={() => openAcceptModal(bid)}
                              disabled={hasAcceptedBid || isTenderClosed}
                              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 ${
                                hasAcceptedBid || isTenderClosed
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 hover:shadow-lg'
                              }`}
                            >
                              <span>🏆 Accept & Award Bid</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. RECOMMENDED SELLERS TAB */}
          {/* ============================================================ */}
          {activeTab === 'recommended' && (
            <div className="mb-6">
              <p className="text-slate-400 text-xs text-center mb-6 italic">
                These are our smart recommendations for your current tender based on category match, past performance, and vendor credibility.
              </p>
              <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
                <svg className="w-12 h-12 text-slate-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-slate-300 font-medium">Smart AI recommendations will appear here as more vendors join.</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Confirmation Award Modal */}
      <ModalShell
        isOpen={isModalOpen}
        onClose={() => !accepting && setIsModalOpen(false)}
        maxWidth="max-w-md"
      >
        <div className="p-8">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-black text-navy-900 mb-2 text-center">Confirm Award of Tender</h3>
          <p className="text-slate-600 mb-6 text-center text-sm">
            Are you sure you want to award this tender to <strong className="text-navy-900">{selectedBid?.vendor_name}</strong> for <strong className="text-navy-900">৳ {selectedBid?.financial_amount ? selectedBid.financial_amount.toLocaleString() : '0'}</strong>?
          </p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <strong>Important:</strong> Accepting this bid will mark the tender as <em>Awarded</em> and automatically set all other submitted bids to <em>Rejected</em>.
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={accepting}
              className="px-5 py-2.5 rounded-xl text-navy-900 font-semibold hover:bg-slate-100 transition disabled:opacity-50 border border-slate-200 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptBid}
              disabled={accepting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2 text-xs"
            >
              {accepting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Awarding Tender...
                </>
              ) : (
                'Confirm & Award'
              )}
            </button>
          </div>
        </div>
      </ModalShell>
    </main>
  );
}
