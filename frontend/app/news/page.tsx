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
    <main className="w-full min-h-screen bg-app text-content-primary flex flex-col justify-between">
      {/* ── Header / Navigation ──────────────────────────── */}
      <header className="w-full border-b border-subtle bg-surface sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-brand-navy flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-content-primary tracking-tight">ProcureNext</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-content-secondary">
            <Link href="/about" className="hover:text-content-primary transition">About</Link>
            <Link href="/policies" className="hover:text-content-primary transition">Policies</Link>
            <Link href="/legal" className="hover:text-content-primary transition">Legal Notices</Link>
            <Link href="/news" className="text-brand-blue font-semibold">News</Link>
            <Link href="/events" className="hover:text-content-primary transition">Events</Link>
            <Link href="/help" className="hover:text-content-primary transition">Help & Support</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/login")}
              className="px-3.5 py-2 text-xs sm:text-sm font-medium text-content-secondary hover:text-content-primary transition">
              Login
            </button>
            <button onClick={() => router.push("/signup-master")}
              className="h-9 px-3.5 text-sm font-medium bg-brand-navy text-white rounded hover:bg-slate-900 transition">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto px-6 py-16 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-medium text-content-secondary mb-6">
          <Link href="/" className="hover:text-content-primary transition">Home</Link>
          <span>/</span>
          <span className="text-brand-blue">News & Announcements</span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-subtle bg-surface text-content-secondary text-xs font-medium mb-4">
            📰 Press Releases & Updates
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-content-primary tracking-tight mb-4">
            Latest News & Announcements
          </h1>
          <p className="text-sm sm:text-base text-content-secondary max-w-3xl leading-relaxed">
            Stay informed on platform improvements, procurement regulatory changes, feature releases, and supply chain insights.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded transition ${
                filter === cat
                  ? "bg-brand-navy text-white"
                  : "bg-app text-content-secondary border border-subtle hover:text-content-primary"
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
              className="p-6 rounded bg-surface border border-subtle hover:shadow-subtle-card transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="badge-status badge-draft text-[10px]">
                    <span className="badge-dot"></span>
                    {article.badge}
                  </span>
                  <span className="text-xs text-content-muted">{article.readTime}</span>
                </div>
                <h2 className="text-base font-bold text-content-primary mb-2 group-hover:text-brand-blue transition-colors">
                  {article.title}
                </h2>
                <p className="text-xs text-content-secondary leading-relaxed mb-4">
                  {article.summary}
                </p>
              </div>
              <div className="pt-4 border-t border-subtle flex items-center justify-between text-xs text-content-muted">
                <span>{article.date}</span>
                <span className="text-brand-blue font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  Read Article →
                </span>
              </div>
            </article>
          ))}
        </div>
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
