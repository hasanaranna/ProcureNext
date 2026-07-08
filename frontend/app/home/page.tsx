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

  // Seller tender data
  const recommendedTenders: { title: string; subtitle: string; buyer: string; onClick?: () => void }[] = [
    { title: 'Office Supplies Tender', subtitle: 'Procurement of office stationery and supplies for Q2 2026', buyer: 'Acme Corporation', onClick: () => router.push('/bid-for-tender') },
    { title: 'IT Equipment Procurement', subtitle: 'Request for computers, monitors, and peripherals', buyer: 'TechStart Inc.' },
    { title: 'Furniture & Fixtures', subtitle: 'Office furniture and interior fittings for new branch', buyer: 'Metro Industries' },
    { title: 'Cleaning Services', subtitle: 'Annual facility cleaning and maintenance contract', buyer: 'Summit Holdings' },
    { title: 'Catering Services', subtitle: 'Event catering and daily hospitality services', buyer: 'Greenfield Events' },
  ];

  const enlistedTenders: { title: string; subtitle: string; buyer: string; onClick?: () => void }[] = [
    { title: 'Annual Stationery Supply', subtitle: 'Bulk supply of office stationery for all branches', buyer: 'Acme Corporation' },
    { title: 'Server Room Setup', subtitle: 'Complete server room infrastructure and cabling', buyer: 'BuildRight Inc.' },
    { title: 'Warehouse Shelving', subtitle: 'Industrial shelving units for warehouse expansion', buyer: 'Metro Industries' },
  ];

  const user = {
    name: userData.full_name || 'User',
    email: userData.email || 'user@example.com',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.full_name || 'User')}&background=0D8ABC&color=fff`,
    orgName: userData.organization_name || 'Organization',
    role: userData.role_in_org || 'Owner',
  };

  const isOwner = user.role === 'Owner';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Sidebar */}
        <div
          style={{ background: 'linear-gradient(135deg, #3a4556 0%, #4a5668 100%)' }}
          className={`${sidebarOpen ? 'w-64' : 'w-20'
            } text-gray-50 transition-all duration-300 flex flex-col overflow-y-auto shadow-lg`}
        >
          {/* Toggle Button */}
          <div className="p-4 flex items-center justify-between">
            {sidebarOpen && <h2 className="text-xl font-bold">Menu</h2>}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg transition"
              style={{ color: 'inherit', backgroundColor: 'rgba(74, 86, 104, 0.5)' }}
              title={sidebarOpen ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-6 h-6 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* User Profile Section */}
          <div className="px-4 py-6 border-b border-gray-500" style={{ backgroundColor: '#4a5668' }}>
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 flex-shrink-0 mb-4 ring-2 ring-gray-400 rounded-full overflow-hidden">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {sidebarOpen && (
                <>
                  <h3 className="font-semibold text-lg text-gray-50">{user.name}</h3>
                  <p className="text-gray-300 text-sm break-words">{user.email}</p>
                  <p className="text-gray-400 text-xs mt-2 font-medium">{user.orgName}</p>
                  {isOwner ? (
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-400/20 text-yellow-300">
                      Owner
                    </span>
                  ) : user.role ? (
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-400/20 text-blue-300">
                      {user.role.replace(/([a-z])([A-Z])/g, '$1 $2')}
                    </span>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6">
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="flex items-center p-3 rounded-lg transition group text-gray-200"
                  style={{ color: 'inherit' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a5668')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Update Credentials</span>}
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center p-3 rounded-lg transition group text-gray-200"
                  style={{ color: 'inherit' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a5668')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Change Password</span>}
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center p-3 rounded-lg transition group text-gray-200"
                  style={{ color: 'inherit' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a5668')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10a1 1 0 011-1h16a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1v-7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 6V4a2 2 0 012-2h6a2 2 0 012 2v2" />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Payment Methods</span>}
                </a>
              </li>

              <li>
                <a
                  href="#"
                  className="flex items-center p-3 rounded-lg transition group text-gray-200"
                  style={{ color: 'inherit' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4a5668')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {sidebarOpen && <span className="ml-3">Manage Tokens</span>}
                </a>
              </li>
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-500">
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-3 hover:bg-red-600 rounded-lg transition bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 font-semibold text-white"
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {sidebarOpen && <span className="ml-3">Logout</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto flex flex-col">
          {/* Upper Section - Dark Background */}
          <div style={{ backgroundColor: '#2a3548' }} className="flex flex-col justify-center flex-shrink-0 relative">
            <div className="p-6 pb-4 flex gap-4 items-center">
              {/* Left Column - Title and Subtitle */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-1">
                  {mode === 'buyer' ? 'Buyer Dashboard' : 'Seller Dashboard'}
                </h1>
                <p className="text-gray-300 text-sm">
                  {mode === 'buyer'
                    ? 'Welcome back! Manage your procurement activities here.'
                    : 'Welcome back! Manage your vendor activities here.'}
                </p>
              </div>

              {/* Right Column - Mode Selector, Search and Token Capsule */}
              <div className="flex items-center gap-3">
                {/* Mode Selector */}
                <SlidingToggle
                  options={[
                    { value: 'buyer', label: '🛒 Buyer' },
                    { value: 'seller', label: '🏪 Seller' },
                  ]}
                  value={mode}
                  onChange={(v) => handleModeSwitch(v as 'buyer' | 'seller')}
                />

                {/* Search Bar */}
                <div className="flex-1" style={{ minWidth: '200px' }}>
                  <input
                    type="text"
                    placeholder="Search tenders..."
                    style={{ backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                    className="w-full px-4 py-2 rounded-full border-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-300"
                  />
                </div>

                {/* Available Tokens Capsule */}
                <div style={{ backgroundColor: '#3a4556' }} className="rounded-full px-6 py-2 flex items-center gap-2 whitespace-nowrap">
                  <span className="text-gray-300 text-sm font-medium">Available Tokens:</span>
                  <span className="text-white text-lg font-bold">250</span>
                  <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                {/* Organization Management Button — only for Owner */}
                {isOwner && (
                  <button
                    onClick={() => setShowOrgManagement(true)}
                    className="rounded-full px-5 py-2 flex items-center gap-2 whitespace-nowrap font-semibold text-sm transition-all duration-200 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #4a5668 0%, #3a4556 100%)', color: '#e5e7eb', border: '1px solid #6b7280' }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Organization Management
                  </button>
                )}

              </div>
            </div>

            {/* Stats & Enlisted - Collapsible with smooth height transition */}
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: upperCollapsed ? '0px' : '500px',
                opacity: upperCollapsed ? 0 : (modeFadeIn ? 1 : 0),
              }}
            >
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Stats Cards */}
                  {mode === 'buyer' ? (
                    <>
                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-xs font-semibold">Total Published Tenders</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">12</p>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center text-white text-lg">
                            📊
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-xs font-semibold">Accepted Tenders</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">8</p>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center text-white text-lg">
                            📦
                          </div>
                        </div>
                      </div>

                      {/* Enlisted Vendors Card */}
                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 lg:col-span-2">
                        <div>
                          <p className="text-gray-600 text-xs font-semibold mb-2">Enlisted Vendors (5)</p>
                          <div className="flex flex-wrap gap-2">
                            <span style={{ backgroundColor: '#e5e7eb' }} className="px-3 py-1 rounded-full text-xs text-gray-800">Global Supplies Co.</span>
                            <span style={{ backgroundColor: '#e5e7eb' }} className="px-3 py-1 rounded-full text-xs text-gray-800">Tech Solutions Ltd.</span>
                            <span style={{ backgroundColor: '#e5e7eb' }} className="px-3 py-1 rounded-full text-xs text-gray-800">Modern Furnishings</span>
                            <span style={{ backgroundColor: '#e5e7eb' }} className="px-3 py-1 rounded-full text-xs text-gray-800">CleanPro Services</span>
                            <span style={{ backgroundColor: '#e5e7eb' }} className="px-3 py-1 rounded-full text-xs text-gray-800">Enterprise Software</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-xs font-semibold">Tenders Bid On</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">15</p>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center text-white text-lg">
                            📊
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-600 text-xs font-semibold">Accepted Bids</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">6</p>
                          </div>
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center text-white text-lg">
                            ✅
                          </div>
                        </div>
                      </div>

                      {/* Enlisted Buyers Card */}
                      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 lg:col-span-2">
                        <div>
                          <p className="text-gray-600 text-xs font-semibold mb-2">Enlisted Buyers (4)</p>
                          <div className="flex flex-wrap gap-2">
                            <span style={{ backgroundColor: '#e5e7eb' }} className="px-3 py-1 rounded-full text-xs text-gray-800">Acme Corporation</span>
                            <span style={{ backgroundColor: '#e5e7eb' }} className="px-3 py-1 rounded-full text-xs text-gray-800">BuildRight Inc.</span>
                            <span style={{ backgroundColor: '#e5e7eb' }} className="px-3 py-1 rounded-full text-xs text-gray-800">Metro Industries</span>
                            <span style={{ backgroundColor: '#e5e7eb' }} className="px-3 py-1 rounded-full text-xs text-gray-800">Summit Holdings</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chevron toggle button - centered on the border between sections */}
          <div className="flex justify-center flex-shrink-0" style={{ marginTop: '-14px', marginBottom: '-14px', position: 'relative', zIndex: 10 }}>
            <button
              onClick={() => setUpperCollapsed(!upperCollapsed)}
              className="rounded-full shadow-md transition-all duration-200 flex items-center justify-center"
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: '#4a5668',
                border: '2px solid #d1d5db',
                color: '#d1d5db',
              }}
              title={upperCollapsed ? 'Expand details' : 'Collapse details'}
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${upperCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>

          {/* Lower Section - White Background */}
          <div className="flex-1 bg-white overflow-y-auto">
            {/* Seller tab toggle - outside fade wrapper so it doesn't fade */}
            {mode === 'seller' && (
              <div className="pt-8 px-8 flex justify-center">
                <SlidingToggle
                  options={[
                    { value: 'recommended', label: 'Recommended For You' },
                    { value: 'enlisted', label: 'From My Enlisted Buyers' },
                  ]}
                  value={activeTab}
                  onChange={(v) => handleTabSwitch(v as 'recommended' | 'enlisted')}
                  background="linear-gradient(135deg, #3a4556 0%, #4a5668 100%)"
                  boxShadow="none"
                  activeTextColor="#1f2937"
                  inactiveTextColor="#d1d5db"
                  paddingX="px-6"
                  paddingY="py-2"
                />
              </div>
            )}

            <div
              className="transition-opacity duration-200 p-8 pt-6"
              style={{ opacity: tabFadeIn ? 1 : 0 }}
            >
              {mode === 'buyer' ? (
                <>
                  {/* Buyer Lower: Tenders Grid */}
                  <div className="rounded-xl p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Your Tenders</h2>
                      <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: '#3a4556' }} className="rounded-full px-5 py-2 flex items-center gap-3">
                          <label htmlFor="filter-dropdown" className="text-gray-100 font-medium text-sm">
                            Filter:
                          </label>
                          <select
                            id="filter-dropdown"
                            style={{ backgroundColor: '#e5e7eb', textAlign: 'center' }}
                            className="text-gray-900 font-medium text-sm outline-none cursor-pointer rounded-full px-3 py-1"
                          >
                            <option value="all" style={{ textAlign: 'center' }}>Show All</option>
                            <option value="published" style={{ textAlign: 'center' }}>Published</option>
                            <option value="accepted" style={{ textAlign: 'center' }}>Accepted</option>
                          </select>
                        </div>
                        <button
                          onClick={() => router.push('/new-tender')}
                          style={{ background: 'linear-gradient(135deg, #4a5668 0%, #3a4556 100%)' }}
                          className="px-8 py-2 rounded-full text-white font-semibold hover:opacity-90 transition"
                        >
                          Create Tender
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <TenderCard
                        title="Office Supplies Tender"
                        subtitle="Procurement of office stationery and supplies"
                        vendor="Global Supplies Co."
                      />
                      <TenderCard
                        title="IT Equipment Procurement"
                        subtitle="Request for computers and peripherals"
                        vendor="Tech Solutions Ltd."
                      />
                      <TenderCard
                        title="Furniture & Fixtures"
                        subtitle="Office furniture and interior fittings"
                        onClick={() => router.push('/view-my-tender')}
                      />
                      <TenderCard
                        title="Cleaning Services"
                        subtitle="Facility cleaning and maintenance services"
                        vendor="CleanPro Services"
                      />
                      <TenderCard
                        title="Software Licenses"
                        subtitle="Annual software subscription renewal"
                        vendor="Enterprise Software Corp."
                      />
                      <TenderCard
                        title="Catering Services"
                        subtitle="Event catering and hospitality services"
                        vendor="Gourmet Catering Ltd."
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Seller Lower: Tender Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(activeTab === 'recommended' ? recommendedTenders : enlistedTenders).map(
                      (tender, index) => (
                        <div
                          key={`${activeTab}-${index}`}
                          onClick={tender.onClick}
                          className="rounded-2xl p-5 cursor-pointer transition-shadow duration-200 hover:shadow-lg"
                          style={{ backgroundColor: '#f9fafb', border: '3px solid #9ca3af' }}
                        >
                          <div className="flex items-start gap-4">
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 mt-1"
                              style={{ backgroundColor: '#d1d5db' }}
                            >
                              📋
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900">{tender.title}</h3>
                              <p className="text-gray-500 text-sm mt-1">{tender.subtitle}</p>
                            </div>
                          </div>
                          <div
                            className="mt-3 rounded-b-xl -mx-5 -mb-5 px-5 py-3"
                            style={{ backgroundColor: '#374151' }}
                          >
                            <p className="text-gray-300 text-xs font-medium">
                              🏢 <span className="text-gray-100 ml-1">{tender.buyer}</span>
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Toggle Button */}
        <button
          onClick={() => setRightSidebarOpen(true)}
          className="absolute right-0 top-1/2 transform -translate-y-1/2 z-40 rounded-l-xl shadow-lg transition-all duration-300 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #5b6abf 0%, #3b82f6 50%, #6366f1 100%)',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.35)',
            color: '#ffffff',
            width: '48px',
            height: '120px',
            opacity: rightSidebarOpen ? 0 : 1,
            pointerEvents: rightSidebarOpen ? 'none' : 'auto',
          }}
          title="Open sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
