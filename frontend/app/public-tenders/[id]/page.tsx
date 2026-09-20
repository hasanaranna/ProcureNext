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
      <main className="w-full min-h-screen bg-app text-content-primary flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-brand-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-content-muted">Loading public tender notice...</p>
        </div>
      </main>
    );
  }

  if (!tender) {
    return (
      <main className="w-full min-h-screen bg-app text-content-primary flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center p-8 rounded bg-surface border border-subtle">
          <h2 className="text-xl font-bold text-content-primary mb-2">Tender Notice Not Found</h2>
          <p className="text-xs text-content-muted mb-6">
            {fetchError || "This tender may be restricted, draft, or closed to public viewing."}
          </p>
          <button
            onClick={() => router.push("/public-tenders")}
            className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
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
    <main className="w-full min-h-screen bg-app text-content-primary flex flex-col justify-between">
      {/* ── Sticky Navigation ──────────────────────────── */}
      <header className="w-full border-b border-subtle bg-surface sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-brand-navy flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-content-primary tracking-tight">ProcureNext</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-content-secondary">
            <Link href="/public-tenders" className="text-brand-blue font-bold">Active Tenders</Link>
            <Link href="/about" className="hover:text-content-primary transition">About</Link>
            <Link href="/policies" className="hover:text-content-primary transition">Policies</Link>
            <Link href="/legal" className="hover:text-content-primary transition">Legal</Link>
            <Link href="/help" className="hover:text-content-primary transition">Help & Support</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-content-secondary hover:text-content-primary transition"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/signup-master")}
              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
            >
              Register to Bid
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full animate-fade-in space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-content-secondary text-xs font-medium">
          <Link href="/" className="hover:text-content-primary transition">Home</Link>
          <span>/</span>
          <Link href="/public-tenders" className="hover:text-content-primary transition">Active Tenders</Link>
          <span>/</span>
          <span className="text-brand-blue tabular-nums">Notice #{tender.tender_id}</span>
        </div>

        {/* Public Notice Banner */}
        <div className="p-6 sm:p-8 rounded bg-surface border border-subtle space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-subtle pb-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge-status badge-draft">
                  <span className="badge-dot" />
                  <span className="tabular-nums">TENDER ID: #{tender.tender_id}</span>
                </span>
                <span className="badge-status badge-approved">
                  <span className="badge-dot" />
                  ACTIVE FOR BIDDING
                </span>
                {tender.category_name && (
                  <span className="badge-status badge-draft">
                    <span className="badge-dot" />
                    {tender.category_name}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-content-primary leading-tight">
                {tender.title}
              </h1>
            </div>

            <div className="text-right">
              <span className="text-content-secondary text-xs font-medium uppercase block">Submission Deadline</span>
              <span className="text-sm font-semibold text-content-primary tabular-nums block">
                {deadlineDate ? deadlineDate.toLocaleDateString(undefined, { dateStyle: "long" }) : "N/A"}
              </span>
              {daysRemaining !== null && (
                <span className="text-xs text-status-approved-text font-medium block tabular-nums">
                  {daysRemaining > 0 ? `(${daysRemaining} days left)` : "(Closing today)"}
                </span>
              )}
            </div>
          </div>

          {/* Quick Notice Action Box */}
          <div className="p-4 rounded bg-app border border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-content-secondary space-y-0.5 text-center sm:text-left">
              <p className="font-semibold text-content-primary">Verified Vendor Participation Required</p>
              <p className="text-content-muted">To view full technical drawings or submit a proposal, log in with a verified vendor account.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => router.push("/login")}
                className="bg-surface text-content-primary border border-subtle hover:bg-slate-100 text-sm font-medium h-9 px-3.5 rounded transition"
              >
                Login to Bid
              </button>
              <button
                onClick={() => router.push("/signup-master")}
                className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
              >
                Register Vendor
              </button>
            </div>
          </div>
        </div>

        {/* Structured Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Section 1: Procuring Entity & Legal Info */}
          <div className="p-5 rounded bg-surface border border-subtle space-y-3">
            <h2 className="text-sm font-semibold text-content-primary">
              Procuring Entity & Administrative Details
            </h2>
            <div className="space-y-1 text-xs text-content-secondary">
              <div className="flex justify-between py-1.5 border-b border-subtle">
                <span className="text-content-muted">Procuring Entity:</span>
                <span className="font-semibold text-content-primary flex items-center gap-1">
                  {tender.buyer_org_name}
                  {tender.buyer_verified && <span className="text-status-approved-text">✓</span>}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-subtle">
                <span className="text-content-muted">Organization Type:</span>
                <span>{tender.buyer_org_type || "Commercial Buyer"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-subtle">
                <span className="text-content-muted">Procurement Method:</span>
                <span className="font-medium text-content-primary">{tender.procurement_method || "Open Tendering Method"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-subtle">
                <span className="text-content-muted">Procurement Nature:</span>
                <span className="font-medium text-content-primary">{tender.procurement_nature || "Goods"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-content-muted">Visibility:</span>
                <span className="text-status-approved-text font-semibold">Public (Open Competition)</span>
              </div>
            </div>
          </div>

          {/* Section 2: Key Dates & Timeline */}
          <div className="p-5 rounded bg-surface border border-subtle space-y-3">
            <h2 className="text-sm font-semibold text-content-primary">
              Key Dates & Schedule
            </h2>
            <div className="space-y-1 text-xs text-content-secondary">
              <div className="flex justify-between py-1.5 border-b border-subtle">
                <span className="text-content-muted">Publication Date:</span>
                <span className="tabular-nums">{tender.tender_public_date ? new Date(tender.tender_public_date).toLocaleDateString() : "Immediate"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-subtle">
                <span className="text-content-muted">Pre-Bid Meeting:</span>
                <span className="tabular-nums">{tender.pre_bid_meeting ? new Date(tender.pre_bid_meeting).toLocaleDateString() : "Not Applicable"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-subtle">
                <span className="text-content-muted">Submission Closing:</span>
                <span className="font-semibold text-status-pending-text tabular-nums">{deadlineDate ? deadlineDate.toLocaleDateString() : "Open"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-content-muted">Tender Opening Date:</span>
                <span className="tabular-nums">{tender.tender_opening_date ? new Date(tender.tender_opening_date).toLocaleDateString() : "Upon Closing"}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Financial Terms & Bid Security */}
          <div className="p-5 rounded bg-surface border border-subtle space-y-3">
            <h2 className="text-sm font-semibold text-content-primary">
              Financial Terms & Guarantees
            </h2>
            <div className="space-y-1 text-xs text-content-secondary">
              <div className="flex justify-between py-1.5 border-b border-subtle">
                <span className="text-content-muted">Estimated Budget Range:</span>
                <span className="font-semibold text-content-primary tabular-nums">
                  {tender.budget_min && tender.budget_max
                    ? `BDT ${tender.budget_min.toLocaleString()} - ${tender.budget_max.toLocaleString()}`
                    : "Published in Tender Document"}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-subtle">
                <span className="text-content-muted">Bid Security Required:</span>
                <span className={tender.security_required ? "text-status-approved-text font-semibold" : "text-content-muted"}>
                  {tender.security_required ? "Yes (Bank Guarantee / Pay Order)" : "No Security Required"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-content-muted">Proposal Validity Period:</span>
                <span className="tabular-nums">{tender.proposal_valid_until ? new Date(tender.proposal_valid_until).toLocaleDateString() : "90 Days"}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Eligibility & Mandatory Checklist */}
          <div className="p-5 rounded bg-surface border border-subtle space-y-3">
            <h2 className="text-sm font-semibold text-content-primary">
              Eligibility & Required Compliance Documents
            </h2>
            {tender.required_documents && tender.required_documents.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {tender.required_documents.map((doc) => (
                  <li
                    key={doc.req_doc_id}
                    className="flex items-center justify-between p-2 rounded bg-app border border-subtle"
                  >
                    <span className="text-content-primary">{doc.custom_doc_name}</span>
                    <span
                      className={`badge-status ${
                        doc.is_mandatory ? "badge-rejected" : "badge-draft"
                      }`}
                    >
                      <span className="badge-dot" />
                      {doc.is_mandatory ? "Mandatory" : "Optional"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-content-muted">Standard regulatory trade license and TIN compliance required.</p>
            )}
          </div>
        </div>

        {/* Section 5: Public Scope of Work */}
        <div className="p-6 sm:p-8 rounded bg-surface border border-subtle space-y-3">
          <h2 className="text-sm font-semibold text-content-primary">
            Detailed Scope of Work & Specification Notice
          </h2>
          <div className="text-xs sm:text-sm text-content-secondary leading-relaxed whitespace-pre-line bg-app p-5 rounded border border-subtle">
            {tender.description}
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="w-full py-8 px-6 bg-surface border-t border-subtle">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-content-muted">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-content-secondary">ProcureNext</span>
            <span>• Enterprise Procurement Platform</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="hover:text-content-primary">About</Link>
            <Link href="/policies" className="hover:text-content-primary">Policies</Link>
            <Link href="/legal" className="hover:text-content-primary">Legal</Link>
            <Link href="/news" className="hover:text-content-primary">News</Link>
            <Link href="/events" className="hover:text-content-primary">Events</Link>
            <Link href="/help" className="hover:text-content-primary">Help</Link>
          </div>
          <p>© {new Date().getFullYear()} ProcureNext. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
