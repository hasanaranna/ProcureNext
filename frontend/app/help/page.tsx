"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FAQS = [
  {
    category: "Registration & Account",
    question: "How do I register my organization as a Buyer or Vendor?",
    answer: "Click 'Get Started' or 'Register Master Account' on the homepage. Upload the 5 mandatory compliance documents (NID Front & Back, Trade License, TIN, and VAT certificates). Once submitted, platform administrators verify your documents and activate your account.",
  },
  {
    category: "Registration & Account",
    question: "Can I add employees or team members to my organization?",
    answer: "Yes. Once your organization is verified, the Master Account owner can generate invitations with role-specific access (e.g. Finance, Approver, Procurement Officer, Viewer).",
  },
  {
    category: "Bidding & Evaluation",
    question: "How does the Bid Submission process work for Vendors?",
    answer: "Navigate to 'Ongoing Tenders', review the required documents and specification guidelines, fill in your financial proposal, upload the mandatory specification files, and click 'Submit Bid'. You will receive a confirmed bid proposal receipt.",
  },
  {
    category: "Bidding & Evaluation",
    question: "Can a vendor update or withdraw a bid after submission?",
    answer: "Vendors can update proposal details or withdraw their bid at any time before the bid is officially accepted or awarded by the buyer organization.",
  },
  {
    category: "Security & Auditing",
    question: "What is WORM compliance and how are my documents protected?",
    answer: "ProcureNext uses Write-Once-Read-Many (WORM) cryptographic hash chaining. Every bid, evaluation, and contract modification is sealed with SHA-256 signatures, making retrospective alterations mathematically impossible.",
  },
  {
    category: "Security & Auditing",
    question: "How do I reach emergency technical support or report an issue?",
    answer: "You can email support@procurenext.com or call our 24/7 hotline at +880 1700-000000. For compliance and fraud alerts, contact compliance@procurenext.com.",
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const filteredFaqs = search.trim() === ""
    ? FAQS
    : FAQS.filter(f => f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase()));

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
            <Link href="/events" className="hover:text-white transition">Events</Link>
            <Link href="/help" className="text-accent-400 font-bold">Help & Support</Link>
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
          <span className="text-accent-400">Help & Support Center</span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-xs font-bold mb-4">
            💡 24/7 Knowledge Base & Support
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            How can we help you?
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-3xl leading-relaxed mb-6">
            Find answers to frequently asked questions about registration, tender creation, bidding, document verification, and platform security.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search help articles, bidding guides, policies..."
              className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-accent-400 focus:ring-1 focus:ring-accent-400 shadow-lg"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center text-lg flex-shrink-0">
              ✉️
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Email Support</h3>
              <p className="text-xs text-slate-400">support@procurenext.com</p>
              <span className="text-[10px] text-emerald-400 font-semibold">Response &lt; 2 hrs</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg flex-shrink-0">
              📞
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Direct Hotline</h3>
              <p className="text-xs text-slate-400">+880 1700-000000</p>
              <span className="text-[10px] text-slate-500">Sun-Thu, 9am - 8pm</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-lg flex-shrink-0">
              🏢
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">HQ Office</h3>
              <p className="text-xs text-slate-400">Gulshan-2, Dhaka 1212</p>
              <span className="text-[10px] text-slate-500">Corporate Procurement Hub</span>
            </div>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          {filteredFaqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-800 bg-slate-800/30 overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-800/60 transition"
              >
                <span className="text-sm sm:text-base font-bold text-white">
                  {faq.question}
                </span>
                <span className="text-slate-400 text-lg font-bold">
                  {openIdx === i ? "−" : "+"}
                </span>
              </button>
              {openIdx === i && (
                <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/50 animate-fade-in">
                  <span className="inline-block px-2 py-0.5 rounded bg-accent-500/10 text-accent-300 text-[10px] font-bold mb-2">
                    {faq.category}
                  </span>
                  <p>{faq.answer}</p>
                </div>
              )}
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
