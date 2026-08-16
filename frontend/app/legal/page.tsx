"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LegalPage() {
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
            <Link href="/legal" className="text-accent-400 font-bold">Legal Notices</Link>
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
          <span className="text-accent-400">Legal Notices & Terms</span>
        </div>

        {/* Hero */}
        <div className="mb-12 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-xs font-bold mb-4">
            ⚖️ Statutory Disclosures & Compliance
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Legal Notices & Terms of Use
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            Statutory disclosures, terms of service, electronic contract enforceability, intellectual property, and cryptographic audit disclaimers for ProcureNext.
          </p>
        </div>

        {/* Legal Sections */}
        <div className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-white">1. Platform Service Agreement</h2>
            <p>
              By accessing, browsing, or creating an organization account on ProcureNext, you agree to be legally bound by these Terms of Service, applicable public procurement regulations, and relevant electronic commerce laws.
            </p>
            <p>
              ProcureNext provides software-as-a-service (SaaS) procurement facilitation infrastructure. All procurement awards, contract terms, and financial transactions negotiated between buyers and vendors constitute bilateral contracts strictly between the respective participating organizations.
            </p>
          </section>

          <section className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-white">2. Cryptographic Audit Trail (WORM Compliance) Notice</h2>
            <p>
              In accordance with financial compliance and public sector procurement governance standards:
            </p>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/60 font-mono text-xs text-slate-300">
              [WORM DISCLOSURE] All tender publications, bid submissions, modifications, evaluations, awards, and payments are permanently recorded into an append-only SHA-256 cryptographic hash chain. Entries cannot be altered, deleted, or backdated by any platform participant, organization administrator, or system operator.
            </div>
            <p>
              Audit records are admissible as evidence in dispute arbitrations and regulatory compliance inquiries.
            </p>
          </section>

          <section className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-white">3. Intellectual Property Rights</h2>
            <p>
              The ProcureNext name, logo, proprietary bid matrix evaluation algorithms, software source code, user interface designs, and documentation are the exclusive intellectual property of ProcureNext Technologies Ltd.
            </p>
            <p>
              All technical proposals, trade drawings, and documentation uploaded by participating vendors remain the proprietary intellectual property of the submitting vendor, licensed to the purchasing buyer solely for tender evaluation purposes.
            </p>
          </section>

          <section className="p-8 rounded-3xl bg-slate-800/40 border border-slate-800 space-y-4">
            <h2 className="text-xl font-bold text-white">4. Limitation of Liability</h2>
            <p>
              ProcureNext does not guarantee the financial solvency, technical competence, or physical delivery capabilities of registered buyers or vendors. Organizations are advised to conduct standard due diligence and verify regulatory filings prior to contract execution.
            </p>
          </section>
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
