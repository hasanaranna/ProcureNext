'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TenderCard from '@/components/TenderCard';
import SlidingToggle from '@/components/SlidingToggle';
import MessagingSidebar from '@/components/MessagingSidebar';
import OrgManagementModal from '@/components/OrgManagementModal';

export default function HomePage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [upperCollapsed, setUpperCollapsed] = useState(false);
  const [mode, setMode] = useState<'buyer' | 'seller'>('buyer');
  const [activeTab, setActiveTab] = useState<'recommended' | 'enlisted'>('recommended');
  const [modeFadeIn, setModeFadeIn] = useState(true);
  const [tabFadeIn, setTabFadeIn] = useState(true);
  const [showOrgManagement, setShowOrgManagement] = useState(false);

  // Load user data from localStorage
  const [userData, setUserData] = useState<{
    full_name?: string;
    email?: string;
    organization_name?: string;
    role_in_org?: string;
  }>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        setUserData(JSON.parse(stored));
      }
    } catch { }
  }, []);

  const handleModeSwitch = (newMode: 'buyer' | 'seller') => {
    if (newMode === mode) return;
    setModeFadeIn(false);
    setTabFadeIn(false);
    setTimeout(() => {
      setMode(newMode);
      setActiveTab('recommended');
      setModeFadeIn(true);
      setTabFadeIn(true);
    }, 200);
  };

  const handleTabSwitch = (tab: 'recommended' | 'enlisted') => {
    if (tab === activeTab) return;
    setTabFadeIn(false);
    setTimeout(() => {
      setActiveTab(tab);
      setTabFadeIn(true);
    }, 200);
  };

  // Tender data fetched from DB
  interface TenderItem {
    tender_id: number;
    title: string;
    description: string;
    status: string;
    buyer_org_name: string;
    submission_deadline: string | null;
    created_at: string;
  }

  const [buyerTenders, setBuyerTenders] = useState<TenderItem[]>([]);
  const [sellerTenders, setSellerTenders] = useState<TenderItem[]>([]);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'accepted'>('all');
  const [enlistedOrgs, setEnlistedOrgs] = useState<Array<{ organization_id: number; organization_name: string; organization_type: string }>>([]);

  // Fetch tenders when mode or activeTab changes
  useEffect(() => {
    const fetchTenders = async () => {
      setTendersLoading(true);
      try {
        if (mode === 'buyer') {
          const res = await fetch('/api/tenders/buyer/my-tenders');
          if (res.ok) {
            const data = await res.json();
            setBuyerTenders(data);
          }
        } else {
          const endpoint = activeTab === 'enlisted'
            ? '/api/tenders/seller/all-tenders?enlisted_only=true'
            : '/api/tenders/seller/all-tenders';
          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            setSellerTenders(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch tenders:', err);
      } finally {
        setTendersLoading(false);
      }
    };
    fetchTenders();
  }, [mode, activeTab]);

  // Fetch enlisted organizations
  useEffect(() => {
    const fetchEnlisted = async () => {
      try {
        const res = await fetch('/api/org/enlisted');
        if (res.ok) {
          const data = await res.json();
          setEnlistedOrgs(data);
        }
      } catch (err) {
        console.error('Failed to fetch enlisted orgs:', err);
      }
    };
    fetchEnlisted();
  }, []);

  const user = {
    name: userData.full_name || 'User',
    email: userData.email || 'user@example.com',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name || 'User')}&background=0d9488&color=fff&bold=true`,
    orgName: userData.organization_name || 'Organization',
    role: userData.role_in_org || 'Owner',
  };

  const isOwner = user.role === 'Owner';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Sidebar nav items
  const navItems = [
    { label: 'Find Organizations', href: '/organizations', icon: (<svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>) },
    { label: 'Ongoing Tenders', href: '/ongoing-tenders', icon: (<svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>) },
    { label: 'Update Credentials', href: '#', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
    { label: 'Change Password', href: '#', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>) },
    { label: 'Payment Methods', href: '#', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10a1 1 0 011-1h16a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6V4a2 2 0 012-2h6a2 2 0 012 2v2" /></svg>) },
    { label: 'Manage Tokens', href: '#', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
  ];

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Toggle / Close */}
      <div className="p-4 flex items-center justify-between">
        {(sidebarOpen || isMobile) && <h2 className="text-lg font-bold text-white">Menu</h2>}
        <button
          onClick={() => isMobile ? setMobileSidebarOpen(false) : setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
          title={sidebarOpen ? 'Collapse' : 'Expand'}
        >
          <svg className={`w-5 h-5 transition-transform ${!isMobile && sidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* User Profile */}
      <div className="px-4 py-5 border-b border-white/10 bg-white/5">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 flex-shrink-0 mb-3 ring-2 ring-accent-400/50 rounded-full overflow-hidden shadow-lg">
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
          {(sidebarOpen || isMobile) && (
            <>
              <h3 className="font-bold text-white text-base">{user.name}</h3>
              <p className="text-slate-400 text-xs mt-0.5 break-words">{user.email}</p>
              <p className="text-slate-500 text-xs mt-2 font-medium">{user.orgName}</p>
              {isOwner ? (
                <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">Owner</span>
              ) : user.role ? (
                <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-accent-400/20 text-accent-300 border border-accent-400/30">
                  {user.role.replace(/([a-z])([A-Z])/g, '$1 $2')}
                </span>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item, i) => (
            <li key={i}>
              <button
                onClick={() => {
                  if (item.href && item.href !== '#') {
                    router.push(item.href);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-left"
              >
                {item.icon}
                {(sidebarOpen || isMobile) && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-semibold text-sm">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {(sidebarOpen || isMobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-screen bg-slate-50">
        {/* ── Desktop Sidebar ──────────────────────── */}
        <div className={`hidden md:flex bg-gradient-to-b from-navy-950 to-navy-900 ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex-col overflow-y-auto shadow-2xl flex-shrink-0`}>
          <SidebarContent />
        </div>

        {/* ── Mobile Sidebar Overlay ───────────────── */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-navy-950 to-navy-900 shadow-2xl animate-slide-up" style={{ animationName: 'none', transform: 'none' }}>
              <SidebarContent isMobile />
            </div>
          </div>
        )}

        {/* ── Main Content ─────────────────────────── */}
        <div className="flex-1 overflow-auto flex flex-col min-w-0">
          {/* Upper Section */}
          <div className="bg-gradient-to-r from-navy-900 to-navy-800 flex flex-col justify-center flex-shrink-0 relative">
            <div className="p-4 md:p-6 pb-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Mobile hamburger */}
              <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden p-2 rounded-xl bg-white/10 text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Title */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-black text-white mb-0.5">
                  {mode === 'buyer' ? 'Buyer Dashboard' : 'Seller Dashboard'}
                </h1>
                <p className="text-slate-400 text-sm">
                  {mode === 'buyer'
                    ? 'Welcome back! Manage your procurement activities here.'
                    : 'Welcome back! Manage your vendor activities here.'}
                </p>
              </div>

              {/* Right Controls */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <SlidingToggle
                  options={[
                    { value: 'buyer', label: '🛒 Buyer' },
                    { value: 'seller', label: '🏪 Seller' },
                  ]}
                  value={mode}
                  onChange={(v) => handleModeSwitch(v as 'buyer' | 'seller')}
                />

                {/* Search */}
                <div className="flex-1 md:flex-initial" style={{ minWidth: '180px' }}>
                  <input type="text" placeholder="Search tenders..."
                    className="w-full px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white/15 transition text-sm" />
                </div>

                {/* Token capsule */}
                <div className="rounded-xl px-4 py-2 flex items-center gap-2 whitespace-nowrap bg-white/10 border border-white/10">
                  <span className="text-slate-400 text-sm font-medium">Tokens:</span>
                  <span className="text-white text-lg font-black">250</span>
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                {isOwner && (
                  <button onClick={() => setShowOrgManagement(true)}
                    className="rounded-xl px-4 py-2 flex items-center gap-2 whitespace-nowrap font-semibold text-sm transition-all duration-200 bg-accent-500/20 text-accent-300 border border-accent-500/30 hover:bg-accent-500/30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="hidden sm:inline">Org Management</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stats - Collapsible */}
            <div className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{ maxHeight: upperCollapsed ? '0px' : '500px', opacity: upperCollapsed ? 0 : (modeFadeIn ? 1 : 0) }}>
              <div className="px-4 md:px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                  {mode === 'buyer' ? (
                    <>
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-400 text-xs font-semibold">Total Published Tenders</p>
                            <p className="text-2xl font-black text-white mt-1">{buyerTenders.filter(t => t.status === 'Published').length}</p>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">📊</div>
                        </div>
                      </div>
                      <div
                        onClick={() => router.push('/ongoing-tenders')}
                        className="bg-white/10 hover:bg-white/15 rounded-2xl p-4 border border-white/10 backdrop-blur-sm cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-slate-400 text-xs font-semibold group-hover:text-emerald-300 transition-colors">Accepted / Ongoing Tenders</p>
                              <span className="text-xs text-slate-400">→</span>
                            </div>
                            <p className="text-2xl font-black text-white mt-1">{buyerTenders.filter(t => t.status === 'Awarded').length}</p>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">📦</div>
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm sm:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-slate-400 text-xs font-semibold">
                            Enlisted Vendors ({enlistedOrgs.filter(o => o.organization_type === 'Vendor').length})
                          </p>
                          <button
                            onClick={() => router.push('/organizations')}
                            className="text-xs text-accent-300 hover:text-white font-bold transition flex items-center gap-1"
                          >
                            + Find Vendors →
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {enlistedOrgs.filter(o => o.organization_type === 'Vendor').length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No vendors enlisted yet. Explore the directory to enlist trusted suppliers.</span>
                          ) : (
                            enlistedOrgs.filter(o => o.organization_type === 'Vendor').map(v => (
                              <button
                                key={v.organization_id}
                                onClick={() => router.push(`/organizations/${v.organization_id}`)}
                                className="px-3 py-1 rounded-full text-xs text-white bg-white/10 hover:bg-white/20 border border-white/10 font-medium transition cursor-pointer flex items-center gap-1"
                              >
                                <span>⭐</span>
                                <span>{v.organization_name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-slate-400 text-xs font-semibold">Tenders Bid On</p>
                            <p className="text-2xl font-black text-white mt-1">15</p>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">📊</div>
                        </div>
                      </div>
                      <div
                        onClick={() => router.push('/ongoing-tenders')}
                        className="bg-white/10 hover:bg-white/15 rounded-2xl p-4 border border-white/10 backdrop-blur-sm cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-slate-400 text-xs font-semibold group-hover:text-emerald-300 transition-colors">Accepted Bids / Ongoing</p>
                              <span className="text-xs text-slate-400">→</span>
                            </div>
                            <p className="text-2xl font-black text-white mt-1">6</p>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">✅</div>
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm sm:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-slate-400 text-xs font-semibold">
                            Enlisted Buyers ({enlistedOrgs.filter(o => o.organization_type === 'Buyer').length})
                          </p>
                          <button
                            onClick={() => router.push('/organizations')}
                            className="text-xs text-accent-300 hover:text-white font-bold transition flex items-center gap-1"
                          >
                            + Find Buyers →
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {enlistedOrgs.filter(o => o.organization_type === 'Buyer').length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No buyers enlisted yet. Explore the directory to find verified buyers.</span>
                          ) : (
                            enlistedOrgs.filter(o => o.organization_type === 'Buyer').map(b => (
                              <button
                                key={b.organization_id}
                                onClick={() => router.push(`/organizations/${b.organization_id}`)}
                                className="px-3 py-1 rounded-full text-xs text-white bg-white/10 hover:bg-white/20 border border-white/10 font-medium transition cursor-pointer flex items-center gap-1"
                              >
                                <span>⭐</span>
                                <span>{b.organization_name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Collapse chevron */}
          <div className="flex justify-center flex-shrink-0" style={{ marginTop: '-14px', marginBottom: '-14px', position: 'relative', zIndex: 10 }}>
            <button onClick={() => setUpperCollapsed(!upperCollapsed)}
              className="w-7 h-7 rounded-full shadow-lg flex items-center justify-center bg-navy-800 border-2 border-slate-300 text-slate-300 hover:bg-navy-700 transition-all duration-200"
              title={upperCollapsed ? 'Expand details' : 'Collapse details'}>
              <svg className={`w-4 h-4 transition-transform duration-300 ${upperCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          {/* Lower Section */}
          <div className="flex-1 bg-white overflow-y-auto">
            {mode === 'seller' && (
              <div className="pt-8 px-4 md:px-8 flex justify-center">
                <SlidingToggle
                  options={[
                    { value: 'recommended', label: 'Recommended For You' },
                    { value: 'enlisted', label: 'From My Enlisted Buyers' },
                  ]}
                  value={activeTab}
                  onChange={(v) => handleTabSwitch(v as 'recommended' | 'enlisted')}
                />
              </div>
            )}

            <div className="transition-opacity duration-200 p-4 md:p-8 pt-6" style={{ opacity: tabFadeIn ? 1 : 0 }}>
              {mode === 'buyer' ? (
                <>
                  <div className="rounded-xl p-4 md:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                      <h2 className="text-2xl font-black text-navy-900">Your Tenders</h2>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="bg-navy-900 rounded-xl px-4 py-2 flex items-center gap-2">
                          <label htmlFor="filter-dropdown" className="text-slate-300 font-medium text-sm">Filter:</label>
                          <select id="filter-dropdown"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="bg-white text-navy-900 font-medium text-sm outline-none cursor-pointer rounded-lg px-2 py-1">
                            <option value="all">Show All</option>
                            <option value="published">Published</option>
                            <option value="accepted">Accepted / Awarded</option>
                          </select>
                        </div>
                        <button onClick={() => router.push('/organizations')}
                          className="px-4 py-2 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-300 font-bold hover:bg-cyan-100 transition-all text-sm flex items-center gap-1.5 shadow-sm">
                          🌐 Find Organizations
                        </button>
                        <button onClick={() => router.push('/ongoing-tenders')}
                          className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100 transition-all text-sm flex items-center gap-1.5 shadow-sm">
                          📋 Ongoing Tenders
                        </button>
                        <button onClick={() => router.push('/new-tender')}
                          className="px-6 py-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold hover:from-accent-600 hover:to-accent-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] text-sm">
                          + Create Tender
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {tendersLoading ? (
                        <div className="col-span-full flex justify-center py-12">
                          <svg className="animate-spin h-8 w-8 text-accent-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      ) : buyerTenders.filter(t => filterStatus === 'all' ? true : filterStatus === 'published' ? t.status === 'Published' : (t.status === 'Awarded' || t.status === 'Accepted')).length === 0 ? (
                        <div className="col-span-full text-center py-16">
                          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-slate-400 text-lg font-medium">No tenders found matching your filter.</p>
                        </div>
                      ) : (
                        buyerTenders
                          .filter(t => filterStatus === 'all' ? true : filterStatus === 'published' ? t.status === 'Published' : (t.status === 'Awarded' || t.status === 'Accepted'))
                          .map((tender) => (
                            <TenderCard
                              key={tender.tender_id}
                              title={tender.title}
                              subtitle={tender.description}
                              vendor={tender.buyer_org_name}
                              onClick={() => router.push(`/view-my-tender/${tender.tender_id}`)}
                            />
                          ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl p-4 md:p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-black text-navy-900">Available Tenders</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button onClick={() => router.push('/organizations')}
                        className="px-4 py-2 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-300 font-bold hover:bg-cyan-100 transition-all text-sm flex items-center gap-1.5 shadow-sm">
                        🌐 Find Organizations
                      </button>
                      <button onClick={() => router.push('/ongoing-tenders')}
                        className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100 transition-all text-sm flex items-center gap-1.5 shadow-sm">
                        📋 Ongoing Tenders
                      </button>
                      <button onClick={() => router.push('/view-my-bids')}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold hover:from-accent-600 hover:to-accent-700 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] text-sm">
                        View My Bids
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {tendersLoading ? (
                      <div className="col-span-full flex justify-center py-12">
                        <svg className="animate-spin h-8 w-8 text-accent-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : sellerTenders.length === 0 ? (
                      <div className="col-span-full text-center py-16 bg-slate-50 rounded-2xl border border-slate-200">
                        <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        {activeTab === 'enlisted' ? (
                          <>
                            <p className="text-navy-900 text-lg font-bold">No tenders from your enlisted buyers</p>
                            <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto mb-4">
                              Enlist trusted buyer organizations from the directory to see their active and exclusive tenders here.
                            </p>
                            <button
                              onClick={() => router.push('/organizations')}
                              className="px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white font-bold text-xs rounded-xl transition shadow"
                            >
                              + Discover & Enlist Buyers
                            </button>
                          </>
                        ) : (
                          <p className="text-slate-400 text-lg font-medium">No tenders available at the moment.</p>
                        )}
                      </div>
                    ) : (
                      sellerTenders.map((tender) => (
                        <TenderCard
                          key={tender.tender_id}
                          title={tender.title}
                          subtitle={tender.description}
                          vendor={tender.buyer_org_name}
                          onClick={() => router.push(`/bid-for-tender?id=${tender.tender_id}`)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Toggle */}
        <button onClick={() => setRightSidebarOpen(true)}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 rounded-l-2xl shadow-2xl items-center justify-center transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgba(20, 184, 166, 0.3)',
            color: '#ffffff',
            width: '44px',
            height: '110px',
            opacity: rightSidebarOpen ? 0 : 1,
            pointerEvents: rightSidebarOpen ? 'none' : 'auto',
          }}
          title="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <MessagingSidebar isOpen={rightSidebarOpen} onClose={() => setRightSidebarOpen(false)} />
      </div>

      {/* Organization Management Modal */}
      <OrgManagementModal
        isOpen={showOrgManagement}
        onClose={() => setShowOrgManagement(false)}
      />
    </>
  );
}
