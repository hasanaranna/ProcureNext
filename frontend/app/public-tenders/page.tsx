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
            <Link href="/news" className="hover:text-white transition">News</Link>
            <Link href="/help" className="hover:text-white transition">Help</Link>
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
      <div className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <span>/</span>
          <span className="text-accent-400">Active Public Tenders</span>
        </div>

        {/* Hero Header */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Public Procurement Opportunities
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Browse Active Public Tenders
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
            Transparent, open-access tender notices for goods, works, and services. Review public specifications, eligibility requirements, and key deadlines.
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tender title, category, buyer..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-accent-400"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-bold text-slate-400 mr-1">Nature:</span>
            {["All", "Goods", "Works", "Services"].map((nature) => (
              <button
                key={nature}
                onClick={() => setSelectedNature(nature)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  selectedNature === nature
                    ? "bg-accent-500 text-white shadow"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {nature}
              </button>
            ))}
          </div>
        </div>

        {/* Tenders Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">Loading active tenders...</div>
        ) : fetchError ? (
          <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-slate-800">
            <p className="text-lg font-bold text-white mb-1">Could not load tenders</p>
            <p className="text-xs text-slate-400">{fetchError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/20 rounded-3xl border border-slate-800">
            <p className="text-lg font-bold text-white mb-1">No active public tenders found</p>
            <p className="text-xs text-slate-400">Try adjusting your keyword search or category filters.</p>
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
                  className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 hover:border-accent-500/40 hover:bg-slate-800/60 transition-all duration-300 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600">
                        REF #{tender.tender_id}
                      </span>
                      {tender.category_name && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-accent-500/20 text-accent-300">
                          {tender.category_name}
                        </span>
                      )}
                      {tender.procurement_nature && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                          {tender.procurement_nature}
                        </span>
                      )}
                      {tender.procurement_method && (
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-700/40 text-slate-400">
                          {tender.procurement_method}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-white hover:text-accent-400 transition-colors">
                      <Link href={`/public-tenders/${tender.tender_id}`}>
                        {tender.title}
                      </Link>
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed">
                      {tender.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        🏢 <strong className="text-slate-200">{tender.buyer_org_name}</strong>
                        {tender.buyer_verified && (
                          <span className="text-emerald-400 font-bold" title="Verified Procuring Entity">✓</span>
                        )}
                      </span>
                      {tender.budget_min && tender.budget_max && (
                        <span className="flex items-center gap-1">
                          💰 Est. Budget: <strong className="text-emerald-400 font-mono">BDT {tender.budget_min.toLocaleString()} - {tender.budget_max.toLocaleString()}</strong>
                        </span>
                      )}
                      {daysLeft !== null && (
                        <span className={`flex items-center gap-1 font-bold ${daysLeft <= 3 ? "text-red-400" : "text-amber-300"}`}>
                          ⏰ {daysLeft > 0 ? `${daysLeft} days remaining` : "Closing today"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex lg:flex-col items-center justify-end gap-3 flex-shrink-0">
                    <button
                      onClick={() => router.push(`/public-tenders/${tender.tender_id}`)}
                      className="w-full lg:w-48 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-bold rounded-xl transition shadow flex items-center justify-center gap-1"
                    >
                      View Public Notice →
                    </button>
                    <button
                      onClick={() => router.push("/signup-master")}
                      className="w-full lg:w-48 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
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
