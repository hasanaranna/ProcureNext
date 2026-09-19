"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PoliciesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"procurement" | "conduct" | "antibribery" | "privacy">("procurement");

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
            <Link href="/policies" className="text-brand-blue font-semibold">Policies</Link>
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
          <span className="text-brand-blue">Platform Policies</span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-subtle bg-surface text-content-secondary text-xs font-medium mb-4">
            📜 Governance & Fair Competition
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-content-primary tracking-tight mb-4">
            Platform Policies & Guidelines
          </h1>
          <p className="text-sm sm:text-base text-content-secondary max-w-3xl leading-relaxed">
            The standard operating procedures, transparency codes, anti-corruption measures, and behavioral standards governing all buyer and vendor operations on ProcureNext.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-subtle pb-4 mb-8">
          <button
            onClick={() => setActiveTab("procurement")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition ${
              activeTab === "procurement"
                ? "bg-brand-navy text-white"
                : "bg-app text-content-secondary border border-subtle hover:text-content-primary"
            }`}
          >
            📋 Procurement Guidelines
          </button>
          <button
            onClick={() => setActiveTab("conduct")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition ${
              activeTab === "conduct"
                ? "bg-brand-navy text-white"
                : "bg-app text-content-secondary border border-subtle hover:text-content-primary"
            }`}
          >
            🤝 Vendor Code of Conduct
          </button>
          <button
            onClick={() => setActiveTab("antibribery")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition ${
              activeTab === "antibribery"
                ? "bg-brand-navy text-white"
                : "bg-app text-content-secondary border border-subtle hover:text-content-primary"
            }`}
          >
            ⚖️ Anti-Bribery & Fraud Prevention
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded transition ${
              activeTab === "privacy"
                ? "bg-brand-navy text-white"
                : "bg-app text-content-secondary border border-subtle hover:text-content-primary"
            }`}
          >
            🔒 Data Privacy Policy
          </button>
        </div>

        {/* Policy Contents */}
        <div className="bg-surface border border-subtle rounded p-8 space-y-6 text-sm text-content-secondary leading-relaxed">
          {activeTab === "procurement" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-content-primary">1. Fair Bidding and Procurement Guidelines</h2>
              <p>
                All procurement activities conducted through ProcureNext must strictly adhere to principles of non-discrimination, competitive parity, and verifiable requirement specifications.
              </p>
              <div className="p-4 rounded bg-app border border-subtle">
                <h3 className="font-bold text-content-primary mb-2">Key Tenets:</h3>
                <ul className="list-disc pl-5 space-y-2 text-content-secondary">
                  <li><strong>Tender Clarification:</strong> Any query or addendum issued by a buyer must be broadcast simultaneously to all participating vendors.</li>
                  <li><strong>Sealed Bid Integrity:</strong> Bid financial figures and sensitive technical documents remain encrypted and confidential until official opening deadlines.</li>
                  <li><strong>Audit Retention:</strong> Tender records, bids, evaluation sheets, and award justifications are permanently captured in WORM-compliant storage.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "conduct" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-content-primary">2. Vendor Code of Conduct</h2>
              <p>
                Suppliers registered on ProcureNext are expected to maintain the highest standards of professional integrity, labor compliance, and product quality.
              </p>
              <div className="p-4 rounded bg-app border border-subtle">
                <h3 className="font-bold text-content-primary mb-2">Prohibited Practices:</h3>
                <ul className="list-disc pl-5 space-y-2 text-content-secondary">
                  <li><strong>Bid Rigging & Collusion:</strong> Any price coordination, market allocation, or artificial bidding between competing vendors results in immediate permanent blacklisting.</li>
                  <li><strong>Misrepresentation:</strong> Submitting falsified regulatory licenses, fabricated trade certificates, or fraudulent financial guarantees.</li>
                  <li><strong>Post-Award Default:</strong> Unjustified refusal to execute contract agreements upon legitimate tender award.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "antibribery" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-content-primary">3. Zero-Tolerance Anti-Bribery & Fraud Policy</h2>
              <p>
                ProcureNext operates a strict Zero-Tolerance regime against bribery, illicit gratuities, kickbacks, and corruption in public and private commercial transactions.
              </p>
              <div className="p-4 rounded bg-status-rejected-bg border border-red-200 text-status-rejected-text">
                <p className="font-medium mb-2">🚨 Whistleblower & Fraud Reporting:</p>
                <p className="text-xs">
                  Suspected extortion, collusion, or illicit payments can be reported confidentially to <strong className="text-content-primary underline">compliance@procurenext.com</strong>. All reports trigger an immediate automated audit lockdown and external review.
                </p>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-content-primary">4. Enterprise Data Privacy & Security</h2>
              <p>
                We respect the sensitivity of enterprise trade secrets, pricing formulas, and proprietary document assets.
              </p>
              <div className="p-4 rounded bg-app border border-subtle">
                <h3 className="font-bold text-content-primary mb-2">Protection Standards:</h3>
                <ul className="list-disc pl-5 space-y-2 text-content-secondary">
                  <li>All uploaded documents are stored in encrypted object storage with signed, time-limited download URLs.</li>
                  <li>Organization employee identity data (NID, credentials) are restricted to authorized compliance reviewers.</li>
                  <li>We never sell or monetize vendor bidding histories or buyer pricing analytics to third parties.</li>
                </ul>
              </div>
            </div>
          )}
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
