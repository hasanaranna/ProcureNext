'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TenderCard from '@/components/TenderCard';
import SlidingToggle from '@/components/SlidingToggle';
import MessagingSidebar from '@/components/MessagingSidebar';
import OrgManagementModal from '@/components/OrgManagementModal';
import ManageTokensModal from '@/components/ManageTokensModal';

export default function HomePage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [upperCollapsed, setUpperCollapsed] = useState(false);
  const [mode, setMode] = useState<'buyer' | 'seller'>('buyer');
  const [activeTab, setActiveTab] = useState<'recommended' | 'enlisted'>('recommended');
  const [modeFadeIn, setModeFadeIn] = useState(true);
  const [tabFadeIn, setTabFadeIn] = useState(true);
  const [showOrgManagement, setShowOrgManagement] = useState(false);
  const [showManageTokens, setShowManageTokens] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState<'unread' | 'read'>('unread');
  const notifModalRef = useRef<HTMLDivElement>(null);

  interface Notification {
    notification_id: number;
    user_id: number;
    title: string;
    message: string;
    type: string;
    action_url: string | null;
    is_read: boolean;
    created_at: string;
  }
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [notifRes, countRes] = await Promise.all([
          fetch('/api/notifications/list?status=all'),
          fetch('/api/notifications/unread-count'),
        ]);
        if (notifRes.ok) {
          const data = await notifRes.json();
          setNotifications(data);
        }
        if (countRes.ok) {
          const data = await countRes.json();
          setUnreadCount(data.count);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

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
      const cachedBalance = localStorage.getItem('org_token_balance');
      if (cachedBalance !== null && !isNaN(Number(cachedBalance))) {
        setTokenBalance(Number(cachedBalance));
        setLoadingBalance(false);
      }
    } catch { }

    // Fetch live organization token balance
    fetch('/api/payments/balance')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.credit_balance === 'number') {
          setTokenBalance(data.credit_balance);
          try {
            localStorage.setItem('org_token_balance', data.credit_balance.toString());
          } catch { }
        }
      })
      .catch((err) => console.error('Failed to fetch balance:', err))
      .finally(() => setLoadingBalance(false));
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
    // Present on seller-side results, which are ranked by the search endpoint.
    relevance_score?: number;
  }

  const [buyerTenders, setBuyerTenders] = useState<TenderItem[]>([]);
  const [sellerTenders, setSellerTenders] = useState<TenderItem[]>([]);
  const [tendersLoading, setTendersLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'accepted' | 'closed' | 'cancelled'>('all');
  const buyerTenderMatchesFilter = (t: TenderItem) => {
    switch (filterStatus) {
      case 'draft':
        return t.status === 'Draft';
      case 'published':
        return t.status === 'Published';
      case 'accepted':
        return t.status === 'Awarded' || t.status === 'Accepted';
      case 'closed':
        return t.status === 'Closed';
      case 'cancelled':
        return t.status === 'Cancelled';
      default:
        return true;
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const matchesSearch = (t: TenderItem) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.buyer_org_name.toLowerCase().includes(q)
    );
  };

  const filteredBuyerTenders = buyerTenders.filter(
    (t) => buyerTenderMatchesFilter(t) && matchesSearch(t),
  );
  // Seller results are already filtered and relevance-ranked by the search
  // endpoint. Re-applying the client-side substring filter here would discard
  // semantic matches that don't literally contain the typed text.
  const filteredSellerTenders = sellerTenders;
  const [enlistedOrgs, setEnlistedOrgs] = useState<Array<{ organization_id: number; organization_name: string; organization_type: string }>>([]);
  const [sellerBidCount, setSellerBidCount] = useState(0);
  const [sellerOngoingCount, setSellerOngoingCount] = useState(0);

  // Buyer mode: fetch the organization's own tenders (filtered client-side).
  useEffect(() => {
    if (mode !== 'buyer') return;

    const fetchBuyerTenders = async () => {
      setTendersLoading(true);
      try {
        const res = await fetch('/api/tenders/buyer/my-tenders');
        if (res.ok) {
          const data = await res.json();
          setBuyerTenders(data);
        }
      } catch (err) {
        console.error('Failed to fetch tenders:', err);
      } finally {
        setTendersLoading(false);
      }
    };
    fetchBuyerTenders();
  }, [mode]);

  // Seller mode: hybrid keyword + semantic search, ranked server-side.
  // Debounced so typing doesn't fire a request (and an embedding round-trip)
  // per keystroke.
  const searchRequestIdRef = useRef(0);

  useEffect(() => {
    if (mode !== 'seller') return;

    const fetchSellerTenders = async () => {
      const requestId = ++searchRequestIdRef.current;
      setTendersLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (activeTab === 'enlisted') params.set('enlisted_only', 'true');

        const res = await fetch(`/api/search/tenders?${params.toString()}`);
        // A slower earlier request must not overwrite newer results.
        if (requestId !== searchRequestIdRef.current) return;

        if (res.ok) {
          const data = await res.json();
          setSellerTenders(data);
        }
      } catch (err) {
        console.error('Failed to search tenders:', err);
      } finally {
        if (requestId === searchRequestIdRef.current) {
          setTendersLoading(false);
        }
      }
    };

    const timer = setTimeout(fetchSellerTenders, 300);
    return () => clearTimeout(timer);
  }, [mode, activeTab, searchQuery]);

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

  useEffect(() => {
    if (mode !== 'seller') return;

    const fetchSellerStats = async () => {
      try {
        const [bidsRes, ongoingRes] = await Promise.all([
          fetch('/api/bids/vendor/my-bids'),
          fetch('/api/tenders/ongoing'),
        ]);
        if (bidsRes.ok) {
          const bids = await bidsRes.json();
          setSellerBidCount(Array.isArray(bids) ? bids.length : 0);
        }
        if (ongoingRes.ok) {
          const ongoing = await ongoingRes.json();
          setSellerOngoingCount(Array.isArray(ongoing) ? ongoing.length : 0);
        }
      } catch (err) {
        console.error('Failed to fetch seller stats:', err);
      }
    };

    fetchSellerStats();
  }, [mode]);

  const user = {
    name: userData.full_name || 'User',
    email: userData.email || 'user@example.com',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name || 'User')}&background=1E293B&color=fff&bold=true`,
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
  const navItems: Array<{ label: string; href?: string; onClick?: () => void; icon: React.ReactNode }> = [
    { label: 'Find Organizations', href: '/organizations', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>) },
    { label: 'Ongoing Tenders', href: '/ongoing-tenders', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>) },
    { label: 'Manage Tokens', onClick: () => setShowManageTokens(true), icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
    { label: 'Update Credentials', href: '#', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>) },
    { label: 'Change Password', href: '/change-password', icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>) },
  ];

  const renderNotificationIcon = (type: string) => {
    const iconClass = 'w-4 h-4 text-content-secondary';
    switch (type) {
      case 'Award':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      case 'Deadline':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'Enlist':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'Verification':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'System':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'TenderUpdate':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Toggle / Close */}
      <div className="p-4 flex items-center justify-between">
        {(sidebarOpen || isMobile) && <h2 className="text-lg font-bold text-content-primary">Menu</h2>}
        <button
          onClick={() => isMobile ? setMobileSidebarOpen(false) : setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded bg-app hover:bg-subtle/60 text-content-secondary transition-all"
          title={sidebarOpen ? 'Collapse' : 'Expand'}
        >
          <svg className={`w-5 h-5 transition-transform ${!isMobile && sidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* User Profile */}
      <div className="px-3 py-4 border-b border-subtle">
        <div className={`flex ${(sidebarOpen || isMobile) ? 'flex-col items-center text-center gap-2' : 'justify-center'}`}>
          <div className={`${(sidebarOpen || isMobile) ? 'w-12 h-12 mb-1' : 'w-9 h-9'} flex-shrink-0 rounded overflow-hidden bg-brand-navy`}>
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
          {(sidebarOpen || isMobile) && (
            <>
              <h3 className="font-semibold text-content-primary text-sm leading-tight">{user.name}</h3>
              <p className="text-content-muted text-xs break-words">{user.email}</p>
              <p className="text-content-secondary text-xs font-medium">{user.orgName}</p>
              {isOwner ? (
                <span className="badge-status badge-approved"><span className="badge-dot" />Owner</span>
              ) : user.role ? (
                <span className="badge-status badge-draft"><span className="badge-dot" />{user.role.replace(/([a-z])([A-Z])/g, '$1 $2')}</span>
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
                  if (item.onClick) {
                    item.onClick();
                  } else if (item.href && item.href !== '#') {
                    router.push(item.href);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded text-content-secondary hover:text-content-primary hover:bg-app transition-all duration-200 text-left cursor-pointer"
              >
                {item.icon}
                {(sidebarOpen || isMobile) && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-subtle mt-auto">
        <button
          onClick={handleLogout}
          title="Log out"
          className={`w-full flex items-center ${(sidebarOpen || isMobile) ? 'gap-3 justify-start' : 'justify-center'} px-3 h-9 rounded text-content-secondary hover:text-content-primary hover:bg-app border border-transparent hover:border-subtle transition-colors text-sm font-medium`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {(sidebarOpen || isMobile) && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-screen bg-app">
        {/* ── Desktop Sidebar ──────────────────────── */}
        <div className={`hidden md:flex bg-surface border-r border-subtle ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 flex-col overflow-y-auto flex-shrink-0`}>
          <SidebarContent />
        </div>

        {/* ── Mobile Sidebar Overlay ───────────────── */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface border-r border-subtle shadow-lg animate-slide-up" style={{ animationName: 'none', transform: 'none' }}>
              <SidebarContent isMobile />
            </div>
          </div>
        )}

        {/* ── Main Content ─────────────────────────── */}
        <div className="flex-1 overflow-auto flex flex-col min-w-0">
          {/* Upper Section */}
          <div className="bg-surface border-b border-subtle flex flex-col justify-center flex-shrink-0 relative">
            <div className="p-4 md:p-6 pb-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
              {/* Mobile hamburger */}
              <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden p-2 rounded bg-app text-content-secondary">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Title */}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-semibold text-content-primary mb-0.5">
                  {mode === 'buyer' ? 'Buyer Dashboard' : 'Seller Dashboard'}
                </h1>
                <p className="text-content-secondary text-sm">
                  {mode === 'buyer'
                    ? 'Welcome back! Manage your procurement activities here.'
                    : 'Welcome back! Manage your vendor activities here.'}
                </p>
              </div>

              {/* Right Controls */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <SlidingToggle
                  options={[
                    { value: 'buyer', label: 'Buyer' },
                    { value: 'seller', label: 'Seller' },
                  ]}
                  value={mode}
                  onChange={(v) => handleModeSwitch(v as 'buyer' | 'seller')}
                />

                {/* Notification Bell */}
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative p-2.5 rounded bg-app hover:bg-subtle/60 border border-subtle text-content-secondary transition-all duration-200"
                  title="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Search */}
                <div className="flex-1 md:flex-initial" style={{ minWidth: '180px' }}>
                  <input
                    type="text"
                    placeholder="Search tenders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded border border-subtle bg-app text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:bg-surface transition text-sm"
                  />
                </div>

                {/* Token capsule */}
                <button
                  onClick={() => setShowManageTokens(true)}
                  className="rounded px-4 py-2 flex items-center gap-2 whitespace-nowrap bg-app hover:bg-subtle/40 border border-subtle transition-all duration-200 cursor-pointer group"
                  title="Manage Organization Tokens (Shared Pool)"
                >
                  <span className="text-content-secondary text-sm font-medium">Tokens:</span>
                  <span className="text-content-primary text-lg font-semibold tabular-nums group-hover:text-brand-blue transition min-w-[28px] text-center inline-flex items-center justify-center">
                    {tokenBalance !== null ? (
                      tokenBalance.toLocaleString()
                    ) : (
                      <span className="inline-block w-8 h-4 bg-subtle rounded animate-pulse"></span>
                    )}
                  </span>
                  <svg className="w-5 h-5 text-status-pending-text transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {isOwner && (
                  <button onClick={() => setShowOrgManagement(true)}
                    className="rounded px-4 py-2 flex items-center gap-2 whitespace-nowrap font-medium text-sm transition-all duration-200 bg-surface text-content-primary border border-subtle hover:bg-app">
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
                      <div className="bg-surface rounded border border-subtle p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-content-secondary text-xs font-medium">Total Published Tenders</p>
                            <p className="text-2xl font-semibold text-content-primary mt-1 tabular-nums">{buyerTenders.filter(t => t.status === 'Published').length}</p>
                          </div>
                          <div className="w-10 h-10 bg-brand-navy rounded flex items-center justify-center text-white flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div
                        onClick={() => router.push('/ongoing-tenders')}
                        className="bg-surface hover:bg-app rounded p-4 border border-subtle cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-content-secondary text-xs font-medium group-hover:text-brand-blue transition-colors">Accepted / Ongoing Tenders</p>
                              <span className="text-xs text-content-muted">→</span>
                            </div>
                            <p className="text-2xl font-semibold text-content-primary mt-1 tabular-nums">{buyerTenders.filter(t => t.status === 'Awarded').length}</p>
                          </div>
                          <div className="w-10 h-10 bg-status-approved-bg rounded flex items-center justify-center text-status-approved-text flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="bg-surface rounded border border-subtle p-4 sm:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-content-secondary text-xs font-medium">
                            Enlisted Vendors ({enlistedOrgs.filter(o => o.organization_type === 'Vendor').length})
                          </p>
                          <button
                            onClick={() => router.push('/organizations')}
                            className="text-xs text-brand-blue hover:text-blue-700 font-bold transition flex items-center gap-1"
                          >
                            + Find Vendors →
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {enlistedOrgs.filter(o => o.organization_type === 'Vendor').length === 0 ? (
                            <span className="text-xs text-content-muted italic">No vendors enlisted yet. Explore the directory to enlist trusted suppliers.</span>
                          ) : (
                            enlistedOrgs.filter(o => o.organization_type === 'Vendor').map(v => (
                              <button
                                key={v.organization_id}
                                onClick={() => router.push(`/organizations/${v.organization_id}`)}
                                className="px-3 py-1 rounded text-xs text-content-primary bg-app hover:bg-subtle/60 border border-subtle font-medium transition cursor-pointer"
                              >
                                <span>{v.organization_name}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-surface rounded border border-subtle p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-content-secondary text-xs font-medium">Tenders Bid On</p>
                            <p className="text-2xl font-semibold text-content-primary mt-1 tabular-nums">{sellerBidCount}</p>
                          </div>
                          <div className="w-10 h-10 bg-brand-navy rounded flex items-center justify-center text-white flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div
                        onClick={() => router.push('/ongoing-tenders')}
                        className="bg-surface hover:bg-app rounded p-4 border border-subtle cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="text-content-secondary text-xs font-medium group-hover:text-brand-blue transition-colors">Accepted Bids / Ongoing</p>
                              <span className="text-xs text-content-muted">→</span>
                            </div>
                            <p className="text-2xl font-semibold text-content-primary mt-1 tabular-nums">{sellerOngoingCount}</p>
                          </div>
                          <div className="w-10 h-10 bg-status-approved-bg rounded flex items-center justify-center text-status-approved-text flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="bg-surface rounded border border-subtle p-4 sm:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-content-secondary text-xs font-medium">
                            Enlisted Buyers ({enlistedOrgs.filter(o => o.organization_type === 'Buyer').length})
                          </p>
                          <button
                            onClick={() => router.push('/organizations')}
                            className="text-xs text-brand-blue hover:text-blue-700 font-bold transition flex items-center gap-1"
                          >
                            + Find Buyers →
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {enlistedOrgs.filter(o => o.organization_type === 'Buyer').length === 0 ? (
                            <span className="text-xs text-content-muted italic">No buyers enlisted yet. Explore the directory to find verified buyers.</span>
                          ) : (
                            enlistedOrgs.filter(o => o.organization_type === 'Buyer').map(b => (
                              <button
                                key={b.organization_id}
                                onClick={() => router.push(`/organizations/${b.organization_id}`)}
                                className="px-3 py-1 rounded text-xs text-content-primary bg-app hover:bg-subtle/60 border border-subtle font-medium transition cursor-pointer"
                              >
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
              className="w-7 h-7 rounded-full shadow-sm flex items-center justify-center bg-surface border border-subtle text-content-secondary hover:bg-app transition-all duration-200"
              title={upperCollapsed ? 'Expand details' : 'Collapse details'}>
              <svg className={`w-4 h-4 transition-transform duration-300 ${upperCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          {/* Lower Section */}
          <div className="flex-1 bg-app overflow-y-auto">
            {mode === 'seller' && (
              <div className="pt-8 px-4 md:px-8 flex justify-center">
                <SlidingToggle
                  options={[
                    { value: 'recommended', label: 'Available Tenders' },
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
                  <div className="rounded p-4 md:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                      <h2 className="text-2xl font-semibold text-content-primary">Your Tenders</h2>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="bg-surface border border-subtle rounded px-4 py-2 flex items-center gap-2">
                          <label htmlFor="filter-dropdown" className="text-content-secondary font-medium text-sm">Filter:</label>
                          <select id="filter-dropdown"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="bg-surface text-content-primary font-medium text-sm outline-none cursor-pointer rounded px-2 py-1 border border-subtle">
                            <option value="all">Show All</option>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="accepted">Accepted / Awarded</option>
                            <option value="closed">Closed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                        <button onClick={() => router.push('/organizations')}
                          className="bg-surface text-content-primary border border-subtle text-sm font-medium h-9 px-3.5 rounded hover:bg-app transition-all">
                          Find Organizations
                        </button>
                        <button onClick={() => router.push('/ongoing-tenders')}
                          className="bg-surface text-content-primary border border-subtle text-sm font-medium h-9 px-3.5 rounded hover:bg-app transition-all">
                          Ongoing Tenders
                        </button>
                        <button type="button" onClick={() => router.push('/new-tender')}
                          className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition-all">
                          + Create Tender
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {tendersLoading ? (
                        <div className="col-span-full flex justify-center py-12">
                          <svg className="animate-spin h-8 w-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      ) : filteredBuyerTenders.length === 0 ? (
                        <div className="col-span-full text-center py-16">
                          <svg className="w-12 h-12 text-content-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <p className="text-content-muted text-lg font-medium">No tenders found matching your filter.</p>
                        </div>
                      ) : (
                        filteredBuyerTenders
                          .map((tender) => (
                            <TenderCard
                              key={tender.tender_id}
                              title={tender.title}
                              subtitle={tender.description}
                              vendor={tender.buyer_org_name}
                              status={tender.status}
                              deadline={tender.submission_deadline}
                              onClick={() => router.push(`/view-my-tender/${tender.tender_id}`)}
                            />
                          ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded p-4 md:p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-semibold text-content-primary">Available Tenders</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button onClick={() => router.push('/organizations')}
                        className="bg-surface text-content-primary border border-subtle text-sm font-medium h-9 px-3.5 rounded hover:bg-app transition-all">
                        Find Organizations
                      </button>
                      <button onClick={() => router.push('/ongoing-tenders')}
                        className="bg-surface text-content-primary border border-subtle text-sm font-medium h-9 px-3.5 rounded hover:bg-app transition-all">
                        Ongoing Tenders
                      </button>
                      <button onClick={() => router.push('/view-my-bids')}
                        className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition-all">
                        View My Bids
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {tendersLoading ? (
                      <div className="col-span-full flex justify-center py-12">
                        <svg className="animate-spin h-8 w-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : filteredSellerTenders.length === 0 ? (
                      <div className="col-span-full text-center py-16 bg-surface rounded border border-subtle">
                        <svg className="w-12 h-12 text-content-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        {activeTab === 'enlisted' ? (
                          <>
                            <p className="text-content-primary text-lg font-bold">No tenders from your enlisted buyers</p>
                            <p className="text-content-muted text-sm mt-1 max-w-md mx-auto mb-4">
                              Enlist trusted buyer organizations from the directory to see their active and exclusive tenders here.
                            </p>
                            <button
                              onClick={() => router.push('/organizations')}
                              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
                            >
                              + Discover & Enlist Buyers
                            </button>
                          </>
                        ) : searchQuery.trim() ? (
                          <>
                            <p className="text-content-primary text-lg font-bold">
                              No tenders match &ldquo;{searchQuery.trim()}&rdquo;
                            </p>
                            <p className="text-content-muted text-sm mt-1 max-w-md mx-auto">
                              Try different or broader wording.
                            </p>
                          </>
                        ) : (
                          <p className="text-content-muted text-lg font-medium">No tenders available at the moment.</p>
                        )}
                      </div>
                    ) : (
                      filteredSellerTenders.map((tender) => (
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
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-40 rounded-l shadow-sm items-center justify-center transition-all duration-300 bg-surface border border-subtle text-content-secondary hover:bg-app"
          style={{
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
          {totalUnreadMessages > 0 && (
            <span className="absolute -top-1.5 -left-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
              {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
            </span>
          )}
        </button>

        <MessagingSidebar isOpen={rightSidebarOpen} onClose={() => setRightSidebarOpen(false)} onUnreadCountChange={setTotalUnreadMessages} />
      </div>

      {/* Organization Management Modal */}
      <OrgManagementModal
        isOpen={showOrgManagement}
        onClose={() => setShowOrgManagement(false)}
      />

      {/* Manage Tokens Modal */}
      <ManageTokensModal
        isOpen={showManageTokens}
        onClose={() => setShowManageTokens(false)}
        onBalanceUpdate={(newBal) => {
          setTokenBalance(newBal);
          try {
            localStorage.setItem('org_token_balance', newBal.toString());
          } catch { }
        }}
      />
      {/* Notifications Modal */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-end"
          style={{ backdropFilter: 'blur(2px)', background: 'rgba(15,23,42,0.25)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNotifications(false); }}
        >
          <div
            ref={notifModalRef}
            className="mt-16 mr-4 md:mr-8 w-full max-w-sm rounded shadow-lg overflow-hidden flex flex-col bg-surface border border-subtle"
            style={{ maxHeight: '80vh' }}
          >
            {/* Header row */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h2 className="text-content-primary font-bold text-base">Notifications</h2>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1.5 rounded text-content-muted hover:text-content-primary hover:bg-app transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-subtle px-5">
              {(['unread', 'read'] as const).map((tab) => {
                const count = tab === 'unread' ? notifications.filter(n => !n.is_read).length : notifications.filter(n => n.is_read).length;
                const active = notifTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setNotifTab(tab)}
                    className={`relative pb-2.5 mr-5 text-sm font-semibold transition-colors capitalize ${active ? 'text-brand-blue' : 'text-content-muted hover:text-content-secondary'
                      }`}
                  >
                    {tab === 'unread' ? 'Unread' : 'Read'}
                    {count > 0 && (
                      <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums ${active ? 'bg-blue-50 text-brand-blue' : 'bg-app text-content-muted'
                        }`}>
                        {count}
                      </span>
                    )}
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-brand-blue" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto flex-1">
              {(() => {
                const filtered = notifications.filter(n => notifTab === 'unread' ? !n.is_read : n.is_read);
                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                      <div className="w-12 h-12 rounded bg-app flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                      </div>
                      <p className="text-content-muted text-sm font-medium">
                        {notifTab === 'unread' ? 'You\'re all caught up!' : 'No read notifications yet.'}
                      </p>
                    </div>
                  );
                }
                return filtered.map((notif) => (
                  <div
                    key={notif.notification_id}
                    className={`flex gap-3 px-5 py-4 border-b border-subtle/50 transition-colors hover:bg-app cursor-pointer ${!notif.is_read ? 'bg-blue-50/50' : ''
                      }`}
                    onClick={() => {
                      if (!notif.is_read) markAsRead(notif.notification_id);
                      if (notif.action_url) router.push(notif.action_url);
                    }}
                  >
                    <div className="flex-shrink-0 w-9 h-9 rounded flex items-center justify-center bg-app">
                      {renderNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-semibold leading-snug ${!notif.is_read ? 'text-content-primary' : 'text-content-secondary'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-blue mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-content-secondary mt-0.5 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-content-muted mt-1.5 font-medium">{timeAgo(notif.created_at)}</p>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-subtle flex justify-center">
              <button
                onClick={markAllAsRead}
                className="text-xs text-brand-blue hover:text-blue-700 font-semibold transition"
              >
                Mark all as read
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
