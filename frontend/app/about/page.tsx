"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AboutPage() {
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
            <Link href="/about" className="text-brand-blue font-semibold">About</Link>
            <Link href="/policies" className="hover:text-content-primary transition">Policies</Link>
            <Link href="/legal" className="hover:text-content-primary transition">Legal Notices</Link>
            <Link href="/news" className="hover:text-content-primary transition">News</Link>
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
          <span className="text-brand-blue">About & Background</span>
        </div>

        {/* Hero Banner */}
        <div className="mb-14 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-subtle bg-surface text-content-secondary text-xs font-medium mb-4">
            🏛️ Institutional Overview & Heritage
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-content-primary tracking-tight mb-4">
            Platform Background & Mission
          </h1>
          <p className="text-sm sm:text-base text-content-secondary max-w-3xl leading-relaxed">
            ProcureNext is an enterprise-grade digital procurement infrastructure engineered to provide absolute transparency, integrity, and efficiency for buyers and vendor organizations.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded bg-surface border border-subtle">
            <div className="w-10 h-10 rounded bg-app flex items-center justify-center text-xl mb-4">
              🎯
            </div>
            <h3 className="text-base font-bold text-content-primary mb-2">Our Vision</h3>
            <p className="text-sm text-content-secondary leading-relaxed">
              To establish a zero-compromise, immutable ecosystem where public and private procurement processes operate with seamless automation, verified vendor performance, and mathematical trust.
            </p>
          </div>

          <div className="p-6 rounded bg-surface border border-subtle">
            <div className="w-10 h-10 rounded bg-status-approved-bg flex items-center justify-center text-xl mb-4">
              🛡️
            </div>
            <h3 className="text-base font-bold text-content-primary mb-2">Security & Compliance</h3>
            <p className="text-sm text-content-secondary leading-relaxed">
              Built on WORM-compliant cryptographic hash chaining, strict role-based access control, and automated Change Data Capture (CDC) ensuring every bid and tender lifecycle action is verifiable and tamper-proof.
            </p>
          </div>

          <div className="p-6 rounded bg-surface border border-subtle">
            <div className="w-10 h-10 rounded bg-status-pending-bg flex items-center justify-center text-xl mb-4">
              🤝
            </div>
            <h3 className="text-base font-bold text-content-primary mb-2">Vendor Empowerment</h3>
            <p className="text-sm text-content-secondary leading-relaxed">
              Equipping verified sellers with equal discovery opportunities, objective rating metrics, transparent evaluation matrices, and streamlined payment workflows.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-8 text-content-secondary">
          <section className="bg-surface p-8 rounded border border-subtle">
            <h2 className="text-xl font-bold text-content-primary mb-4">Origins and Evolution</h2>
            <p className="text-sm leading-relaxed mb-4">
              Founded in 2024 by procurement veterans, cybersecurity researchers, and enterprise software architects, ProcureNext was conceived to replace manual, opaque paper-based bidding with an intelligent, auditable platform.
            </p>
            <p className="text-sm leading-relaxed">
              Today, ProcureNext processes thousands of tenders across supply chains, construction, high-tech infrastructure, and service sectors, enabling organizations to eliminate procurement cycle delays by up to 65%.
            </p>
          </section>

          <section className="bg-surface p-8 rounded border border-subtle">
            <h2 className="text-xl font-bold text-content-primary mb-4">Core Operating Principles</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-status-approved-text font-bold">✓</span>
                <div>
                  <strong className="text-content-primary">Strict Neutrality:</strong> ProcureNext operates solely as a facilitator and platform provider, ensuring unbiased tender publication and transparent evaluation.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-status-approved-text font-bold">✓</span>
                <div>
                  <strong className="text-content-primary">Verified Identity:</strong> All master organization accounts and representative employees undergo rigorous regulatory and national identity verification before participating.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-status-approved-text font-bold">✓</span>
                <div>
                  <strong className="text-content-primary">Continuous Innovation:</strong> Integrating machine learning for tender matching, multi-parameter bid matrix comparison, and automated audit health checks.
                </div>
              </li>
            </ul>
          </section>
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
