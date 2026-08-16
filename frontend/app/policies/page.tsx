"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PoliciesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"procurement" | "conduct" | "antibribery" | "privacy">("procurement");

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
            <Link href="/policies" className="text-accent-400 font-bold">Policies</Link>
            <Link href="/legal" className="hover:text-white transition">Legal Notices</Link>
            <Link href="/news" className="hover:text-white transition">News</Link>
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
          <span className="text-accent-400">Platform Policies</span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-xs font-bold mb-4">
            📜 Governance & Fair Competition
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Platform Policies & Guidelines
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            The standard operating procedures, transparency codes, anti-corruption measures, and behavioral standards governing all buyer and vendor operations on ProcureNext.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4 mb-8">
          <button
            onClick={() => setActiveTab("procurement")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
              activeTab === "procurement"
                ? "bg-accent-500 text-white shadow"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            📋 Procurement Guidelines
          </button>
          <button
            onClick={() => setActiveTab("conduct")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
              activeTab === "conduct"
                ? "bg-accent-500 text-white shadow"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            🤝 Vendor Code of Conduct
          </button>
          <button
            onClick={() => setActiveTab("antibribery")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
              activeTab === "antibribery"
                ? "bg-accent-500 text-white shadow"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            ⚖️ Anti-Bribery & Fraud Prevention
          </button>
          <button
            onClick={() => setActiveTab("privacy")}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition ${
              activeTab === "privacy"
                ? "bg-accent-500 text-white shadow"
                : "bg-slate-800/80 text-slate-400 hover:text-white"
            }`}
          >
            🔒 Data Privacy Policy
          </button>
        </div>

        {/* Policy Contents */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-3xl p-8 space-y-6 text-sm text-slate-300 leading-relaxed shadow-xl">
          {activeTab === "procurement" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">1. Fair Bidding and Procurement Guidelines</h2>
              <p>
                All procurement activities conducted through ProcureNext must strictly adhere to principles of non-discrimination, competitive parity, and verifiable requirement specifications.
              </p>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h3 className="font-bold text-white mb-2">Key Tenets:</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-400">
                  <li><strong>Tender Clarification:</strong> Any query or addendum issued by a buyer must be broadcast simultaneously to all participating vendors.</li>
                  <li><strong>Sealed Bid Integrity:</strong> Bid financial figures and sensitive technical documents remain encrypted and confidential until official opening deadlines.</li>
                  <li><strong>Audit Retention:</strong> Tender records, bids, evaluation sheets, and award justifications are permanently captured in WORM-compliant storage.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "conduct" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">2. Vendor Code of Conduct</h2>
              <p>
                Suppliers registered on ProcureNext are expected to maintain the highest standards of professional integrity, labor compliance, and product quality.
              </p>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h3 className="font-bold text-white mb-2">Prohibited Practices:</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-400">
                  <li><strong>Bid Rigging & Collusion:</strong> Any price coordination, market allocation, or artificial bidding between competing vendors results in immediate permanent blacklisting.</li>
                  <li><strong>Misrepresentation:</strong> Submitting falsified regulatory licenses, fabricated trade certificates, or fraudulent financial guarantees.</li>
                  <li><strong>Post-Award Default:</strong> Unjustified refusal to execute contract agreements upon legitimate tender award.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "antibribery" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">3. Zero-Tolerance Anti-Bribery & Fraud Policy</h2>
              <p>
                ProcureNext operates a strict Zero-Tolerance regime against bribery, illicit gratuities, kickbacks, and corruption in public and private commercial transactions.
              </p>
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-200">
                <p className="font-semibold mb-2">🚨 Whistleblower & Fraud Reporting:</p>
                <p className="text-xs text-red-300">
                  Suspected extortion, collusion, or illicit payments can be reported confidentially to <strong className="text-white underline">compliance@procurenext.com</strong>. All reports trigger an immediate automated audit lockdown and external review.
                </p>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">4. Enterprise Data Privacy & Security</h2>
              <p>
                We respect the sensitivity of enterprise trade secrets, pricing formulas, and proprietary document assets.
              </p>
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <h3 className="font-bold text-white mb-2">Protection Standards:</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-400">
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
