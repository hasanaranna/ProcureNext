'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OngoingTenderItem {
  award_id: number;
  tender_id: number;
  tender_title: string;
  tender_description: string | null;
  tender_status: string;
  budget_min: number | null;
  budget_max: number | null;
  submission_deadline: string | null;
  tender_created_at: string | null;
  awarded_at: string | null;
  remarks: string | null;
  winning_bid_id: number;
  winning_bid_amount: number | null;
  winning_bid_description: string | null;
  winning_bid_submitted_at: string | null;
  buyer_org_id: number;
  buyer_org_name: string;
  vendor_org_id: number;
  vendor_org_name: string;
  role_in_tender: 'buyer' | 'vendor' | null;
  contract_id?: number | null;
  contract_status?: string | null;
}

export default function OngoingTendersPage() {
  const router = useRouter();
  const [tenders, setTenders] = useState<OngoingTenderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'buyer' | 'vendor'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    const fetchOngoingTenders = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/tenders/ongoing');
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to load ongoing tenders');
        }
        const data = await res.json();
        setTenders(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading ongoing tenders');
      } finally {
        setLoading(false);
      }
    };

    fetchOngoingTenders();
  }, [router]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredTenders = tenders.filter((item) => {
    const matchesSearch =
      item.tender_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.buyer_org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendor_org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.tender_description && item.tender_description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole =
      filterRole === 'all' || item.role_in_tender === filterRole;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && item.contract_status !== 'Completed') ||
      (filterStatus === 'completed' && item.contract_status === 'Completed');

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalValue = tenders.reduce(
    (acc, curr) => acc + (curr.winning_bid_amount || 0),
    0
  );
  const buyerCount = tenders.filter((t) => t.role_in_tender === 'buyer').length;
  const vendorCount = tenders.filter((t) => t.role_in_tender === 'vendor').length;
  const completedCount = tenders.filter((t) => t.contract_status === 'Completed').length;
  const activeCount = tenders.filter((t) => t.contract_status !== 'Completed').length;

  if (loading) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-app">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-content-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-content-muted text-sm font-medium">Loading ongoing tenders...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen py-8 px-4 bg-app">
      <div className="max-w-6xl mx-auto animate-fade-in">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <button
              onClick={() => router.push('/home')}
              className="mb-3 flex items-center gap-2 text-content-muted hover:text-content-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium text-sm">Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-semibold text-content-primary flex items-center gap-3">
              Ongoing Tenders & Awards
              <span className="badge-status badge-approved">
                <span className="badge-dot" />
                Live
              </span>
            </h1>
            <p className="text-content-secondary mt-1 text-sm">
              Track awarded contracts, monitor counterpart progress, and view fulfillment details.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/home')}
              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface rounded border border-subtle px-4 py-4">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">Total Ongoing Tenders</p>
            <p className="text-lg font-semibold text-content-primary tabular-nums mt-1">{tenders.length}</p>
          </div>

          <div className="bg-surface rounded border border-subtle px-4 py-4">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">Total Contract Volume</p>
            <p className="text-lg font-semibold text-content-primary tabular-nums mt-1">৳ {totalValue.toLocaleString()}</p>
          </div>

          <div className="bg-surface rounded border border-subtle px-4 py-4">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">As Buyer (Awarded)</p>
            <p className="text-lg font-semibold text-content-primary tabular-nums mt-1">{buyerCount}</p>
          </div>

          <div className="bg-surface rounded border border-subtle px-4 py-4">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">As Vendor (Won)</p>
            <p className="text-lg font-semibold text-content-primary tabular-nums mt-1">{vendorCount}</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-surface border border-subtle rounded p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search tenders by title, buyer, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded border border-subtle bg-app text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 p-1 bg-app rounded border border-subtle">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  filterStatus === 'all'
                    ? 'bg-brand-navy text-white'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  filterStatus === 'active'
                    ? 'bg-brand-navy text-white'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  filterStatus === 'completed'
                    ? 'bg-brand-navy text-white'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-app rounded border border-subtle">
              <button
                onClick={() => setFilterRole('all')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  filterRole === 'all'
                    ? 'bg-brand-navy text-white'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                All Roles
              </button>
              <button
                onClick={() => setFilterRole('buyer')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  filterRole === 'buyer'
                    ? 'bg-brand-navy text-white'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                Buyer ({buyerCount})
              </button>
              <button
                onClick={() => setFilterRole('vendor')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  filterRole === 'vendor'
                    ? 'bg-brand-navy text-white'
                    : 'text-content-secondary hover:text-content-primary'
                }`}
              >
                Vendor ({vendorCount})
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-status-rejected-bg border border-subtle rounded p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-status-rejected-text flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-status-rejected-text text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Ongoing Tenders Grid / Cards */}
        {filteredTenders.length === 0 ? (
          <div className="bg-surface rounded border border-subtle p-12 text-center">
            <div className="w-14 h-14 mx-auto bg-app rounded border border-subtle flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-content-primary mb-1">No Tenders Found</h2>
            <p className="text-content-secondary text-sm mb-6 max-w-md mx-auto">
              {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                ? 'No tenders matched your current filter criteria.'
                : 'Once you accept bids or have your bids accepted, ongoing tenders and contracts will appear here.'}
            </p>
            <button
              onClick={() => router.push('/home')}
              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredTenders.map((tender) => (
              <div
                key={tender.award_id}
                className="bg-surface rounded border border-subtle p-5 hover:border-brand-blue transition-all group relative overflow-hidden"
              >
                {/* Top ribbon / indicator */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-content-muted text-xs font-medium tabular-nums">
                      Tender #{tender.tender_id} • Award #{tender.award_id}
                    </span>
                    {tender.contract_status === 'Completed' ? (
                      <span className="badge-status badge-approved"><span className="badge-dot" />Contract Completed</span>
                    ) : (
                      <span className="badge-status badge-pending"><span className="badge-dot" />Active / In Progress</span>
                    )}
                    {tender.role_in_tender === 'buyer' ? (
                      <span className="badge-status badge-draft"><span className="badge-dot" />Your Org: Buyer</span>
                    ) : (
                      <span className="badge-status badge-approved"><span className="badge-dot" />Your Org: Winning Vendor</span>
                    )}
                  </div>

                  <div className="text-xs text-content-secondary font-medium">
                    Awarded: <strong className="text-content-primary">{formatDate(tender.awarded_at)}</strong>
                  </div>
                </div>

                {/* Main content */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-content-primary mb-1 group-hover:text-brand-blue transition-colors">
                      {tender.tender_title}
                    </h3>
                    {tender.tender_description && (
                      <p className="text-content-secondary text-sm line-clamp-2 mb-3 leading-relaxed">
                        {tender.tender_description}
                      </p>
                    )}

                    {/* Parties involved */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-2 bg-app px-3 py-1.5 rounded border border-subtle">
                        <span className="text-content-muted font-medium uppercase">Buyer:</span>
                        <strong className="text-content-primary">{tender.buyer_org_name}</strong>
                      </div>
                      <div className="flex items-center gap-2 bg-status-approved-bg px-3 py-1.5 rounded border border-subtle">
                        <span className="text-status-approved-text font-medium uppercase">Winning Vendor:</span>
                        <strong className="text-status-approved-text">{tender.vendor_org_name}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Action button */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between w-full lg:w-auto gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-subtle min-w-[220px]">
                    <div>
                      <p className="text-content-secondary text-xs font-medium uppercase tracking-wider lg:text-right mb-0.5">
                        Awarded Contract Value
                      </p>
                      <p className="text-lg font-semibold text-content-primary lg:text-right tabular-nums">
                        <span className="text-content-muted text-sm font-medium mr-1">৳</span>
                        {tender.winning_bid_amount?.toLocaleString() || '0'}
                      </p>
                    </div>

                    <button
                      onClick={() => router.push(`/ongoing-tenders/${tender.tender_id}`)}
                      className="w-full sm:w-auto bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded flex items-center justify-center gap-2"
                    >
                      View Details
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
