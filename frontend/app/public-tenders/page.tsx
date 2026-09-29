"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PublicTender {
  tender_id: number;
  title: string;
  description: string;

  status: string;
  category_name?: string;
  procurement_nature?: string;
  procurement_method?: string;
  buyer_org_name: string;
  buyer_org_type?: string;
  buyer_verified?: boolean;
  budget_min?: number;
  budget_max?: number;
  security_required?: boolean;
  submission_deadline?: string;
  tender_public_date?: string;
  created_at: string;
}

export default function PublicTendersPage() {
  const router = useRouter();
  const [tenders, setTenders] = useState<PublicTender[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedNature, setSelectedNature] = useState<string>("All");

  useEffect(() => {
    async function fetchPublicTenders() {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await fetch("/api/tenders/public/active");
        if (!res.ok) {
          throw new Error("Failed to load public tenders.");
        }
        const data = await res.json();
        setTenders(Array.isArray(data) ? data : []);
      } catch {
        setFetchError("Unable to load public tenders. Please try again later.");
        setTenders([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPublicTenders();
  }, []);

  const filtered = tenders.filter((t) => {
    const matchesSearch =
      search.trim() === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.buyer_org_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.category_name && t.category_name.toLowerCase().includes(search.toLowerCase()));

    const matchesNature = selectedNature === "All" || t.procurement_nature === selectedNature;

    return matchesSearch && matchesNature;
  });

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
            <Link href="/news" className="hover:text-content-primary transition">News</Link>
            <Link href="/help" className="hover:text-content-primary transition">Help</Link>
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
      <div className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-content-secondary mb-6">
          <Link href="/" className="hover:text-content-primary transition">Home</Link>
          <span>/</span>
          <span className="text-brand-blue">Active Public Tenders</span>
        </div>

        {/* Hero Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 badge-status badge-approved text-xs font-bold mb-3">
            <span className="badge-dot" />
            Live Public Procurement Opportunities
          </div>
          <h1 className="text-xl font-semibold text-content-primary tracking-tight mb-3">
            Browse Active Public Tenders
          </h1>
          <p className="text-sm sm:text-base text-content-secondary max-w-3xl leading-relaxed">
            Transparent, open-access tender notices for goods, works, and services. Review public specifications, eligibility requirements, and key deadlines.
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="p-4 bg-surface border border-subtle rounded mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tender title, category, buyer..."
              className="w-full pl-10 pr-4 py-2.5 bg-app border border-subtle rounded text-xs sm:text-sm text-content-primary placeholder-content-muted focus:outline-none focus:border-brand-blue"
            />
            <svg className="w-4 h-4 text-content-muted absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-content-secondary text-xs font-medium mr-1">Nature:</span>
            {["All", "Goods", "Works", "Services"].map((nature) => (
              <button
                key={nature}
                onClick={() => setSelectedNature(nature)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                  selectedNature === nature
                    ? "bg-brand-navy text-white"
                    : "bg-app text-content-secondary hover:text-content-primary"
                }`}
              >
                {nature}
              </button>
            ))}
          </div>
        </div>

        {/* Tenders Grid */}
        {loading ? (
          <div className="text-center py-20 text-content-secondary">Loading active tenders...</div>
        ) : fetchError ? (
          <div className="text-center py-20 bg-surface rounded border border-subtle">
            <p className="text-lg font-bold text-content-primary mb-1">Could not load tenders</p>
            <p className="text-xs text-content-secondary">{fetchError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded border border-subtle">
            <p className="text-lg font-bold text-content-primary mb-1">No active public tenders found</p>
            <p className="text-xs text-content-secondary">Try adjusting your keyword search or category filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filtered.map((tender) => {
              const deadlineDate = tender.submission_deadline ? new Date(tender.submission_deadline) : null;
              const daysLeft = deadlineDate
                ? Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div
                  key={tender.tender_id}
                  className="p-6 bg-surface rounded border border-subtle hover:border-brand-blue transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium tabular-nums px-2.5 py-0.5 rounded bg-app text-content-secondary border border-subtle">
                        REF #{tender.tender_id}
                      </span>
                      {tender.category_name && (
                        <span className="text-xs font-medium px-2.5 py-0.5 badge-status badge-draft">
                          {tender.category_name}
                        </span>
                      )}
                      {tender.procurement_nature && (
                        <span className="text-xs font-medium px-2.5 py-0.5 badge-status badge-draft">
                          {tender.procurement_nature}
                        </span>
                      )}
                      {tender.procurement_method && (
                        <span className="text-xs font-medium px-2.5 py-0.5 badge-status badge-draft">
                          {tender.procurement_method}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-content-primary hover:text-brand-blue transition-colors">
                      <Link href={`/public-tenders/${tender.tender_id}`}>
                        {tender.title}
                      </Link>
                    </h2>

                    <p className="text-xs sm:text-sm text-content-secondary line-clamp-2 leading-relaxed">
                      {tender.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-content-secondary pt-2 border-t border-subtle">
                      <span className="flex items-center gap-1.5">
                        🏢 <strong className="text-content-primary">{tender.buyer_org_name}</strong>
                        {tender.buyer_verified && (
                          <span className="text-status-approved-text font-bold" title="Verified Procuring Entity">✓</span>
                        )}
                      </span>
                      {tender.budget_min && tender.budget_max && (
                        <span className="flex items-center gap-1">
                          💰 Est. Budget: <strong className="text-content-primary tabular-nums font-medium">BDT {tender.budget_min.toLocaleString()} - {tender.budget_max.toLocaleString()}</strong>
                        </span>
                      )}
                      {daysLeft !== null && (
                        <span className={`flex items-center gap-1 font-bold ${daysLeft <= 3 ? "text-status-rejected-text" : "text-status-pending-text"}`}>
                          ⏰ {daysLeft > 0 ? `${daysLeft} days remaining` : "Closing today"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex lg:flex-col items-center justify-end gap-3 flex-shrink-0">
                    <button
                      onClick={() => router.push("/signup-master")}
                      className="w-full lg:w-48 bg-app text-content-secondary border border-subtle rounded text-sm font-medium h-9 px-3.5 transition"
                    >
                      Register to Bid
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="w-full py-8 px-6 bg-surface border-t border-subtle">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-content-muted">
          <div className="flex items-center gap-2">
            <span className="font-bold text-content-secondary">ProcureNext</span>
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
