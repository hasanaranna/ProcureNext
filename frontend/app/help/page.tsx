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
            <Link href="/events" className="hover:text-content-primary transition">Events</Link>
            <Link href="/help" className="text-brand-blue font-semibold">Help & Support</Link>
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
          <span className="text-brand-blue">Help & Support Center</span>
        </div>

        {/* Hero */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-subtle bg-surface text-content-secondary text-xs font-medium mb-4">
            💡 24/7 Knowledge Base & Support
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-content-primary tracking-tight mb-4">
            How can we help you?
          </h1>
          <p className="text-sm sm:text-base text-content-secondary max-w-3xl leading-relaxed mb-6">
            Find answers to frequently asked questions about registration, tender creation, bidding, document verification, and platform security.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search help articles, bidding guides, policies..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-subtle rounded text-sm text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
            <svg className="w-4 h-4 text-content-muted absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="p-5 rounded bg-surface border border-subtle flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-app flex items-center justify-center text-lg flex-shrink-0">
              ✉️
            </div>
            <div>
              <h3 className="font-bold text-content-primary text-sm">Email Support</h3>
              <p className="text-xs text-content-secondary">support@procurenext.com</p>
              <span className="text-[10px] text-status-approved-text font-medium">Response &lt; 2 hrs</span>
            </div>
          </div>

          <div className="p-5 rounded bg-surface border border-subtle flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-status-approved-bg flex items-center justify-center text-lg flex-shrink-0">
              📞
            </div>
            <div>
              <h3 className="font-bold text-content-primary text-sm">Direct Hotline</h3>
              <p className="text-xs text-content-secondary">+880 1700-000000</p>
              <span className="text-[10px] text-content-muted">Sun-Thu, 9am - 8pm</span>
            </div>
          </div>

          <div className="p-5 rounded bg-surface border border-subtle flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-status-pending-bg flex items-center justify-center text-lg flex-shrink-0">
              🏢
            </div>
            <div>
              <h3 className="font-bold text-content-primary text-sm">HQ Office</h3>
              <p className="text-xs text-content-secondary">Gulshan-2, Dhaka 1212</p>
              <span className="text-[10px] text-content-muted">Corporate Procurement Hub</span>
            </div>
          </div>
        </div>

        {/* FAQs Accordion */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-content-primary mb-6">Frequently Asked Questions</h2>
          {filteredFaqs.map((faq, i) => (
            <div
              key={i}
              className="rounded border border-subtle bg-surface overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-app transition"
              >
                <span className="text-sm font-medium text-content-primary">
                  {faq.question}
                </span>
                <span className="text-content-muted text-lg font-bold flex-shrink-0">
                  {openIdx === i ? "−" : "+"}
                </span>
              </button>
              {openIdx === i && (
                <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-content-secondary leading-relaxed border-t border-subtle">
                  <span className="badge-status badge-draft text-[10px] mb-2">
                    <span className="badge-dot"></span>
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
