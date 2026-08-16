"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const NEWS_ARTICLES = [
  {
    id: 1,
    category: "Platform Release",
    title: "ProcureNext 3.0 Launches with WORM Cryptographic Audit Logging",
    date: "August 15, 2026",
    summary: "New enterprise security upgrades introduce SHA-256 hash chaining, database-level tamper prevention triggers, and automated Change Data Capture for maximum procurement compliance.",
    badge: "New Release",
    readTime: "4 min read",
  },
  {
    id: 2,
    category: "Market Report",
    title: "National Procurement Trends: Digital Tendering Adoption Grows 140%",
    date: "August 02, 2026",
    summary: "Over 500 enterprise buyers transitioned to digital procurement workflows this quarter, citing reduced bidding cycles and real-time vendor performance comparison matrix benefits.",
    badge: "Industry Insights",
    readTime: "6 min read",
  },
  {
    id: 3,
    category: "Feature Spotlight",
    title: "Buyer Evaluation Matrix: Side-by-Side Multi-Bid Comparison",
    date: "July 24, 2026",
    summary: "Discover how the new bid comparison feature streamlines procurement decisions with itemized document checklists, enlistment tags, financial comparisons, and recommended seller badges.",
    badge: "Feature",
    readTime: "3 min read",
  },
  {
    id: 4,
    category: "Partnership",
    title: "ProcureNext Partners with Regulatory Bodies for Instant Document Validation",
    date: "July 10, 2026",
    summary: "Accelerating vendor onboarding with direct Trade License, TIN, and VAT verification pipelines, cutting master account approval times from days to hours.",
    badge: "Partnership",
    readTime: "5 min read",
  },
];

export default function NewsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("All");

  const categories = ["All", "Platform Release", "Market Report", "Feature Spotlight", "Partnership"];
  const filteredArticles = filter === "All" ? NEWS_ARTICLES : NEWS_ARTICLES.filter(a => a.category === filter);

  return (
    <main className="w-full min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* ── Header / Navigation ──────────────────────────── */}
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
            <Link href="/about" className="hover:text-white transition">About</Link>
            <Link href="/policies" className="hover:text-white transition">Policies</Link>
            <Link href="/legal" className="hover:text-white transition">Legal Notices</Link>
            <Link href="/news" className="text-accent-400 font-bold">News</Link>
            <Link href="/events" className="hover:text-white transition">Events</Link>
            <Link href="/help" className="hover:text-white transition">Help & Support</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/login")}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition">
              Login
            </button>
            <button onClick={() => router.push("/signup-master")}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-accent-500 hover:bg-accent-600 text-white rounded-xl transition shadow">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto px-6 py-16 w-full animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-6">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <span>/</span>
          <span className="text-accent-400">News & Announcements</span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-xs font-bold mb-4">
            📰 Press Releases & Updates
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Latest News & Announcements
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            Stay informed on platform improvements, procurement regulatory changes, feature releases, and supply chain insights.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-1.5 text-xs font-bold rounded-xl transition ${
                filter === cat
                  ? "bg-accent-500 text-white shadow"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredArticles.map((article) => (
            <article
              key={article.id}
              className="p-6 rounded-3xl bg-slate-800/40 border border-slate-800 hover:border-accent-500/50 hover:bg-slate-800/70 transition-all duration-300 flex flex-col justify-between shadow-lg group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-accent-500/20 text-accent-300">
                    {article.badge}
                  </span>
                  <span className="text-xs text-slate-500">{article.readTime}</span>
                </div>
                <h2 className="text-lg font-bold text-white mb-2 group-hover:text-accent-400 transition-colors">
                  {article.title}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {article.summary}
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span>{article.date}</span>
                <span className="text-accent-400 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Read Article →
                </span>
              </div>
            </article>
          ))}
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
