'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ModalShell from '@/components/ModalShell';
import BidEvaluationPanel from '@/components/BidEvaluationPanel';

interface BidDocument {
  bid_doc_id: number;
  bid_id: number;
  file_path: string;
  document_type: string;
  has_access?: boolean;
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
  lot_pricing?: LotPricingItem[];
}

interface LotPricingItem {
  bid_item_id?: number;
  tender_item_id: number;
  lot_number: string;
  item_name: string;
  offered_quantity: number;
  unit_price: number;
  total_price: number;
  compliance_remarks?: string | null;
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
  package_type?: string;
  budget_min: number | null;
  budget_max: number | null;
  lots?: any[];
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
  bid_count?: number;
  required_documents?: RequiredDocument[];
  can_manage_document_access?: boolean;
}

export default function ViewMyTenderPage() {
  const router = useRouter();
  const params = useParams();
  const tenderId = params.id as string;

  const [activeTab, setActiveTab] = useState<'bids' | 'compare' | 'evaluation'>('bids');
  const [fadeIn, setFadeIn] = useState(true);
  
  const [tender, setTender] = useState<Tender | null>(null);
  const [comparisonData, setComparisonData] = useState<TenderComparisonData | null>(null);
  const [basicBids, setBasicBids] = useState<EvaluatedBid[]>([]);
  const [compareError, setCompareError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedBid, setSelectedBid] = useState<EvaluatedBid | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const [showManageAccess, setShowManageAccess] = useState(false);
  const [reqDocs, setReqDocs] = useState<RequiredDocument[]>([]);
  const [savingAccess, setSavingAccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [restrictedDocAlert, setRestrictedDocAlert] = useState<{ isOpen: boolean; docName: string }>({ isOpen: false, docName: '' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  // Comparison Matrix Interactive State
  const [filterMode, setFilterMode] = useState<'all' | 'compliant' | 'enlisted'>('all');
  const [sortMode, setSortMode] = useState<'price_asc' | 'price_desc' | 'rating_desc' | 'compliance_desc' | 'date_desc'>('price_asc');
  const [pinnedBidIds, setPinnedBidIds] = useState<number[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!tenderId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [tenderRes, bidsRes, compareRes] = await Promise.all([
          fetch(`/api/tenders/${tenderId}/detail`),
          fetch(`/api/bids/buyer/tender/${tenderId}`),
          fetch(`/api/bids/buyer/tender/${tenderId}/compare`),
        ]);

        if (!tenderRes.ok) throw new Error('Failed to fetch tender details');
        const tenderData = await tenderRes.json();
        setTender(tenderData);
        setReqDocs(tenderData.required_documents || []);

        let listBids: EvaluatedBid[] = [];
        if (bidsRes.ok) {
          const rawBids = await bidsRes.json();
          listBids = rawBids.map((b: Record<string, unknown>) => ({
            bid_id: b.bid_id as number,
            vendor_org_id: b.vendor_org_id as number,
            submitted_by: b.submitted_by as number,
            tender_id: b.tender_id as number,
            financial_amount: parseFloat(String(b.financial_amount)) || 0,
            description: (b.description as string) || null,
            status: b.status as EvaluatedBid['status'],
            submitted_at: b.submitted_at as string,
            updated_at: (b.updated_at as string) || (b.submitted_at as string),
            vendor_name: (b.vendor_name as string) || 'Unknown Vendor',
            vendor_rating: 0,
            total_ratings_count: 0,
            completed_contracts_count: 0,
            is_enlisted: false,
            budget_variance_pct: null,
            avg_variance_pct: null,
            is_lowest_bid: false,
            compliance_score_pct: -1,
            mandatory_docs_satisfied: false,
            documents: (b.documents as BidDocument[]) || [],
            compliance_matrix: [],
            securities: [],
          }));
          setBasicBids(listBids);
        }

        if (compareRes.ok) {
          const compData: TenderComparisonData = await compareRes.json();
          setComparisonData(compData);
          setCompareError('');
          setPinnedBidIds(compData.bids.map((b) => b.bid_id));
        } else {
          setComparisonData(null);
          setCompareError('Comparison metrics could not be loaded. Bid cards still show submitted proposals.');
          setPinnedBidIds(listBids.map((b) => b.bid_id));
        }

      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenderId]);

  const bids = comparisonData?.bids ?? basicBids;
  const hasComparison = comparisonData !== null;
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
      
      // Re-fetch bids to update document access states reactively
      try {
        const bidsRes = await fetch(`/api/bids/buyer/tender/${tenderId}`);
        if (bidsRes.ok) {
          const bidsData = await bidsRes.json();
          setBasicBids(bidsData);
        }
      } catch (e) {
        console.error("Failed to refetch bids:", e);
      }

      setShowManageAccess(false);
      setToastMessage("Document access permissions updated successfully");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update document access");
    } finally {
      setSavingAccess(false);
    }
  };

  const handleTabSwitch = (tab: 'bids' | 'compare' | 'evaluation') => {
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
      } else {
        const errorData = await res.json();
        alert(errorData.detail || 'Access Denied');
      }
    } catch (e) {
      console.error('Failed to view document', e);
      alert('Failed to view document');
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
  const bidCount = comparisonData?.summary?.total_bids ?? tender?.bid_count ?? 0;
  const canEdit = tender?.status === 'Draft' || (tender?.status === 'Published' && bidCount === 0);
  const canPublish = tender?.status === 'Draft';
  const canCancel = tender?.status === 'Published';
  const canDelete =
    tender?.status === 'Draft' || (tender?.status === 'Published' && bidCount === 0);

  const handlePublishDraft = async () => {
    if (!window.confirm('Publish this draft? Tokens will be deducted from your organization balance.')) return;
    setActionLoading('publish');
    try {
      const res = await fetch(`/api/tenders/${tenderId}/publish`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to publish tender.');
      const data = await res.json();
      setTender((prev) => (prev ? { ...prev, status: data.status || 'Published' } : prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to publish tender.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelTender = async () => {
    if (!window.confirm('Cancel this tender? Vendors who already bid will be notified.')) return;
    setActionLoading('cancel');
    try {
      const res = await fetch(`/api/tenders/${tenderId}/withdraw`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to cancel tender.');
      setTender((prev) => (prev ? { ...prev, status: 'Cancelled' } : prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel tender.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteTender = async () => {
    if (!window.confirm('Permanently delete this tender and all related data? This cannot be undone.')) return;
    setActionLoading('delete');
    try {
      const res = await fetch(`/api/tenders/${tenderId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail || 'Failed to delete tender.');
      router.push('/home');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete tender.');
      setActionLoading(null);
    }
  };

  const isTenderClosed = tender?.status === 'Awarded' || tender?.status === 'Closed' || tender?.status === 'Cancelled';

  const compliantCount = bids.filter(b => b.mandatory_docs_satisfied && b.compliance_score_pct >= 100).length;
  const enlistedCount = bids.filter(b => b.is_enlisted).length;

  if (loading) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-app">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-content-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-content-muted text-lg font-medium">Loading tender comparison workbench...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex flex-col items-center justify-center gap-4 bg-app">
        <div className="w-16 h-16 rounded-full bg-status-rejected-bg flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-status-rejected-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-status-rejected-text text-lg font-medium">{error}</p>
        <button onClick={() => router.push('/home')} className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition">
          Back to Dashboard
        </button>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-app">
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Back Button */}
        <button onClick={() => router.push('/home')}
          className="mb-6 flex items-center gap-2 text-content-muted hover:text-content-primary transition-colors duration-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">Back to Dashboard</span>
        </button>

        {/* Tender Details Card */}
        <div className="bg-surface rounded border border-subtle overflow-hidden mb-3">
          <div className="bg-brand-navy px-8 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">{tender?.title}</h1>
                  <span className={`badge-status ${
                    tender?.status === 'Awarded' || tender?.status === 'Published' || tender?.status === 'Open' || tender?.status === 'Active' ? 'badge-approved' :
                    tender?.status === 'Draft' ? 'badge-draft' :
                    tender?.status === 'Rejected' || tender?.status === 'Cancelled' ? 'badge-rejected' :
                    'badge-pending'
                  }`}>
                    <span className="badge-dot" />
                    {tender?.status}
                  </span>
                </div>
                <p className="text-slate-300 text-xs mt-1">
                  Budget: <strong className="text-white tabular-nums">৳ {tender?.budget_min ? parseFloat(tender.budget_min).toLocaleString() : '0'}</strong> – <strong className="text-white tabular-nums">৳ {tender?.budget_max ? parseFloat(tender.budget_max).toLocaleString() : '0'}</strong>
                </p>
              </div>

              {bids.length > 1 && (
                <button
                  onClick={() => handleTabSwitch('compare')}
                  className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition flex items-center gap-1.5 border border-white/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Compare All {bids.length} Bids
                </button>
              )}
            </div>
          </div>
          <div className="px-8 py-5 space-y-4">
            <p className="text-content-secondary text-sm leading-relaxed">{tender?.description}</p>
            {(canEdit || canPublish || canCancel || canDelete) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-subtle">
                {canEdit && (
                  <button
                    onClick={() => router.push(`/edit-tender/${tenderId}`)}
                    className="bg-app text-content-primary hover:bg-slate-200 text-sm font-medium h-9 px-3.5 rounded border border-subtle transition"
                  >
                    Edit
                  </button>
                )}
                {canPublish && (
                  <button
                    onClick={handlePublishDraft}
                    disabled={actionLoading !== null}
                    className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition disabled:opacity-50"
                  >
                    {actionLoading === 'publish' ? 'Publishing...' : 'Publish Draft'}
                  </button>
                )}
                {canCancel && (
                  <button
                    onClick={handleCancelTender}
                    disabled={actionLoading !== null}
                    className="bg-status-pending-bg text-status-pending-text border border-amber-200 hover:bg-amber-100 text-sm font-medium h-9 px-3.5 rounded transition disabled:opacity-50"
                  >
                    {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Tender'}
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDeleteTender}
                    disabled={actionLoading !== null}
                    className="bg-status-rejected-bg text-status-rejected-text border border-red-200 hover:bg-red-100 text-sm font-medium h-9 px-3.5 rounded transition disabled:opacity-50"
                  >
                    {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Awarded Banner if Tender is Awarded */}
        {(tender?.status === 'Awarded' || hasAcceptedBid) && (
          <div className="bg-status-approved-bg border border-status-approved-text/20 rounded p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-status-approved-text/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-status-approved-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-status-approved-text text-base">Tender Awarded & Ongoing</h3>
                <p className="text-content-secondary text-xs mt-0.5">
                  Winning bid accepted. You can view contracts, fulfillment details, and counterpart information.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push(`/ongoing-tenders/${tenderId}`)}
              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition whitespace-nowrap flex items-center gap-1.5"
            >
              View in Ongoing Tenders
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        )}

        {/* Manage Document Access Button - OUTSIDE the white box */}
        {(tender?.can_manage_document_access ?? true) && (
          <div className="flex justify-end mb-6">
            <button
              type="button"
              onClick={() => setShowManageAccess(!showManageAccess)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded border transition-all duration-200 ${
                showManageAccess
                  ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'
                  : 'bg-surface text-content-secondary border-subtle hover:bg-app hover:text-content-primary'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Manage Document Access {showManageAccess ? '▲' : '▼'}
            </button>
          </div>
        )}

        {/* Expandable Document Access Panel - OUTSIDE the Tender Details Card */}
        {(tender?.can_manage_document_access ?? true) && showManageAccess && (
          <div className="bg-surface rounded border border-subtle p-8 mb-8 animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-subtle">
              <h3 className="text-content-secondary text-xs font-medium uppercase tracking-wide">Required Document Permissions</h3>
              {saveMessage && <span className="text-xs text-emerald-600 font-semibold">{saveMessage}</span>}
            </div>

            {reqDocs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No required seller documents specified for this tender.</p>
            ) : (
              <div className="space-y-3">
                {reqDocs.map((doc) => (
                  <div key={doc.req_doc_id} className="bg-app rounded border border-subtle p-3.5">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-brand-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-content-primary font-medium">{doc.custom_doc_name || 'Document'}</span>
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
                              className="w-3.5 h-3.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue focus:ring-offset-0 disabled:opacity-60"
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
                    className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingAccess ? 'Saving...' : 'Save Access Settings'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAccess}
                    className="bg-app text-content-primary hover:bg-slate-200 text-sm font-medium h-9 px-3.5 rounded transition border border-subtle"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toggle Capsule */}
        <div className="mb-6 flex border-b border-subtle">
            <button
              onClick={() => handleTabSwitch('bids')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'bids' ? 'border-brand-navy text-content-primary' : 'border-transparent text-content-muted hover:text-content-primary'
              }`}
            >
              Bid Cards ({bids.length})
            </button>
            <button
              onClick={() => handleTabSwitch('compare')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'compare' ? 'border-brand-navy text-content-primary' : 'border-transparent text-content-muted hover:text-content-primary'
              }`}
            >
              Compare Bids Matrix
            </button>
            <button
              onClick={() => handleTabSwitch('evaluation')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'evaluation' ? 'border-brand-navy text-content-primary' : 'border-transparent text-content-muted hover:text-content-primary'
              }`}
            >
              Smart Evaluation
            </button>
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
                  <h2 className="text-xl font-bold text-content-primary mb-1">Vendor Proposals</h2>
                  <p className="text-content-secondary text-sm">{bids.length} vendors have placed bids on this tender</p>
                </div>
                {bids.length > 1 && (
                  <button
                    onClick={() => handleTabSwitch('compare')}
                    className="bg-app text-content-primary hover:bg-slate-200 text-sm font-medium h-9 px-3.5 rounded border border-subtle transition flex items-center gap-1.5"
                  >
                    Switch to Comparison Matrix
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                )}
              </div>

              {bids.length === 0 ? (
                <div className="bg-app rounded p-10 text-center border border-subtle">
                  <svg className="w-12 h-12 text-content-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-content-muted font-medium">No bids have been submitted yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {bids.map((bid) => (
                    <div
                      key={bid.bid_id}
                      className={`bg-surface rounded border transition-all duration-200 relative overflow-hidden ${
                        bid.status === 'Accepted' ? 'border-status-approved-text/30' : 'border-subtle'
                      }`}
                    >
                      {bid.status === 'Accepted' && (
                        <div className="absolute top-0 right-0 bg-status-approved-bg text-status-approved-text text-xs font-medium px-3 py-1 rounded-bl border-l border-b border-status-approved-text/20">
                          ✓ Winning Bid
                        </div>
                      )}
                      
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded bg-brand-navy flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {(bid.vendor_name || 'V').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-content-primary">{bid.vendor_name}</h3>
                                {hasComparison && bid.is_enlisted && (
                                  <span className="badge-status badge-draft">
                                    <span className="badge-dot" />Enlisted Partner
                                  </span>
                                )}
                                {hasComparison && bid.is_lowest_bid && (
                                  <span className="badge-status badge-pending">
                                    <span className="badge-dot" />Lowest Proposal
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                Submitted: {new Date(bid.submitted_at).toLocaleString()}
                                {hasComparison && (
                                  <> · Rating: {bid.vendor_rating || 0} ({bid.total_ratings_count || 0})</>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="bg-app rounded px-4 py-2 mt-1 text-right border border-subtle">
                            <span className="text-content-primary font-bold text-sm tabular-nums">৳ {bid.financial_amount ? bid.financial_amount.toLocaleString() : '0'}</span>
                            {bid.budget_variance_pct !== null && bid.budget_variance_pct !== undefined && (
                              <p className={`text-[10px] font-bold ${bid.budget_variance_pct <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {bid.budget_variance_pct <= 0 ? `${bid.budget_variance_pct}% vs budget` : `+${bid.budget_variance_pct}% vs budget`}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Badge & Compliance */}
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <span className={`badge-status ${
                            bid.status === 'Accepted' ? 'badge-approved' :
                            bid.status === 'Rejected' || bid.status === 'Withdrawn' ? 'badge-rejected' :
                            bid.status === 'Draft' ? 'badge-draft' :
                            'badge-pending'
                          }`}>
                            <span className="badge-dot" />
                            {bid.status}
                          </span>

                          {hasComparison && bid.compliance_score_pct >= 0 && (
                          <span className={`badge-status ${
                            bid.compliance_score_pct >= 100 && bid.mandatory_docs_satisfied
                              ? 'badge-approved'
                              : 'badge-pending'
                          }`}>
                            <span className="badge-dot" />
                            {bid.compliance_score_pct}% Document Compliance
                          </span>
                          )}
                        </div>

                        {/* Description */}
                        {bid.description && (
                          <div className="mb-4 bg-app border border-subtle rounded p-4">
                            <h4 className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-1">Proposal Description</h4>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{bid.description}</p>
                          </div>
                        )}

                        {/* Files Capsules */}
                        {bid.documents && bid.documents.length > 0 && (
                          <div className="mb-4 flex flex-wrap gap-2">
                            {bid.documents.map((doc) => (
                              <div key={doc.bid_doc_id} className={`rounded px-3 py-1.5 flex items-center gap-2 border ${doc.has_access !== false ? 'border-subtle bg-app' : 'border-slate-300 bg-slate-100 opacity-80'}`}>
                                {doc.has_access !== false ? (
                                  <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                                  </svg>
                                ) : (
                                  <span className="text-slate-500 text-sm">🔒</span>
                                )}
                                <span className={`text-xs font-medium ${doc.has_access !== false ? 'text-content-primary' : 'text-content-muted italic'}`}>
                                  {doc.document_type} {doc.has_access === false && '(Restricted)'}
                                </span>
                                {doc.has_access !== false ? (
                                  <button onClick={() => handleViewDocument(doc.bid_doc_id)}
                                    className="ml-1 text-brand-blue hover:text-brand-blue/80 text-xs font-semibold transition">
                                    View
                                  </button>
                                ) : (
                                  <button onClick={() => setRestrictedDocAlert({ isOpen: true, docName: doc.document_type })}
                                    className="ml-1 text-slate-400 hover:text-slate-500 text-xs font-semibold transition cursor-pointer">
                                    View
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-subtle">
                          {bid.status === 'Accepted' ? (
                            <div className="text-status-approved-text font-medium text-sm flex items-center gap-1">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Accepted
                            </div>
                          ) : bid.status === 'Rejected' ? (
                            <div className="text-status-rejected-text font-medium text-sm">Rejected</div>
                          ) : (
                            <button
                              onClick={() => openAcceptModal(bid)}
                              disabled={hasAcceptedBid || isTenderClosed}
                              className={`text-sm font-medium h-9 px-3.5 rounded transition ${
                                hasAcceptedBid || isTenderClosed
                                  ? 'bg-slate-200 text-content-muted cursor-not-allowed'
                                  : 'bg-brand-navy text-white hover:bg-slate-900'
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
              {!hasComparison && (
                <div className="mb-6 p-4 rounded bg-status-pending-bg border border-amber-200 text-status-pending-text text-sm">
                  {compareError || 'Comparison data is unavailable.'}
                </div>
              )}
              {/* Summary KPIs Banner */}
              {summary && summary.total_bids > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-surface border border-subtle rounded p-5">
                    <p className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-1">Total Proposals</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-bold text-content-primary tabular-nums">{summary.total_bids}</span>
                      <span className="badge-status badge-approved">
                        <span className="badge-dot" />{summary.fully_compliant_bids_count} Compliant
                      </span>
                    </div>
                  </div>

                  <div className="bg-status-approved-bg border border-status-approved-text/20 rounded p-5">
                    <p className="text-status-approved-text text-xs font-medium uppercase tracking-wider mb-1">Lowest Proposal</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-status-approved-text tabular-nums">
                        ৳ {summary.min_amount ? summary.min_amount.toLocaleString() : 'N/A'}
                      </span>
                      <span className="badge-status badge-approved">
                        <span className="badge-dot" />Best Price
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface border border-subtle rounded p-5">
                    <p className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-1">Average Proposal</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-content-primary tabular-nums">
                        ৳ {summary.avg_amount ? summary.avg_amount.toLocaleString() : 'N/A'}
                      </span>
                      <span className="text-xs text-content-muted tabular-nums">
                        Max: ৳ {summary.max_amount ? summary.max_amount.toLocaleString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface border border-subtle rounded p-5">
                    <p className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-1">Tender Budget Ceiling</p>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold text-content-primary tabular-nums">
                        ৳ {summary.budget_max ? summary.budget_max.toLocaleString() : 'N/A'}
                      </span>
                      <span className="text-xs text-content-muted tabular-nums">
                        Min: ৳ {summary.budget_min ? summary.budget_min.toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Bar: Filters, Sorting, Selection */}
              <div className="bg-surface rounded border border-subtle p-5 mb-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  {/* Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-content-secondary text-xs font-medium uppercase mr-1">Filter:</span>
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                        filterMode === 'all'
                          ? 'bg-brand-navy text-white'
                          : 'bg-app text-content-secondary border border-subtle hover:bg-slate-200'
                      }`}
                    >
                      All Proposals ({bids.length})
                    </button>
                    <button
                      onClick={() => setFilterMode('compliant')}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                        filterMode === 'compliant'
                          ? 'bg-brand-navy text-white'
                          : 'bg-app text-content-secondary border border-subtle hover:bg-slate-200'
                      }`}
                    >
                      100% Compliant ({compliantCount})
                    </button>
                    <button
                      onClick={() => setFilterMode('enlisted')}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                        filterMode === 'enlisted'
                          ? 'bg-brand-navy text-white'
                          : 'bg-app text-content-secondary border border-subtle hover:bg-slate-200'
                      }`}
                    >
                      Enlisted Partners ({enlistedCount})
                    </button>
                  </div>

                  {/* Sort & Select Tools */}
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
                    <div className="flex items-center gap-2">
                      <label htmlFor="bid-sort-select" className="text-content-secondary text-xs font-medium uppercase">Sort:</label>
                      <select
                        id="bid-sort-select"
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as any)}
                        className="bg-app border border-subtle rounded px-3 py-1.5 text-xs font-medium text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      >
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="rating_desc">Vendor Rating</option>
                        <option value="compliance_desc">Document Compliance</option>
                        <option value="date_desc">Submission Date</option>
                      </select>
                    </div>

                    {pinnedBidIds.length < bids.length ? (
                      <button
                        onClick={selectAllBids}
                        className="text-xs font-medium text-brand-blue hover:text-brand-blue/80 underline"
                      >
                        Reset Selection ({bids.length})
                      </button>
                    ) : null}

                    <button
                      onClick={() => window.print()}
                      className="bg-app text-content-primary hover:bg-slate-200 rounded text-xs font-medium transition flex items-center gap-1 border border-subtle px-3 py-1.5"
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
                <div className="bg-app rounded p-12 text-center border border-subtle">
                  <p className="text-content-secondary font-medium mb-2">No bids match the active filter criteria.</p>
                  <button
                    onClick={() => { setFilterMode('all'); selectAllBids(); }}
                    className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
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
                        className={`bg-surface rounded border flex flex-col justify-between overflow-hidden transition-all duration-200 ${
                          bid.status === 'Accepted'
                            ? 'border-status-approved-text/30'
                            : bid.is_lowest_bid
                            ? 'border-status-pending-text/30'
                            : 'border-subtle'
                        }`}
                      >
                        {/* Top Header */}
                        <div className="bg-app p-5 border-b border-subtle">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={pinnedBidIds.includes(bid.bid_id)}
                                onChange={() => togglePinBid(bid.bid_id)}
                                title="Pin or isolate this bid in comparison"
                                className="w-4 h-4 rounded text-brand-blue focus:ring-brand-blue cursor-pointer"
                              />
                              <h3 className="text-base font-bold text-content-primary leading-tight">
                                {bid.vendor_name}
                              </h3>
                            </div>

                            <span className={`badge-status ${
                              bid.status === 'Accepted' ? 'badge-approved' :
                              bid.status === 'Rejected' || bid.status === 'Withdrawn' ? 'badge-rejected' :
                              bid.status === 'Draft' ? 'badge-draft' :
                              'badge-pending'
                            }`}>
                              <span className="badge-dot" />{bid.status}
                            </span>
                          </div>

                          {/* Highlight Badges */}
                          <div className="flex flex-wrap gap-1.5">
                            {bid.is_lowest_bid && (
                              <span className="badge-status badge-pending">
                                <span className="badge-dot" />Lowest Bid
                              </span>
                            )}
                            {bid.is_enlisted && (
                              <span className="badge-status badge-draft">
                                <span className="badge-dot" />Enlisted Partner
                              </span>
                            )}
                            <span className="badge-status badge-approved">
                              <span className="badge-dot" />{bid.vendor_verification_status || 'Verified'}
                            </span>
                          </div>
                        </div>

                        {/* Main Comparison Body */}
                        <div className="p-5 flex-1 flex flex-col gap-5">
                          
                          {/* 1. Financial Dimension */}
                          <div className="bg-app border border-subtle rounded p-4">
                            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-1">Financial Proposal</p>
                            <div className="flex items-baseline justify-between mb-2">
                              <span className="text-2xl font-bold text-content-primary tabular-nums">
                                ৳ {bid.financial_amount ? bid.financial_amount.toLocaleString() : '0'}
                              </span>
                              {bid.budget_variance_pct !== null && bid.budget_variance_pct !== undefined && (
                                <span className={`badge-status ${
                                  bid.budget_variance_pct <= 0 ? 'badge-approved' : 'badge-pending'
                                }`}>
                                  <span className="badge-dot" />
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

                          {/* Itemized Lot Pricing Breakdown (FR-10) */}
                          {bid.lot_pricing && bid.lot_pricing.length > 0 && (
                            <div className="border border-subtle bg-app rounded p-3.5 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-content-secondary text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
                                  <span>📦</span> Lot Price Breakdown
                                </span>
                                <span className="badge-status badge-draft">
                                  <span className="badge-dot" />{bid.lot_pricing.length} Lots
                                </span>
                              </div>
                              <div className="divide-y divide-subtle text-xs">
                                {bid.lot_pricing.map((lot, lIdx) => (
                                  <div key={lIdx} className="py-2 flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-medium text-content-primary truncate">
                                        <span className="text-[10px] text-content-muted font-normal mr-1">[{lot.lot_number}]</span>
                                        {lot.item_name}
                                      </p>
                                      <p className="text-[10px] text-content-muted tabular-nums">
                                        {lot.offered_quantity} units × ৳ {lot.unit_price.toLocaleString()}
                                      </p>
                                    </div>
                                    <span className="font-bold text-content-primary whitespace-nowrap tabular-nums">
                                      ৳ {lot.total_price.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 2. Vendor Credibility & Track Record */}
                          <div className="border border-subtle bg-app rounded p-3.5">
                            <h4 className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-2">Vendor Reputation</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-content-muted text-[10px] block">Performance Rating</span>
                                <span className="font-medium text-content-primary flex items-center gap-1">
                                  ⭐ {bid.vendor_rating ? bid.vendor_rating.toFixed(1) : '0.0'}
                                  <span className="text-[10px] text-content-muted font-normal">({bid.total_ratings_count || 0})</span>
                                </span>
                              </div>
                              <div>
                                <span className="text-content-muted text-[10px] block">Completed Contracts</span>
                                <span className="font-medium text-content-primary">{bid.completed_contracts_count || 0} Contracts</span>
                              </div>
                              {bid.vendor_address && (
                                <div className="col-span-2 mt-1 text-[11px] text-slate-500 truncate">
                                  {bid.vendor_address}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 3. Document Compliance Matrix */}
                          <div className="border border-subtle bg-app rounded p-3.5">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-content-secondary text-xs font-medium uppercase tracking-wider">Document Checklist</h4>
                              <span className={`badge-status ${
                                bid.compliance_score_pct >= 100 && bid.mandatory_docs_satisfied
                                  ? 'badge-approved'
                                  : 'badge-pending'
                              }`}>
                                <span className="badge-dot" />{bid.compliance_score_pct}% Compliant
                              </span>
                            </div>

                            {bid.compliance_matrix && bid.compliance_matrix.length > 0 ? (
                              <div className="space-y-1.5">
                                {bid.compliance_matrix.map((doc) => (
                                  <div key={doc.req_doc_id} className="flex items-center justify-between text-xs bg-surface p-2 rounded border border-subtle">
                                    <div className="flex items-center gap-1.5 truncate mr-2">
                                      {doc.is_submitted ? (
                                        <span className="text-status-approved-text font-bold flex-shrink-0">✓</span>
                                      ) : (
                                        <span className="text-status-rejected-text font-bold flex-shrink-0">✗</span>
                                      )}
                                      <span className="text-content-primary font-medium truncate text-[11px]">
                                        {doc.custom_doc_name}
                                        {doc.is_mandatory && <span className="text-red-500 text-[10px] ml-0.5">*</span>}
                                      </span>
                                    </div>
                                    {doc.is_submitted && doc.bid_doc_id ? (
                                      <button
                                        onClick={() => handleViewDocument(doc.bid_doc_id!)}
                                        className="text-[10px] text-brand-blue hover:text-brand-blue/80 font-medium hover:underline whitespace-nowrap"
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
                            <div className="border border-subtle bg-app rounded p-3.5">
                              <h4 className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-2">Bid Security</h4>
                              {bid.securities.map((sec) => (
                                <div key={sec.security_id} className="text-xs bg-surface p-2.5 rounded border border-subtle">
                                  <div className="flex justify-between font-medium text-content-primary">
                                    <span className="tabular-nums">৳ {sec.security_amount ? sec.security_amount.toLocaleString() : '0'}</span>
                                    <span className="text-content-muted text-[10px]">{sec.security_type}</span>
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
                            <div className="border border-subtle bg-app rounded p-3.5">
                              <h4 className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-1">Proposal Overview</h4>
                              <p className={`text-xs text-content-secondary leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {bid.description}
                              </p>
                              {bid.description.length > 90 && (
                                <button
                                  onClick={() => toggleDescription(bid.bid_id)}
                                  className="text-[10px] text-brand-blue hover:text-brand-blue/80 font-medium mt-1"
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
                        <div className="p-4 bg-app border-t border-subtle">
                          {bid.status === 'Accepted' ? (
                            <div className="w-full py-2 bg-status-approved-bg text-status-approved-text font-medium text-xs rounded text-center flex items-center justify-center gap-1.5 border border-status-approved-text/20">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Winning Bid Awarded
                            </div>
                          ) : bid.status === 'Rejected' ? (
                            <div className="w-full py-2 bg-status-rejected-bg text-status-rejected-text font-medium text-xs rounded text-center border border-status-rejected-text/20">
                              Proposal Rejected
                            </div>
                          ) : (
                            <button
                              onClick={() => openAcceptModal(bid)}
                              disabled={hasAcceptedBid || isTenderClosed}
                              className={`w-full py-2 rounded font-medium text-xs transition flex items-center justify-center gap-1.5 ${
                                hasAcceptedBid || isTenderClosed
                                  ? 'bg-slate-200 text-content-muted cursor-not-allowed'
                                  : 'bg-brand-navy text-white hover:bg-slate-900'
                              }`}
                            >
                              Accept & Award Bid
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

          {activeTab === 'evaluation' && (
            <BidEvaluationPanel tenderId={tenderId} bidsCount={bids.length} />
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
          <div className="w-14 h-14 mx-auto mb-5 rounded bg-status-approved-bg text-status-approved-text flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-content-primary mb-2 text-center">Confirm Award of Tender</h3>
          <p className="text-content-secondary mb-6 text-center text-sm">
            Are you sure you want to award this tender to <strong className="text-content-primary">{selectedBid?.vendor_name}</strong> for <strong className="text-content-primary tabular-nums">৳ {selectedBid?.financial_amount ? selectedBid.financial_amount.toLocaleString() : '0'}</strong>?
          </p>
          <div className="bg-status-pending-bg border border-amber-200 text-status-pending-text p-4 rounded text-xs mb-6 flex items-start gap-3">
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
              className="bg-app text-content-primary font-medium hover:bg-slate-200 transition disabled:opacity-50 border border-subtle text-sm h-9 px-3.5 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleAcceptBid}
              disabled={accepting}
              className="bg-brand-navy text-white hover:bg-slate-900 font-medium transition disabled:opacity-50 flex items-center gap-2 text-sm h-9 px-3.5 rounded"
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

      {/* Restricted Document Access Modal */}
      <ModalShell
        isOpen={restrictedDocAlert.isOpen}
        onClose={() => setRestrictedDocAlert({ isOpen: false, docName: '' })}
        maxWidth="max-w-md"
      >
        <div className="p-8">
          <div className="w-14 h-14 mx-auto mb-5 rounded bg-status-rejected-bg flex items-center justify-center">
            <span className="text-2xl">🔒</span>
          </div>
          <h3 className="text-xl font-bold text-content-primary mb-2 text-center">Access Restricted</h3>
          <p className="text-content-secondary mb-6 text-center text-sm">
            You do not have authorization to view <strong className="text-content-primary">{restrictedDocAlert.docName}</strong>. This document requires <strong className="text-content-primary">Owner</strong> privileges. Contact your administrator or tender manager to request access.
          </p>
          <div className="flex justify-center">
            <button
              onClick={() => setRestrictedDocAlert({ isOpen: false, docName: '' })}
              className="bg-app text-content-primary font-medium hover:bg-slate-200 transition border border-subtle text-sm h-9 px-3.5 rounded"
            >
              Close
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className="bg-status-approved-bg border border-status-approved-text/20 shadow-subtle-card rounded px-5 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-status-approved-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-status-approved-text text-sm font-medium">{toastMessage}</p>
          </div>
        </div>
      )}
    </main>
  );
}
