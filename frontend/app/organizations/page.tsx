'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface OrganizationItem {
  organization_id: number;
  organization_name: string;
  organization_type: 'Buyer' | 'Vendor';
  address: string | null;
  website: string | null;
  description: string | null;
  verification_status: 'Verified' | 'Pending' | 'Rejected';
  tin_number: string | null;
  bin_number: string | null;
  created_at: string | null;
  is_enlisted: boolean;
}

export default function OrganizationsDirectoryPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Buyer' | 'Vendor'>('All');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [enlistingId, setEnlistingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchOrganizations = useCallback(async (query: string, type: string) => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (type !== 'All') params.set('type', type);

      const res = await fetch(`/api/org/search?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch organizations');
      }
      const data = await res.json();
      setOrganizations(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrganizations(searchQuery, typeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter, fetchOrganizations]);

  const handleToggleEnlist = async (e: React.MouseEvent, org: OrganizationItem) => {
    e.stopPropagation();
    setEnlistingId(org.organization_id);

    const isCurrentlyEnlisted = org.is_enlisted;
    const targetId = org.organization_id;

    // Optimistic UI update
    setOrganizations((prev) =>
      prev.map((o) =>
        o.organization_id === targetId ? { ...o, is_enlisted: !isCurrentlyEnlisted } : o
      )
    );

    try {
      const endpoint = `/api/org/enlist/${targetId}`;
      const method = isCurrentlyEnlisted ? 'DELETE' : 'POST';
      const res = await fetch(endpoint, { method });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to update enlistment');
      }

      setNotification({
        message: isCurrentlyEnlisted
          ? `Removed ${org.organization_name} from your enlisted list.`
          : `Enlisted ${org.organization_name} successfully!`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      // Revert optimistic update
      setOrganizations((prev) =>
        prev.map((o) =>
          o.organization_id === targetId ? { ...o, is_enlisted: isCurrentlyEnlisted } : o
        )
      );
      setNotification({
        message: err.message || 'Failed to update enlistment status',
        type: 'error',
      });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setEnlistingId(null);
    }
  };

  const displayedOrgs = organizations.filter((org) => {
    if (verifiedOnly && org.verification_status !== 'Verified') return false;
    return true;
  });

  const totalEnlisted = organizations.filter((o) => o.is_enlisted).length;
  const buyerCount = organizations.filter((o) => o.organization_type === 'Buyer').length;
  const vendorCount = organizations.filter((o) => o.organization_type === 'Vendor').length;

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="max-w-6xl mx-auto animate-fade-in">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-semibold flex items-center gap-3 animate-fade-in ${
              notification.type === 'success'
                ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500/50 backdrop-blur-md'
                : 'bg-red-900/90 text-red-200 border-red-500/50 backdrop-blur-md'
            }`}
          >
            <span>{notification.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{notification.message}</span>
          </div>
        )}

        {/* Top Header & Navigation */}
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
              Organization Directory
              <span className="text-xs px-3 py-1 bg-accent-500/20 text-accent-300 border border-accent-500/30 rounded-full font-bold">
                Network
              </span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm md:text-base">
              Find verified buyers and suppliers, view official credentials, and add them to your enlisted network.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/ongoing-tenders')}
              className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-sm font-semibold rounded-xl transition"
            >
              📋 Ongoing Tenders
            </button>
            <button
              onClick={() => router.push('/home')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white text-sm font-semibold rounded-xl border border-white/10 transition"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Organizations Found</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-black text-white">{organizations.length}</p>
              <div className="w-10 h-10 bg-accent-500/20 rounded-xl flex items-center justify-center text-accent-400 text-lg">
                🌐
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">In Your Enlisted Network</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-black text-emerald-400">{totalEnlisted}</p>
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 text-lg">
                ⭐
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Buyer Organizations</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-black text-cyan-300">{buyerCount}</p>
              <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-300 text-lg">
                🛒
              </div>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-5 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Vendors & Suppliers</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-black text-purple-300">{vendorCount}</p>
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-300 text-lg">
                🏪
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search organizations by name, trade specialty, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 text-sm"
            />
          </div>

          {/* Type Toggle Pills & Verified Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-navy-950/60 rounded-xl border border-white/10">
              {(['All', 'Buyer', 'Vendor'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    typeFilter === t
                      ? 'bg-accent-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t === 'All' ? 'All' : t === 'Buyer' ? '🛒 Buyers' : '🏪 Vendors'}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-xl bg-navy-950/60 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-400 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-0"
              />
              <span>Verified Only</span>
            </label>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-8 flex items-start gap-3">
            <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-accent-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-slate-300 text-sm font-medium">Searching organizations...</p>
            </div>
          </div>
        ) : displayedOrgs.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-12 text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Organizations Found</h2>
            <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm">
              We couldn't find any organizations matching &ldquo;{searchQuery}&rdquo;. Try another search term or clear the filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('All');
                setVerifiedOnly(false);
              }}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl border border-white/10 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {displayedOrgs.map((org) => {
              const isBuyer = org.organization_type === 'Buyer';
              const isVerified = org.verification_status === 'Verified';

              return (
                <div
                  key={org.organization_id}
                  onClick={() => router.push(`/organizations/${org.organization_id}`)}
                  className="bg-white rounded-2xl p-6 shadow-xl border-2 border-slate-200 hover:border-accent-400 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Avatar, Name & Badges */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0 shadow-md ${
                            isBuyer
                              ? 'bg-gradient-to-br from-cyan-500 to-blue-600'
                              : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                          }`}
                        >
                          {org.organization_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-navy-900 group-hover:text-accent-600 transition-colors truncate">
                            {org.organization_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isBuyer
                                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {org.organization_type}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1 ${
                                isVerified
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {isVerified ? '✓ Verified' : '⏳ Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Enlist / Enlisted Button */}
                      <button
                        onClick={(e) => handleToggleEnlist(e, org)}
                        disabled={enlistingId === org.organization_id}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0 ${
                          org.is_enlisted
                            ? 'bg-emerald-100 hover:bg-red-50 text-emerald-800 hover:text-red-700 border border-emerald-300 hover:border-red-300'
                            : 'bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-700 hover:to-accent-600 text-white'
                        }`}
                        title={org.is_enlisted ? 'Click to un-enlist' : 'Click to enlist'}
                      >
                        {enlistingId === org.organization_id ? (
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : org.is_enlisted ? (
                          <>
                            <span className="text-emerald-700 font-black">✓</span>
                            <span>Enlisted</span>
                          </>
                        ) : (
                          <>
                            <span>+</span>
                            <span>Enlist</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed mb-4">
                      {org.description || 'No organization overview provided.'}
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1 truncate max-w-[220px]">
                      <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{org.address || 'Address not listed'}</span>
                    </div>

                    <span className="text-accent-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      View Profile →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
