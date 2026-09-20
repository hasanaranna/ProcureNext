"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

const UPCOMING_EVENTS = [
  {
    id: 1,
    title: "ProcureNext Annual Summit 2026",
    type: "Conference & Expo",
    date: "September 18-19, 2026",
    time: "09:00 AM - 05:00 PM (GMT+6)",
    location: "Bangabandhu International Conference Center (BICC), Dhaka & Virtual",
    description: "Join 1,200+ procurement officers, enterprise buyers, and verified suppliers discussing digital procurement transformation, WORM audit compliance, and automated supplier discovery.",
    status: "Registration Open",
  },
  {
    id: 2,
    title: "Masterclass: Mastering Bid Compliance & Document Verification",
    type: "Webinar",
    date: "August 28, 2026",
    time: "03:00 PM - 04:30 PM (GMT+6)",
    location: "Live Zoom Webinar",
    description: "A comprehensive walkthrough for vendor organizations on structuring mandatory compliance files, NID verification, bid securities, and avoiding technical disqualifications.",
    status: "Free Access",
  },
  {
    id: 3,
    title: "Buyer Workshop: Multi-Criteria Tender Evaluation & Scoring",
    type: "Workshop",
    date: "September 05, 2026",
    time: "10:00 AM - 01:00 PM (GMT+6)",
    location: "ProcureNext Academy / Online",
    description: "Learn how to configure weighted evaluation matrices, set role-based document access, and perform compliant comparative bid evaluations with 0% margin for error.",
    status: "Limited Seats",
  },
];

export default function EventsPage() {
  const router = useRouter();

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
            <Link href="/news" className="hover:text-content-primary transition">News</Link>
            <Link href="/events" className="text-brand-blue font-semibold">Events</Link>
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
          <span className="text-brand-blue">Events & Summits</span>
        </div>

        {/* Hero */}
        <div className="mb-12 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-subtle bg-surface text-content-secondary text-xs font-medium mb-4">
            📅 Procurement Conferences & Webinars
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-content-primary tracking-tight mb-4">
            Upcoming Events & Workshops
          </h1>
          <p className="text-sm sm:text-base text-content-secondary max-w-3xl leading-relaxed">
            Connect with procurement leaders, attend training masterclasses, and explore best practices in public and enterprise supply chain management.
          </p>
        </div>

        {/* Events List */}
        <div className="space-y-6">
          {UPCOMING_EVENTS.map((event) => (
            <div
              key={event.id}
              className="p-6 sm:p-8 rounded bg-surface border border-subtle hover:shadow-subtle-card transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-status badge-approved text-[10px]">
                    <span className="badge-dot"></span>
                    {event.type}
                  </span>
                  <span className="badge-status badge-pending text-[10px]">
                    <span className="badge-dot"></span>
                    {event.status}
                  </span>
                </div>
                <h2 className="text-base font-bold text-content-primary">
                  {event.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-content-muted">
                  <span className="flex items-center gap-1.5">
                    🗓️ <strong className="text-content-secondary">{event.date}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    ⏰ {event.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    📍 {event.location}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-content-secondary leading-relaxed pt-2">
                  {event.description}
                </p>
              </div>

              <div className="flex sm:flex-col justify-end gap-2 flex-shrink-0">
                <button
                  onClick={() => router.push("/signup-master")}
                  className="h-9 px-3.5 bg-brand-navy hover:bg-slate-900 text-white text-sm font-medium rounded transition"
                >
                  Register to Attend
                </button>
              </div>
            </div>
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
