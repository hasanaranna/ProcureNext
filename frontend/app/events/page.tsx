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
            <Link href="/news" className="hover:text-white transition">News</Link>
            <Link href="/events" className="text-accent-400 font-bold">Events</Link>
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
          <span className="text-accent-400">Events & Summits</span>
        </div>

        {/* Hero */}
        <div className="mb-12 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-xs font-bold mb-4">
            📅 Procurement Conferences & Webinars
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Upcoming Events & Workshops
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            Connect with procurement leaders, attend training masterclasses, and explore best practices in public and enterprise supply chain management.
          </p>
        </div>

        {/* Events List */}
        <div className="space-y-6">
          {UPCOMING_EVENTS.map((event) => (
            <div
              key={event.id}
              className="p-6 sm:p-8 rounded-3xl bg-slate-800/40 border border-slate-800 hover:border-accent-500/40 hover:bg-slate-800/60 transition-all duration-300 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300">
                    {event.type}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-accent-500/20 text-accent-300">
                    {event.status}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {event.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    🗓️ <strong className="text-slate-300">{event.date}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    ⏰ {event.time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    📍 {event.location}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pt-2">
                  {event.description}
                </p>
              </div>

              <div className="flex sm:flex-col justify-end gap-2 flex-shrink-0">
                <button
                  onClick={() => router.push("/signup-master")}
                  className="px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-xs font-bold rounded-xl transition shadow"
                >
                  Register to Attend
                </button>
              </div>
            </div>
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
