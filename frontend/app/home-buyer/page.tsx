'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TenderCard from '@/components/TenderCard';

export default function HomeBuyerPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Mock user data - in real app, this would come from auth/session
  const user = {
    name: 'John Doe',
    email: 'buyer@abc.com',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
  };

  const handleLogout = () => {
    router.push('/');
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <div
        style={{ background: 'linear-gradient(135deg, #3a4556 0%, #4a5668 100%)' }}
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
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
        <div style={{ backgroundColor: '#2a3548' }} className="p-6 flex flex-col justify-center flex-shrink-0">
          <div className="mb-4 flex gap-8 items-center">
            {/* Left Column - Title and Subtitle */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">Buyer Dashboard</h1>
              <p className="text-gray-300 text-sm">Welcome back! Manage your procurement activities here.</p>
            </div>
            
            {/* Right Column - Search and Token Capsule */}
            <div className="flex-1 flex gap-3">
              {/* Search Bar */}
              <div className="flex-1">
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
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stats Cards */}
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
          </div>
        </div>

        {/* Lower Section - White Background */}
        <div className="flex-1 bg-white p-8 overflow-y-auto border-t border-gray-200">
          {/* Filter Capsule */}
          <div className="mb-1 flex justify-center">
            <div style={{ width: '50%', backgroundColor: '#3a4556' }} className="rounded-full px-6 py-3 flex items-center justify-center gap-3">
              <label htmlFor="filter-dropdown" className="text-gray-100 font-medium text-sm">
                Filter:
              </label>
              <select
                id="filter-dropdown"
                style={{ backgroundColor: '#e5e7eb', textAlign: 'center' }}
                className="text-gray-900 font-medium text-sm outline-none cursor-pointer rounded-full px-3 py-1"
              >
                <option value="all" style={{ textAlign: 'center' }}>Show All</option>
                <option value="accepted" style={{ textAlign: 'center' }}>Currently Accepted</option>
                <option value="completed" style={{ textAlign: 'center' }}>Completed</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Tenders</h2>
            
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
                vendor="Modern Furnishings Inc."
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
        </div>
      </div>
    </div>
  );
}
