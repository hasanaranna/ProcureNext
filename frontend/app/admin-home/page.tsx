"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PendingRequestDetailModal, {
  RegistrationDetail,
} from "@/components/PendingRequestDetailModal";
import { getAdminUser, clearAdminSession } from "@/lib/auth";


const stats = [
  { label: "Total Tokens Sold", value: "48,320", sub: "+1,240 this month",
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    color: "from-amber-400 to-amber-500" },
  { label: "Approved Owners", value: "312", sub: "+14 this month",
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    color: "from-accent-500 to-accent-600" },
  { label: "Pending Approvals", value: "5", sub: "Awaiting review",
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    color: "from-orange-400 to-orange-500" },
  { label: "Active Tenders", value: "87", sub: "Across all companies",
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>),
    color: "from-violet-500 to-violet-600" },
  { label: "Total Bids Placed", value: "2,641", sub: "+318 this month",
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>),
    color: "from-rose-400 to-rose-500" },
  { label: "Revenue (BDT)", value: "৳ 24,16,000", sub: "From token purchases",
    icon: (<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>),
    color: "from-emerald-400 to-emerald-500" },
];

export default function AdminHomePage() {
  const router = useRouter();
  const [pending, setPending] = useState<RegistrationDetail[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [pendingError, setPendingError] = useState("");
  const [approvedIds, setApprovedIds] = useState<number[]>([]);
  const [rejectedIds, setRejectedIds] = useState<number[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] =
    useState<RegistrationDetail | null>(null);
  const [adminName, setAdminName] = useState<string>("System Administrator");

  useEffect(() => {
    const adminUser = getAdminUser();
    if (adminUser?.full_name) {
      setAdminName(adminUser.full_name);
    }
  }, []);

  // Fetch pending master accounts from the API
  useEffect(() => {
    const fetchPending = async () => {
      setLoadingPending(true);
      setPendingError("");
      try {
        const res = await fetch("/api/auth/admin/pending-accounts", {
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          throw new Error("Failed to fetch pending accounts.");
        }
        const data = await res.json();

        // Map API response to RegistrationDetail[]
        const mapped: RegistrationDetail[] = (data.accounts || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (acc: any) => ({
            id: acc.user_id,
            orgId: acc.organization_id,
            name: acc.full_name,
            company: acc.organization_name,
            email: acc.email,
            phone: acc.phone || "",
            submittedAt: acc.submitted_at
              ? acc.submitted_at.split("T")[0]
              : "",
            documents: {
              nidFront: acc.documents?.nid_front || null,
              nidBack: acc.documents?.nid_back || null,
              tradeLicense: acc.documents?.trade_license || null,
              tinCertificate: acc.documents?.tin_certificate || null,
              vatCertificate: acc.documents?.vat_certificate || null,
              additionalDocs: acc.documents?.additional_docs || [],
            },
          }),
        );
        setPending(mapped);
      } catch (err) {
        setPendingError(
          err instanceof Error ? err.message : "Unknown error.",
        );
      } finally {
        setLoadingPending(false);
      }
    };
    fetchPending();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    clearAdminSession();
    window.location.href = '/admin-login';
  };

  const handleViewDetails = (reg: RegistrationDetail) => {
    setSelectedRegistration(reg);
    setDetailModalOpen(true);
  };

  const [tokenPricing, setTokenPricing] = useState({
    pricePerToken: "1.00",
    tenderSubmitRate: "1000",
    bidRate: "1000",
  });
  const [pricingSaved, setPricingSaved] = useState(false);

  const handleApprove = async (reg: RegistrationDetail) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/auth/admin/verify/${reg.orgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          verification_status: "Verified",
          review_notes: "Approved by admin",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to verify organization");
      }
      setApprovedIds((prev) => [...prev, reg.id]);
      setDetailModalOpen(false);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleReject = async (reg: RegistrationDetail) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/auth/admin/verify/${reg.orgId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          verification_status: "Rejected",
          review_notes: "Rejected by admin",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to verify organization");
      }
      setRejectedIds((prev) => [...prev, reg.id]);
      setDetailModalOpen(false);
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTokenPricing((prev) => ({ ...prev, [name]: value }));
    setPricingSaved(false);
  };

  const handlePricingSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPricingSaved(true);
  };

  const inputClass = "w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition text-sm";

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <header className="bg-gradient-to-r from-navy-950 to-navy-900 text-white px-6 md:px-8 py-4 flex items-center justify-between shadow-2xl sticky top-0 z-30">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight">ProcureNext</span>
          </div>
          <span className="ml-12 px-2.5 py-0.5 bg-accent-500/20 text-accent-300 text-xs rounded-full font-bold w-fit border border-accent-500/30">
            ADMIN
          </span>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">{adminName}</span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-fade-in">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-black text-navy-900">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1 text-sm">Monitor platform activity and manage registrations.</p>
        </div>

        {/* Stats Grid */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <div key={i}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 px-5 py-5 hover:shadow-lg hover:scale-[1.01] transition-all duration-300">
                <div className={`bg-gradient-to-br ${stat.color} text-white rounded-xl p-3 flex-shrink-0 shadow-md`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-black text-navy-900 mt-0.5">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pending Approvals */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-navy-900">Pending Master Account Approvals</h2>
              <p className="text-sm text-slate-500 mt-0.5">Review and approve or reject company owner registrations.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-sm font-bold rounded-full border border-amber-200">
              <span className="w-2 h-2 bg-amber-500 rounded-full inline-block animate-pulse"></span>
              {pending.filter((r) => !approvedIds.includes(r.id) && !rejectedIds.includes(r.id)).length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            {loadingPending ? (
              <div className="flex flex-col items-center justify-center py-16">
                <svg className="animate-spin h-8 w-8 text-accent-500 mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-slate-400">Loading pending accounts…</p>
              </div>
            ) : pendingError ? (
              <div className="py-12 text-center">
                <p className="text-sm text-red-500">{pendingError}</p>
              </div>
            ) : pending.length === 0 ? (
              <div className="py-12 text-center">
                <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-slate-400">No pending accounts to review.</p>
              </div>
            ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase text-xs tracking-wider">
                  <th className="px-6 py-3 text-left font-semibold">#</th>
                  <th className="px-6 py-3 text-left font-semibold">Full Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Company Name</th>
                  <th className="px-6 py-3 text-left font-semibold">Email Address</th>
                  <th className="px-6 py-3 text-left font-semibold">Submitted</th>
                  <th className="px-6 py-3 text-left font-semibold">Status</th>
                  <th className="px-6 py-3 text-left font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((reg, idx) => {
                  const isApproved = approvedIds.includes(reg.id);
                  const isRejected = rejectedIds.includes(reg.id);
                  const isActioned = isApproved || isRejected;

                  return (
                    <tr key={reg.id} className={`transition ${isActioned ? "opacity-40" : "hover:bg-slate-50"}`}>
                      <td className="px-6 py-4 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-6 py-4 font-semibold text-navy-900">{reg.name}</td>
                      <td className="px-6 py-4 text-slate-600">{reg.company}</td>
                      <td className="px-6 py-4 text-slate-500">{reg.email}</td>
                      <td className="px-6 py-4 text-slate-400">{reg.submittedAt}</td>
                      <td className="px-6 py-4">
                        {isApproved ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">Approved</span>
                        ) : isRejected ? (
                          <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full border border-red-200">Rejected</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleViewDetails(reg)}
                          className="px-4 py-1.5 text-white text-xs font-semibold rounded-lg transition shadow-sm bg-navy-900 hover:bg-navy-800 cursor-pointer">
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </div>
        </section>

        {/* Pending Request Detail Modal */}
        <PendingRequestDetailModal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          onAccept={handleApprove}
          onDecline={handleReject}
          registration={selectedRegistration}
        />

        {/* Token & Rate Settings */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-navy-900">Token & Rate Configuration</h2>
            <p className="text-sm text-slate-500 mt-0.5">Set platform-wide token pricing and activity rates (in BDT tokens).</p>
          </div>

          <form onSubmit={handlePricingSave} className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-1">Token Price (BDT per token)</label>
                <p className="text-xs text-slate-400 mb-2">How much a user pays in BDT to purchase one token.</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">৳</span>
                  <input type="number" name="pricePerToken" min="0.01" step="any" value={tokenPricing.pricePerToken}
                    onChange={handlePricingChange} className={inputClass} placeholder="e.g. 1.50" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-1">Tender Submission Rate (tokens)</label>
                <p className="text-xs text-slate-400 mb-2">Tokens deducted when a company submits a new tender.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <input type="number" name="tenderSubmitRate" min="0" value={tokenPricing.tenderSubmitRate}
                    onChange={handlePricingChange} className={inputClass} placeholder="e.g. 10" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-1">Bid Submission Rate (tokens)</label>
                <p className="text-xs text-slate-400 mb-2">Tokens deducted each time a user places a bid on a tender.</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <input type="number" name="bidRate" min="0" value={tokenPricing.bidRate}
                    onChange={handlePricingChange} className={inputClass} placeholder="e.g. 5" />
                </div>
              </div>
            </div>

            {/* Summary preview */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Current Rate Summary</p>
              <div className="flex flex-wrap gap-3">
                {[{ label: "1 Token", val: `৳ ${tokenPricing.pricePerToken}` }].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
                    <span className="text-slate-500">{item.label}:</span>
                    <span className="font-bold text-navy-900">{item.val}</span>
                  </div>
                ))}
                {[
                  { label: "Submit Tender", val: tokenPricing.tenderSubmitRate },
                  { label: "Place Bid", val: tokenPricing.bidRate },
                ].map((item, i) => (
                  <div key={`tkn-${i}`} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
                    <span className="text-slate-500">{item.label}:</span>
                    <span className="font-bold text-navy-900">{item.val}</span>
                    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex items-center gap-4">
              <button type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white text-sm font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                Save Changes
              </button>
              {pricingSaved && (
                <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold animate-fade-in">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Changes saved successfully!
                </span>
              )}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
