'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BidCard {
  vendorName: string;
  description: string;
  bidAmount: number;
  files: string[];
}

const tenderDetails = {
  title: 'Furniture & Fixtures',
  subtitle: 'Office furniture and interior fittings',
  attachment: 'file.pdf',
};

const bids: BidCard[] = [
  {
    vendorName: 'Modern Furnishings Inc.',
    description: 'We offer premium quality office furniture with ergonomic designs. Our range includes standing desks, executive chairs, and modular workstations with a 5-year warranty.',
    bidAmount: 450000,
    files: ['proposal.pdf', 'product_catalog.pdf'],
  },
  {
    vendorName: 'Interior Solutions Ltd.',
    description: 'Complete office interior solutions including custom-built furniture, partition walls, and space-efficient storage systems. Delivery within 4 weeks.',
    bidAmount: 380000,
    files: ['design.pdf'],
  },
  {
    vendorName: 'WoodCraft Enterprises',
    description: 'Handcrafted solid wood furniture with contemporary styling. Includes installation, assembly, and free maintenance for the first year.',
    bidAmount: 520000,
    files: ['portfolio.pdf', 'warranty.pdf', 'timeline.pdf'],
  },
  {
    vendorName: 'OfficePro Supplies',
    description: 'Budget-friendly yet durable office furniture. Bulk pricing available with free delivery and setup across the country.',
    bidAmount: 290000,
    files: ['quotation.pdf'],
  },
];

interface RecommendedSeller {
  name: string;
  description: string;
}

const recommendedSellers: RecommendedSeller[] = [
  {
    name: 'Elite Interiors Co.',
    description: 'Specialists in corporate office interiors with over 15 years of experience. Have delivered large-scale furniture projects for government offices and multinational companies across the region.',
  },
  {
    name: 'Prime Woodworks Ltd.',
    description: 'Award-winning custom furniture manufacturer known for sustainable materials and modern designs. Previously completed similar office furnishing tenders for 3 Fortune 500 companies.',
  },
  {
    name: 'UrbanSpace Solutions',
    description: 'End-to-end workspace design and furnishing company. Specialize in ergonomic office setups with quick turnaround times and competitive bulk pricing.',
  },
  {
    name: 'GreenDesk Furnishings',
    description: 'Eco-friendly office furniture supplier using reclaimed and certified sustainable wood. Known for delivering high-quality modular furniture systems on time.',
  },
  {
    name: 'Atlas Office Systems',
    description: 'Full-service office equipment and furniture provider with nationwide delivery. Have experience in fixture installations for educational institutions and corporate parks.',
  },
];

