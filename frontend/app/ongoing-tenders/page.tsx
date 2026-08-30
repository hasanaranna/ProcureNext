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
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-accent-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-300 text-lg font-medium">Loading ongoing tenders...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="max-w-6xl mx-auto animate-fade-in">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <button
              onClick={() => router.push('/home')}
              className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium text-sm">Back to Dashboard</span>
            </button>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Ongoing Tenders & Awards
              <span className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">
                Live
              </span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base">
              Track awarded contracts, monitor counterpart progress, and view fulfillment details.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/home')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl border border-white/10 transition"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Ongoing Tenders</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-black text-white">{tenders.length}</p>
              <div className="w-10 h-10 bg-accent-500/20 rounded-xl flex items-center justify-center text-accent-400 text-lg">
                📋
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Contract Volume</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-2xl font-black text-emerald-400">৳ {totalValue.toLocaleString()}</p>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 text-lg">
                💰
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">As Buyer (Awarded)</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-black text-cyan-300">{buyerCount}</p>
              <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-300 text-lg">
                🛒
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">As Vendor (Won)</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-black text-purple-300">{vendorCount}</p>
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-300 text-lg">
                🏆
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search tenders by title, buyer, or vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 text-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center gap-1 p-1 bg-navy-950/60 rounded-xl border border-white/10">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-accent-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'active'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ⚡ Active ({activeCount})
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterStatus === 'completed'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ✓ Completed ({completedCount})
              </button>
            </div>

            {/* Role Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-navy-950/60 rounded-xl border border-white/10">
              <button
                onClick={() => setFilterRole('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterRole === 'all'
                    ? 'bg-accent-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Roles
              </button>
              <button
                onClick={() => setFilterRole('buyer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterRole === 'buyer'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Buyer ({buyerCount})
              </button>
              <button
                onClick={() => setFilterRole('vendor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterRole === 'vendor'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vendor ({vendorCount})
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-8 flex items-start gap-3">
            <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Ongoing Tenders Grid / Cards */}
        {filteredTenders.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-12 text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Tenders Found</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm">
              {searchTerm || filterRole !== 'all' || filterStatus !== 'all'
                ? 'No tenders matched your current filter criteria.'
                : 'Once you accept bids or have your bids accepted, ongoing tenders and contracts will appear here.'}
            </p>
            <button
              onClick={() => router.push('/home')}
              className="px-6 py-2.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold rounded-xl hover:from-accent-600 hover:to-accent-700 transition shadow-lg"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filteredTenders.map((tender) => (
              <div
                key={tender.award_id}
                className="bg-white rounded-2xl p-6 shadow-xl border-2 border-slate-200 hover:border-accent-400 transition-all duration-300 group relative overflow-hidden"
              >
                {/* Top ribbon / indicator */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Tender #{tender.tender_id} • Award #{tender.award_id}
                    </span>
                    {tender.contract_status === 'Completed' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        ✓ Contract Completed
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                        ⚡ Active / In Progress
                      </span>
                    )}
                    {tender.role_in_tender === 'buyer' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
                        Your Org: Buyer
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                        Your Org: Winning Vendor
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    Awarded: <strong className="text-slate-700">{formatDate(tender.awarded_at)}</strong>
                  </div>
                </div>

                {/* Main content */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-navy-900 mb-2 group-hover:text-accent-600 transition-colors">
                      {tender.tender_title}
                    </h3>
                    {tender.tender_description && (
                      <p className="text-slate-600 text-sm line-clamp-2 mb-4 leading-relaxed">
                        {tender.tender_description}
                      </p>
                    )}

                    {/* Parties involved */}
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-slate-400 font-semibold uppercase">Buyer:</span>
                        <strong className="text-navy-900">{tender.buyer_org_name}</strong>
                      </div>
                      <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <span className="text-emerald-600 font-semibold uppercase">Winning Vendor:</span>
                        <strong className="text-emerald-900">{tender.vendor_org_name}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Action button */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between w-full lg:w-auto gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 min-w-[220px]">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider lg:text-right mb-0.5">
                        Awarded Contract Value
                      </p>
                      <p className="text-2xl font-black text-navy-900 lg:text-right">
                        <span className="text-slate-400 text-base font-semibold mr-1">৳</span>
                        {tender.winning_bid_amount?.toLocaleString() || '0'}
                      </p>
                    </div>

                    <button
                      onClick={() => router.push(`/ongoing-tenders/${tender.tender_id}`)}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-accent-600 hover:to-accent-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
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
