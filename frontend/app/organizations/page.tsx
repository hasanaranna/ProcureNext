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

interface EnlistedSeller {
  organization_id: number;
  organization_name: string;
  address: string | null;
  verification_status: string;
  enlisted_at: string | null;
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
  const [view, setView] = useState<'all' | 'enlisted'>('all');
  const [enlistedSellers, setEnlistedSellers] = useState<EnlistedSeller[]>([]);
  const [enlistedLoading, setEnlistedLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchEnlistedSellers = useCallback(async () => {
    try {
      const res = await fetch('/api/org/enlisted');
      if (res.ok) setEnlistedSellers(await res.json());
    } catch (err) {
      console.error('Failed to fetch enlisted sellers:', err);
    } finally {
      setEnlistedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEnlistedSellers();
  }, [fetchEnlistedSellers]);

  const handleRemoveEnlisted = async (seller: EnlistedSeller) => {
    if (!confirm(`Remove ${seller.organization_name} from your enlisted sellers? They will lose access to your enlisted-only tenders.`)) return;
    setRemovingId(seller.organization_id);
    try {
      const res = await fetch(`/api/org/enlist/${seller.organization_id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to remove seller');
      }
      setEnlistedSellers((prev) => prev.filter((s) => s.organization_id !== seller.organization_id));
      setOrganizations((prev) =>
        prev.map((o) => (o.organization_id === seller.organization_id ? { ...o, is_enlisted: false } : o))
      );
      setNotification({ message: `Removed ${seller.organization_name} from your enlisted sellers.`, type: 'success' });
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to remove seller', type: 'error' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setRemovingId(null);
    }
  };

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
          ? `Removed ${org.organization_name} from your enlisted sellers.`
          : `Enlisted ${org.organization_name} as a seller.`,
        type: 'success',
      });
      setTimeout(() => setNotification(null), 3500);
      fetchEnlistedSellers();
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

  const totalEnlisted = enlistedSellers.length;
  const buyerCount = organizations.filter((o) => o.organization_type === 'Buyer').length;
  const vendorCount = organizations.filter((o) => o.organization_type === 'Vendor').length;

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-app">
      <div className="max-w-6xl mx-auto animate-fade-in">
        {/* Toast Notification */}
        {notification && (
          <div
            className={`fixed top-6 right-6 z-50 px-5 py-3 rounded border border-subtle text-sm font-medium flex items-center gap-3 animate-fade-in ${
              notification.type === 'success'
                ? 'bg-status-approved-bg text-status-approved-text'
                : 'bg-status-rejected-bg text-status-rejected-text'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-status-approved-text' : 'bg-status-rejected-text'}`} />
            <span>{notification.message}</span>
          </div>
        )}

        {/* Top Header & Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <button
              onClick={() => router.push('/home')}
              className="mb-4 flex items-center gap-2 text-content-muted hover:text-content-primary transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium text-sm">Back to Dashboard</span>
            </button>
            <h1 className="text-3xl md:text-4xl font-semibold text-content-primary tracking-tight flex items-center gap-3">
              Organization Directory
              <span className="text-xs px-3 py-1 bg-brand-navy text-white rounded font-bold">
                Network
              </span>
            </h1>
            <p className="text-content-secondary mt-2 text-sm md:text-base">
              Find verified organizations, view official credentials, and enlist trusted sellers for your enlisted-only tenders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/ongoing-tenders')}
              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
            >
              Ongoing Tenders
            </button>
            <button
              onClick={() => router.push('/home')}
              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface rounded border border-subtle p-5">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">Organizations Found</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-semibold text-content-primary tabular-nums">{organizations.length}</p>
              <div className="w-10 h-10 bg-brand-navy rounded flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded border border-subtle p-5">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">Your Enlisted Sellers</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-semibold text-content-primary tabular-nums">{totalEnlisted}</p>
              <div className="w-10 h-10 bg-brand-blue rounded flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded border border-subtle p-5">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">Buyer Organizations</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-semibold text-content-primary tabular-nums">{buyerCount}</p>
              <div className="w-10 h-10 bg-brand-navy rounded flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded border border-subtle p-5">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider">Vendors & Suppliers</p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-3xl font-semibold text-content-primary tabular-nums">{vendorCount}</p>
              <div className="w-10 h-10 bg-brand-navy rounded flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface rounded border border-subtle mb-4 w-fit">
          {([
            { value: 'all', label: 'All Organizations' },
            { value: 'enlisted', label: `My Enlisted Sellers (${enlistedSellers.length})` },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setView(opt.value)}
              className={`px-3.5 py-1.5 rounded text-xs font-medium transition-all ${
                view === opt.value ? 'bg-brand-navy text-white' : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {view === 'all' ? (
        <>
        {/* Filter & Search Bar */}
        <div className="bg-surface border border-subtle rounded p-4 mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-content-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search organizations by name, trade specialty, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded border border-subtle bg-app text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue text-sm"
            />
          </div>

          {/* Type Toggle Pills & Verified Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-app rounded border border-subtle">
              {(['All', 'Buyer', 'Vendor'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3.5 py-1.5 rounded text-xs font-medium transition-all ${
                    typeFilter === t
                      ? 'bg-brand-navy text-white'
                      : 'text-content-secondary hover:text-content-primary'
                  }`}
                >
                  {t === 'All' ? 'All' : t === 'Buyer' ? 'Buyers' : 'Vendors'}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded bg-app border border-subtle text-xs font-medium text-content-secondary hover:text-content-primary transition">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-subtle text-brand-blue focus:ring-brand-blue focus:ring-offset-0"
              />
              <span>Verified Only</span>
            </label>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-status-rejected-bg border border-subtle rounded p-4 mb-8 flex items-start gap-3">
            <svg className="w-6 h-6 text-status-rejected-text flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-status-rejected-text font-medium">{error}</p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="text-center">
              <svg className="animate-spin h-10 w-10 text-content-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-content-muted text-sm font-medium">Searching organizations...</p>
            </div>
          </div>
        ) : displayedOrgs.length === 0 ? (
          <div className="bg-surface rounded border border-subtle p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-app rounded flex items-center justify-center mb-6 border border-subtle">
              <svg className="w-10 h-10 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-content-primary mb-2">No Organizations Found</h2>
            <p className="text-content-secondary mb-6 max-w-md mx-auto text-sm">
              We couldn't find any organizations matching &ldquo;{searchQuery}&rdquo;. Try another search term or clear the filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('All');
                setVerifiedOnly(false);
              }}
              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
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
                  className="bg-surface rounded border border-subtle hover:border-brand-blue p-6 transition-all duration-300 group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Avatar, Name & Badges */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-12 h-12 rounded flex items-center justify-center text-xl font-semibold text-white flex-shrink-0 ${
                            isBuyer
                              ? 'bg-brand-navy'
                              : 'bg-brand-blue'
                          }`}
                        >
                          {org.organization_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-content-primary group-hover:text-brand-blue transition-colors truncate">
                            {org.organization_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                isBuyer
                                  ? 'bg-status-draft-bg text-status-draft-text'
                                  : 'bg-status-pending-bg text-status-pending-text'
                              }`}
                            >
                              {org.organization_type}
                            </span>
                            <span
                              className={`badge-status ${
                                isVerified
                                  ? 'badge-approved'
                                  : 'badge-pending'
                              }`}
                            >
                              <span className="badge-dot" />
                              {isVerified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Enlist / Enlisted Button */}
                      <button
                        onClick={(e) => handleToggleEnlist(e, org)}
                        disabled={enlistingId === org.organization_id}
                        className={`px-3.5 py-1.5 rounded text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
                          org.is_enlisted
                            ? 'bg-status-approved-bg hover:bg-status-rejected-bg text-status-approved-text hover:text-status-rejected-text border border-subtle'
                            : 'bg-brand-navy hover:bg-slate-900 text-white'
                        }`}
                        title={org.is_enlisted ? 'Remove from your enlisted sellers' : 'Enlist as a seller for your enlisted-only tenders'}
                      >
                        {enlistingId === org.organization_id ? (
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : org.is_enlisted ? (
                          <>
                            <svg className="w-4 h-4 text-status-approved-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            <span>Enlisted</span>
                          </>
                        ) : (
                          <>
                            <span>+</span>
                            <span>Enlist seller</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-content-secondary text-xs line-clamp-2 leading-relaxed mb-4">
                      {org.description || 'No organization overview provided.'}
                    </p>
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-3 border-t border-subtle flex flex-wrap items-center justify-between gap-2 text-xs text-content-secondary">
                    <div className="flex items-center gap-1 truncate max-w-[220px]">
                      <svg className="w-3.5 h-3.5 text-content-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{org.address || 'Address not listed'}</span>
                    </div>

                    <span className="text-brand-blue font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      View Profile →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        ) : (
          <div className="bg-surface rounded border border-subtle overflow-hidden">
            <div className="px-5 py-4 border-b border-subtle">
              <h2 className="text-sm font-semibold text-content-primary">My Enlisted Sellers</h2>
              <p className="text-xs text-content-secondary mt-0.5">
                These organizations can see and bid on your enlisted-only tenders.
              </p>
            </div>
            {enlistedLoading ? (
              <div className="py-12 text-center text-sm text-content-muted">Loading enlisted sellers…</div>
            ) : enlistedSellers.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-sm font-semibold text-content-primary">You haven&apos;t enlisted any sellers yet</p>
                <p className="text-xs text-content-muted mt-1 mb-4">
                  Enlist trusted sellers from the directory to give them access to your enlisted-only tenders.
                </p>
                <button
                  onClick={() => setView('all')}
                  className="bg-brand-navy text-white hover:bg-slate-900 text-xs font-medium h-8 px-3 rounded transition"
                >
                  Browse organizations
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-app text-content-secondary uppercase text-xs tracking-wider">
                    <th className="px-5 py-2.5 text-left font-medium">Organization</th>
                    <th className="px-5 py-2.5 text-left font-medium">Address</th>
                    <th className="px-5 py-2.5 text-left font-medium">Status</th>
                    <th className="px-5 py-2.5 text-left font-medium">Enlisted</th>
                    <th className="px-5 py-2.5 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {enlistedSellers.map((seller) => (
                    <tr key={seller.organization_id} className="hover:bg-app transition">
                      <td className="px-5 py-3">
                        <button
                          onClick={() => router.push(`/organizations/${seller.organization_id}`)}
                          className="font-medium text-content-primary hover:text-brand-blue text-left"
                        >
                          {seller.organization_name}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-content-secondary">{seller.address || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`badge-status ${seller.verification_status === 'Verified' ? 'badge-approved' : 'badge-pending'}`}>
                          <span className="badge-dot" />
                          {seller.verification_status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-content-muted tabular-nums">
                        {seller.enlisted_at ? new Date(seller.enlisted_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          disabled={removingId === seller.organization_id}
                          onClick={() => handleRemoveEnlisted(seller)}
                          className="px-3 py-1.5 rounded text-xs font-medium text-status-rejected-text bg-status-rejected-bg hover:opacity-80 transition disabled:opacity-50"
                        >
                          {removingId === seller.organization_id ? 'Removing…' : 'Remove'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
