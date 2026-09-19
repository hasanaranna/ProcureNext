"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface BidItem {
  bid_id: number;
  tender_id: number;
  tender_title: string | null;
  financial_amount: number | null;
  status: string;
  submitted_at: string | null;
}

export default function ViewMyBidsPage() {
  const router = useRouter();
  const [bids, setBids] = useState<BidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  const fetchBids = async () => {
    try {
      const res = await fetch("/api/bids/vendor/my-bids");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load your bids");
      }
      const data = await res.json();
      setBids(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBids();
  }, [router]);

  const canWithdraw = (status: string) =>
    ["Submitted", "Draft", "UnderEvaluation"].includes(status);

  const handleWithdraw = async (bidId: number) => {
    if (
      !window.confirm(
        "Withdraw this bid? You can submit a new proposal later if the tender is still open.",
      )
    ) {
      return;
    }
    setWithdrawingId(bidId);
    try {
      const res = await fetch(`/api/bids/${bidId}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        alert(errData?.detail || "Failed to withdraw bid.");
        return;
      }
      setBids((prev) => prev.filter((b) => b.bid_id !== bidId));
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setWithdrawingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-app">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-content-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-content-muted text-lg font-medium">Loading your bids...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-app">
      <div className="max-w-5xl mx-auto animate-fade-in">
        
        {/* Header & Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => router.push("/home")}
              className="mb-4 flex items-center gap-2 text-content-muted hover:text-content-primary transition-colors duration-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium text-sm">Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-semibold text-content-primary tracking-tight">My Submitted Bids</h1>
            <p className="text-content-secondary mt-2 text-sm md:text-base">
              Track the status of your proposals and view tender details.
            </p>
          </div>
        </div>

        {/* Error Handling */}
        {error && (
          <div className="bg-status-rejected-bg border border-subtle rounded p-4 mb-8 flex items-start gap-3">
            <svg className="w-6 h-6 text-status-rejected-text flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-status-rejected-text font-medium">{error}</p>
          </div>
        )}

        {/* Bids List */}
        {!error && bids.length === 0 ? (
          <div className="bg-surface rounded border border-subtle p-12 text-center">
            <div className="w-20 h-20 mx-auto bg-app rounded-full flex items-center justify-center mb-6 border border-subtle">
              <svg className="w-10 h-10 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-content-primary mb-2">No Bids Found</h2>
            <p className="text-content-secondary mb-8 max-w-md mx-auto">
              You haven't submitted any bids yet. Explore available tenders to place your first bid.
            </p>
            <button onClick={() => router.push("/home")}
              className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded">
              Browse Tenders
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {bids.map((bid) => (
              <div key={bid.bid_id} className="bg-surface rounded border border-subtle p-6 hover:border-brand-blue transition-all duration-300 group flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Left side: Tender Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-content-secondary text-xs font-medium tabular-nums">Tender ID: #{bid.tender_id}</span>
                    <span className={`badge-status ${bid.status === 'Accepted' ? 'badge-approved' : bid.status === 'Rejected' ? 'badge-rejected' : bid.status === 'UnderEvaluation' || bid.status === 'Submitted' ? 'badge-pending' : 'badge-draft'}`}><span className="badge-dot" />{bid.status}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-content-primary mb-3 group-hover:text-brand-blue transition-colors">
                    {bid.tender_title || "Untitled Tender"}
                  </h3>
                  <div className="flex items-center gap-6 text-content-secondary text-xs font-medium">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-content-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Submitted: <span className="font-semibold text-content-primary">{formatDate(bid.submitted_at)}</span></span>
                    </div>
                  </div>
                </div>

                {/* Right side: Financial Amount & Action */}
                <div className="flex flex-col md:items-end gap-4 border-t md:border-t-0 md:border-l border-subtle pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                  <div>
                    <p className="text-content-secondary text-xs font-medium md:text-right mb-1">Financial Proposal</p>
                    <p className="text-2xl font-semibold text-content-primary tabular-nums">
                      <span className="text-content-muted text-lg font-medium mr-1">Tk</span>
                      {bid.financial_amount?.toLocaleString() || "0"}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    {bid.status === 'Accepted' && (
                      <button 
                        onClick={() => router.push(`/ongoing-tenders/${bid.tender_id}`)}
                        className="w-full md:w-auto px-4 py-2.5 bg-status-approved-text text-white rounded transition-all flex items-center justify-center gap-1.5 text-sm font-medium">
                        View Ongoing Tender
                      </button>
                    )}
                    {canWithdraw(bid.status) && (
                      <button
                        onClick={() => handleWithdraw(bid.bid_id)}
                        disabled={withdrawingId === bid.bid_id}
                        className="w-full md:w-auto px-4 py-2.5 bg-status-rejected-bg text-status-rejected-text border border-subtle rounded text-sm font-medium disabled:opacity-50"
                      >
                        {withdrawingId === bid.bid_id ? "Withdrawing..." : "Withdraw"}
                      </button>
                    )}
                    <button 
                      onClick={() => router.push(`/bid-for-tender?id=${bid.tender_id}`)}
                      className="w-full md:w-auto px-5 py-2.5 bg-app text-content-primary border border-subtle rounded transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                      View Proposal
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
