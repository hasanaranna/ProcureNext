"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  return (
    <main className="w-full bg-app">
      {/* ── Sticky Navigation ──────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-navy/95 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-[52px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[14px] font-bold text-white tracking-tight">ProcureNext</span>
          </Link>

          <div className="hidden lg:flex items-center gap-5 text-xs font-medium text-slate-300">
            <Link href="/public-tenders" className="text-white hover:text-slate-200 transition">Active Tenders</Link>
            <Link href="/about" className="hover:text-white transition">About</Link>
            <Link href="/policies" className="hover:text-white transition">Policies</Link>
            <Link href="/legal" className="hover:text-white transition">Legal</Link>
            <Link href="/news" className="hover:text-white transition">News</Link>
            <Link href="/events" className="hover:text-white transition">Events</Link>
            <Link href="/help" className="hover:text-white transition">Help</Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/login")}
              className="h-8 px-3 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/signup-master")}
              className="h-8 px-3.5 text-sm font-medium bg-white text-brand-navy rounded hover:bg-slate-100 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero — brand-first navy plane ─────────────── */}
      <section className="relative w-full min-h-[88vh] flex items-center overflow-hidden bg-brand-navy">
        {/* Subtle enterprise grid (not glow) */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.18),_transparent_55%)]" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-24 pb-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded bg-white flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">ProcureNext</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-semibold text-white leading-tight tracking-tight mb-4">
              Enterprise procurement, end to end.
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mb-8 leading-relaxed">
              Create tenders, collect bids, and award vendors on one secure platform — built for formal, high-volume spend teams.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => router.push("/login")}
                className="h-10 px-5 bg-white text-brand-navy font-medium rounded hover:bg-slate-100 transition-colors text-sm"
              >
                Login to Dashboard
              </button>
              <button
                onClick={() => router.push("/signup-master")}
                className="h-10 px-5 bg-transparent text-white font-medium rounded border border-white/25 hover:bg-white/10 transition-colors text-sm"
              >
                Register Organization
              </button>
            </div>
          </div>

          {/* Compact capability strip — not a dashboard */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10 rounded overflow-hidden max-w-3xl">
            {[
              { label: "Tender lifecycle", meta: "Draft → Award" },
              { label: "Vendor bidding", meta: "Sealed & tracked" },
              { label: "Token billing", meta: "Usage-based" },
              { label: "Audit trail", meta: "Immutable log" },
            ].map((item) => (
              <div key={item.label} className="bg-brand-navy/80 px-4 py-3.5">
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{item.meta}</p>
                <p className="text-sm font-semibold text-white mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product pillars ───────────────────────────── */}
      <section className="w-full py-20 px-6 border-b border-subtle">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 max-w-xl">
            <p className="text-content-secondary text-xs font-medium uppercase tracking-wider mb-2">Platform</p>
            <h2 className="text-2xl md:text-3xl font-semibold text-content-primary tracking-tight">
              Built for buyers and sellers in the same workspace.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                title: "Publish & manage tenders",
                desc: "Structured requisitions, document packs, and status from draft through award.",
                path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
              },
              {
                title: "Evaluate competing bids",
                desc: "Side-by-side bid review with compliance checks and clear award actions.",
                path: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
              },
              {
                title: "Govern org access",
                desc: "Invites, roles, and token packages controlled from a single admin surface.",
                path: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
              },
            ].map((card) => (
              <div key={card.title} className="bg-surface border border-subtle rounded p-5">
                <div className="w-9 h-9 rounded bg-brand-navy flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.path} />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-content-primary mb-1.5">{card.title}</h3>
                <p className="text-xs text-content-secondary leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────── */}
      <section className="w-full py-14 px-6 bg-surface border-b border-subtle">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-6">
          {[
            { value: "500+", label: "Organizations onboarded" },
            { value: "৳2B+", label: "Procurement value managed" },
            { value: "99.9%", label: "Platform uptime target" },
          ].map((stat) => (
            <div key={stat.label} className="text-center sm:text-left px-2">
              <p className="text-3xl font-semibold text-content-primary tabular-nums tracking-tight">{stat.value}</p>
              <p className="text-content-secondary text-xs font-medium mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Admin portal ──────────────────────────────── */}
      <section className="w-full py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-surface border border-subtle rounded p-8 md:px-10 md:py-9 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded bg-brand-navy flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-content-primary">Admin Portal</h3>
                <p className="text-xs text-content-secondary mt-1 max-w-md leading-relaxed">
                  Platform administrators verify organizations, manage packages, and oversee operations.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/admin-login")}
              className="h-9 px-3.5 bg-brand-navy text-white text-sm font-medium rounded hover:bg-slate-900 transition-colors flex-shrink-0"
            >
              Admin Login
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="w-full py-12 px-6 bg-brand-navy border-t border-white/10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-bold text-white">ProcureNext</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enterprise digital procurement and tender management with cryptographic audit security.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">About & Policies</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><Link href="/about" className="hover:text-white transition">About Platform</Link></li>
              <li><Link href="/policies" className="hover:text-white transition">Procurement Policies</Link></li>
              <li><Link href="/legal" className="hover:text-white transition">Legal Notices & Terms</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Updates & Support</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><Link href="/news" className="hover:text-white transition">News & Announcements</Link></li>
              <li><Link href="/events" className="hover:text-white transition">Events & Webinars</Link></li>
              <li><Link href="/help" className="hover:text-white transition">Help & Support FAQ</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Portals</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><Link href="/login" className="hover:text-white transition">User Login</Link></li>
              <li><Link href="/signup-master" className="hover:text-white transition">Register Organization</Link></li>
              <li><Link href="/admin-login" className="hover:text-white transition">Admin Portal</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ProcureNext Technologies Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/policies" className="hover:text-slate-400">Privacy Policy</Link>
            <Link href="/legal" className="hover:text-slate-400">Terms of Service</Link>
            <Link href="/help" className="hover:text-slate-400">Support</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
