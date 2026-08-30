"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RequiredDoc {
  req_doc_id: number;
  custom_doc_name: string;
  is_mandatory: boolean;
}

interface PublicTenderDetail {
  tender_id: number;
  title: string;
  description: string;
  status: string;
  visibility_type?: string;
  category_name?: string;
  procurement_nature?: string;
  procurement_method?: string;
  buyer_org_name: string;
  buyer_org_type?: string;
  buyer_verified?: boolean;
  buyer_org_website?: string;
  budget_min?: number;
  budget_max?: number;
  security_required?: boolean;
  security_valid_until?: string;
  proposal_valid_until?: string;
  tender_public_date?: string;
  pre_bid_meeting?: string;
  tender_opening_date?: string;
  submission_deadline?: string;
  created_at: string;
  required_documents?: RequiredDoc[];
}

export default function PublicTenderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const tenderId = resolvedParams.id;

  const [tender, setTender] = useState<PublicTenderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTenderDetail() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch(`/api/tenders/public/${tenderId}`);
        if (res.ok) {
          const data = await res.json();
          setTender(data);
        } else {
          setTender(null);
          setFetchError("This tender may be restricted, closed, or no longer available.");
        }
      } catch {
        setTender(null);
        setFetchError("Unable to load this tender notice. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadTenderDetail();
  }, [tenderId]);

  if (loading) {
    return (
      <main className="w-full min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading public tender notice...</p>
        </div>
      </main>
    );
  }

  if (!tender) {
    return (
      <main className="w-full min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center p-8 rounded-3xl bg-slate-800/40 border border-slate-800">
          <h2 className="text-xl font-bold text-white mb-2">Tender Notice Not Found</h2>
          <p className="text-xs text-slate-400 mb-6">
            {fetchError || "This tender may be restricted, draft, or closed to public viewing."}
          </p>
          <button
            onClick={() => router.push("/public-tenders")}
            className="px-6 py-2.5 bg-accent-500 text-white text-xs font-bold rounded-xl transition"
          >
            Back to Active Tenders
          </button>
        </div>
      </main>
    );
  }

  const deadlineDate = tender.submission_deadline ? new Date(tender.submission_deadline) : null;
  const daysRemaining = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <main className="w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* ── Sticky Navigation ──────────────────────────── */}
      <header className="w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">ProcureNext</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <Link href="/public-tenders" className="text-accent-400 font-bold">Active Tenders</Link>
            <Link href="/about" className="hover:text-white transition">About</Link>
            <Link href="/policies" className="hover:text-white transition">Policies</Link>
            <Link href="/legal" className="hover:text-white transition">Legal</Link>
            <Link href="/help" className="hover:text-white transition">Help & Support</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/signup-master")}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-accent-500 hover:bg-accent-600 text-white rounded-xl transition shadow"
            >
              Register to Bid
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full animate-fade-in space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <span>/</span>
          <Link href="/public-tenders" className="hover:text-white transition">Active Tenders</Link>
          <span>/</span>
          <span className="text-accent-400">Notice #{tender.tender_id}</span>
        </div>

        {/* Public Notice Banner */}
        <div className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600">
                  TENDER ID: #{tender.tender_id}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  ● ACTIVE FOR BIDDING
                </span>
                {tender.category_name && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-accent-500/20 text-accent-300">
                    {tender.category_name}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {tender.title}
              </h1>
            </div>

            <div className="text-right">
              <span className="text-[11px] uppercase font-bold text-slate-400 block">Submission Deadline</span>
              <span className="text-sm sm:text-base font-mono font-bold text-amber-300 block">
                {deadlineDate ? deadlineDate.toLocaleDateString(undefined, { dateStyle: "long" }) : "N/A"}
              </span>
              {daysRemaining !== null && (
                <span className="text-xs text-emerald-400 font-semibold block">
                  {daysRemaining > 0 ? `(${daysRemaining} days left)` : "(Closing today)"}
                </span>
              )}
            </div>
          </div>

          {/* Quick Notice Action Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-500/10 via-slate-800/60 to-purple-500/10 border border-accent-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-300 space-y-0.5 text-center sm:text-left">
              <p className="font-bold text-white">📢 Verified Vendor Participation Required</p>
              <p className="text-slate-400">To view full technical drawings or submit a proposal, log in with a verified vendor account.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-white text-navy-900 text-xs font-bold rounded-xl hover:bg-slate-100 transition shadow"
              >
                Login to Bid
              </button>
              <button
                onClick={() => router.push("/signup-master")}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white text-xs font-bold rounded-xl transition shadow"
              >
                Register Vendor
              </button>
            </div>
          </div>
        </div>

        {/* Structured Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Procuring Entity & Legal Info */}
          <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🏛️</span> Procuring Entity & Administrative Details
            </h2>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Procuring Entity:</span>
                <span className="font-bold text-white flex items-center gap-1">
                  {tender.buyer_org_name}
                  {tender.buyer_verified && <span className="text-emerald-400">✓</span>}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Organization Type:</span>
                <span>{tender.buyer_org_type || "Commercial Buyer"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Procurement Method:</span>
                <span className="font-semibold text-accent-300">{tender.procurement_method || "Open Tendering Method"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Procurement Nature:</span>
                <span className="font-semibold text-purple-300">{tender.procurement_nature || "Goods"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Visibility:</span>
                <span className="text-emerald-400 font-bold">Public (Open Competition)</span>
              </div>
            </div>
          </div>

          {/* Section 2: Key Dates & Timeline */}
          <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>⏰</span> Key Dates & Schedule
            </h2>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Publication Date:</span>
                <span>{tender.tender_public_date ? new Date(tender.tender_public_date).toLocaleDateString() : "Immediate"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Pre-Bid Meeting:</span>
                <span>{tender.pre_bid_meeting ? new Date(tender.pre_bid_meeting).toLocaleDateString() : "Not Applicable"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Submission Closing:</span>
                <span className="font-bold text-amber-300">{deadlineDate ? deadlineDate.toLocaleDateString() : "Open"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Tender Opening Date:</span>
                <span>{tender.tender_opening_date ? new Date(tender.tender_opening_date).toLocaleDateString() : "Upon Closing"}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Financial Terms & Bid Security */}
          <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>💰</span> Financial Terms & Guarantees
            </h2>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Estimated Budget Range:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {tender.budget_min && tender.budget_max
                    ? `BDT ${tender.budget_min.toLocaleString()} - ${tender.budget_max.toLocaleString()}`
                    : "Published in Tender Document"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Bid Security Required:</span>
                <span className={tender.security_required ? "text-emerald-400 font-bold" : "text-slate-400"}>
                  {tender.security_required ? "Yes (Bank Guarantee / Pay Order)" : "No Security Required"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Proposal Validity Period:</span>
                <span>{tender.proposal_valid_until ? new Date(tender.proposal_valid_until).toLocaleDateString() : "90 Days"}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Eligibility & Mandatory Checklist */}
          <div className="p-6 rounded-3xl bg-slate-800/30 border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>📋</span> Eligibility & Required Compliance Documents
            </h2>
            {tender.required_documents && tender.required_documents.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {tender.required_documents.map((doc) => (
                  <li
                    key={doc.req_doc_id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80"
                  >
                    <span className="text-slate-300">{doc.custom_doc_name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        doc.is_mandatory ? "bg-red-500/20 text-red-300" : "bg-slate-700 text-slate-400"
                      }`}
                    >
                      {doc.is_mandatory ? "* Mandatory" : "Optional"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">Standard regulatory trade license and TIN compliance required.</p>
            )}
          </div>
        </div>

        {/* Section 5: Public Scope of Work */}
        <div className="p-8 rounded-3xl bg-slate-800/30 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📦</span> Detailed Scope of Work & Specification Notice
          </h2>
          <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
            {tender.description}
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="w-full py-8 px-6 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">ProcureNext</span>
            <span>• Enterprise Procurement Platform</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/policies" className="hover:text-white">Policies</Link>
            <Link href="/legal" className="hover:text-white">Legal</Link>
            <Link href="/news" className="hover:text-white">News</Link>
            <Link href="/events" className="hover:text-white">Events</Link>
            <Link href="/help" className="hover:text-white">Help</Link>
          </div>
          <p>© {new Date().getFullYear()} ProcureNext. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