export default function ViewMyTenderPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'bids' | 'recommended'>('bids');
  const [fadeIn, setFadeIn] = useState(true);

  const handleTabSwitch = (tab: 'bids' | 'recommended') => {
    if (tab === activeTab) return;
    setFadeIn(false);
    setTimeout(() => {
      setActiveTab(tab);
      setFadeIn(true);
    }, 200);
  };

  return (
    <main
      className="w-full min-h-screen py-10 px-4"
      style={{ backgroundColor: '#3a4556' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/home-buyer')}
          className="mb-6 flex items-center gap-2 text-gray-300 hover:text-white transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back to Dashboard</span>
        </button>

        {/* Tender Details Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
          <h1 style={{ color: '#111827' }} className="text-3xl font-bold mb-2">{tenderDetails.title}</h1>
          <p style={{ color: '#6b7280' }} className="text-lg mb-6">{tenderDetails.subtitle}</p>

          {/* Attachment Capsule */}
          <div className="flex items-center">
            <div style={{ backgroundColor: '#f3f4f6' }} className="rounded-full px-5 py-2 flex items-center gap-3 border border-gray-300">
              <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="1" />
                <text x="7" y="19" fontSize="7" fill="white" fontWeight="bold">PDF</text>
              </svg>
              <span style={{ color: '#374151' }} className="text-sm font-medium">{tenderDetails.attachment}</span>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition">
                View
              </button>
            </div>
          </div>
        </div>

        {/* Toggle Capsule */}
        <div className="mb-6 flex justify-center">
          <div style={{ backgroundColor: '#3a4556', border: '2px solid #4a5668' }} className="rounded-full p-1 flex items-center gap-1">
            <button
              onClick={() => handleTabSwitch('bids')}
              className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeTab === 'bids' ? '#ffffff' : 'transparent',
                color: activeTab === 'bids' ? '#1f2937' : '#d1d5db',
              }}
            >
              View Bids from Sellers
            </button>
            <button
              onClick={() => handleTabSwitch('recommended')}
              className="px-6 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeTab === 'recommended' ? '#ffffff' : 'transparent',
                color: activeTab === 'recommended' ? '#1f2937' : '#d1d5db',
              }}
            >
              Recommended Sellers
            </button>
          </div>
        </div>

        {/* Tab Content with Fade */}
        <div
          className="transition-opacity duration-200"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          {activeTab === 'bids' ? (
            /* Bids Section */
            <div className="mb-6">
              <div className="flex justify-between items-start mb-6">
                {/* Left Column - Title and Description */}
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Vendor Bids</h2>
                  <p className="text-gray-300 text-sm">{bids.length} vendors have placed bids on this tender</p>
                </div>

                {/* Right Column - Dropdowns */}
                <div className="flex gap-4">
                  {/* Vendor Filter */}
                  <select
                    style={{ backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                    className="px-4 py-2 rounded-lg border-2 text-gray-900 font-medium text-sm focus:outline-none focus:border-gray-600 transition"
                  >
                    <option value="all">All Vendors</option>
                    <option value="enlisted">My Enlisted Vendors</option>
                  </select>

                  {/* Sort Dropdown */}
                  <select
                    style={{ backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                    className="px-4 py-2 rounded-lg border-2 text-gray-900 font-medium text-sm focus:outline-none focus:border-gray-600 transition"
                  >
                    <option value="unsorted">Unsorted</option>
                    <option value="high-to-low">Price (High to Low)</option>
                    <option value="low-to-high">Price (Low to High)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                {bids.map((bid, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: '#d1d5db' }} className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                          🏢
                        </div>
                        <h3 style={{ color: '#111827' }} className="text-lg font-bold">{bid.vendorName}</h3>
                      </div>
                      <div style={{ backgroundColor: '#374151' }} className="rounded-full px-4 py-1">
                        <span className="text-white font-bold text-sm">৳ {bid.bidAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <p style={{ color: '#6b7280' }} className="text-sm leading-relaxed mb-4">{bid.description}</p>

                    {/* Files Capsules */}
                    {bid.files.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {bid.files.map((file, fileIndex) => (
                          <div key={fileIndex} style={{ backgroundColor: '#f3f4f6' }} className="rounded-full px-3 py-1 flex items-center gap-2 border border-gray-300">
                            <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                            </svg>
                            <span style={{ color: '#374151' }} className="text-xs font-medium">{file}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 justify-end">
                      <button
                        style={{ background: 'linear-gradient(135deg, #4a5668 0%, #3a4556 100%)' }}
                        className="px-6 py-2 rounded-full text-white font-semibold text-sm hover:opacity-90 transition"
                      >
                        Accept Bid
                      </button>
                      <button
                        className="px-6 py-2 rounded-full border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-100 transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Recommended Sellers Section */
            <div className="mb-6">
              <p className="text-gray-400 text-xs text-center mb-6 italic">
                These are our smart recommendations for your current tender. They have performed similar works before or are related to your tender.
              </p>

              <div className="flex flex-col gap-5">
                {recommendedSellers.map((seller, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div style={{ backgroundColor: '#d1d5db' }} className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0">
                        🏢
                      </div>
                      <h3 style={{ color: '#111827' }} className="text-lg font-bold">{seller.name}</h3>
                    </div>
                    <p style={{ color: '#6b7280' }} className="text-sm leading-relaxed">{seller.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
