"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AboutPage() {
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
            <Link href="/about" className="text-accent-400 font-bold">About</Link>
            <Link href="/policies" className="hover:text-white transition">Policies</Link>
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
          <span className="text-accent-400">About & Background</span>
        </div>

        {/* Hero Banner */}
        <div className="mb-14 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-xs font-bold mb-4">
            🏛️ Institutional Overview & Heritage
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            Platform Background & Mission
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed">
            ProcureNext is an enterprise-grade digital procurement infrastructure engineered to provide absolute transparency, integrity, and efficiency for buyers and vendor organizations.
          </p>
        </div>

        {/* Core Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center text-2xl mb-4">
              🎯
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Our Vision</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              To establish a zero-compromise, immutable ecosystem where public and private procurement processes operate with seamless automation, verified vendor performance, and mathematical trust.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl mb-4">
              🛡️
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Security & Compliance</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Built on WORM-compliant cryptographic hash chaining, strict role-based access control, and automated Change Data Capture (CDC) ensuring every bid and tender lifecycle action is verifiable and tamper-proof.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/80 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl mb-4">
              🤝
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Vendor Empowerment</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Equipping verified sellers with equal discovery opportunities, objective rating metrics, transparent evaluation matrices, and streamlined payment workflows.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-12 text-slate-300">
          <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4">Origins and Evolution</h2>
            <p className="text-sm leading-relaxed mb-4">
              Founded in 2024 by procurement veterans, cybersecurity researchers, and enterprise software architects, ProcureNext was conceived to replace manual, opaque paper-based bidding with an intelligent, auditable platform.
            </p>
            <p className="text-sm leading-relaxed">
              Today, ProcureNext processes thousands of tenders across supply chains, construction, high-tech infrastructure, and service sectors, enabling organizations to eliminate procurement cycle delays by up to 65%.
            </p>
          </section>

          <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4">Core Operating Principles</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold">✓</span>
                <div>
                  <strong className="text-white">Strict Neutrality:</strong> ProcureNext operates solely as a facilitator and platform provider, ensuring unbiased tender publication and transparent evaluation.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold">✓</span>
                <div>
                  <strong className="text-white">Verified Identity:</strong> All master organization accounts and representative employees undergo rigorous regulatory and national identity verification before participating.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 font-bold">✓</span>
                <div>
                  <strong className="text-white">Continuous Innovation:</strong> Integrating machine learning for tender matching, multi-parameter bid matrix comparison, and automated audit health checks.
                </div>
              </li>
            </ul>
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
