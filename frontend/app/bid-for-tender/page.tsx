"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ManageTokensModal from "@/components/ManageTokensModal";
import ModalShell from "@/components/ModalShell";

interface TenderDocument {
  tender_doc_id: number;
  file_name: string | null;
  file_path: string | null;
  uploaded_at: string | null;
}

interface RequiredDocument {
  req_doc_id: number;
  custom_doc_name: string | null;
  is_mandatory: boolean;
}

interface TenderDetail {
  tender_id: number;
  title: string;
  description: string;
  status: string;
  buyer_org_name: string;
  submission_deadline: string | null;
  tender_public_date: string | null;
  pre_bid_meeting: string | null;
  tender_opening_date: string | null;
  budget_min: number | null;
  budget_max: number | null;
  security_required: boolean;
  created_at: string;
  documents: TenderDocument[];
  required_documents: RequiredDocument[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface BidDocument {
  bid_doc_id: number;
  file_path: string | null;
  document_type: string;
  has_access?: boolean;
}

interface ExistingBid {
  bid_id: number;
  tender_id: number;
  financial_amount: number | null;
  description: string | null;
  status: string;
  submitted_at: string | null;
  documents: BidDocument[];
}

export default function BidForTenderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-app">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-navy"></div>
        </div>
      }
    >
      <BidForTenderContent />
    </Suspense>
  );
}

function BidForTenderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenderId = searchParams.get("id");

  const [tender, setTender] = useState<TenderDetail | null>(null);
  const [existingBid, setExistingBid] = useState<ExistingBid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Token monetization state
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [bidCost, setBidCost] = useState<number>(20);
  const [showManageTokens, setShowManageTokens] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: "",
    bidAmount: "",
  });

  // Dynamic doc file state: keyed by req_doc_id
  const [docFiles, setDocFiles] = useState<Record<number, File | null>>({});
  const [docErrors, setDocErrors] = useState<Record<number, string>>({});
  const [formValidationError, setFormValidationError] = useState<string | null>(null);
  const [missingMandatoryIds, setMissingMandatoryIds] = useState<number[]>([]);

  // Success Modal State
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [submittedBidResult, setSubmittedBidResult] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const [restrictedDocAlert, setRestrictedDocAlert] = useState<{ isOpen: boolean; docName: string }>({ isOpen: false, docName: '' });

  useEffect(() => {
    try {
      const cached = localStorage.getItem('org_token_balance');
      if (cached !== null && !isNaN(Number(cached))) {
        setTokenBalance(Number(cached));
      }
    } catch { }

    if (!tenderId) {
      setError("No tender ID provided");
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const [tenderRes, bidRes, balRes, priceRes] = await Promise.all([
          fetch(`/api/tenders/${tenderId}/detail`),
          fetch(`/api/bids/vendor/tender/${tenderId}`),
          fetch('/api/payments/balance'),
          fetch('/api/payments/pricing'),
        ]);

        if (!tenderRes.ok) {
          throw new Error(tenderRes.status === 404 ? "Tender not found" : "Failed to load tender");
        }
        const tenderData = await tenderRes.json();
        setTender(tenderData);

        if (bidRes.ok) {
          const bidData = await bidRes.json();
          setExistingBid(bidData);
          setFormData({
            description: bidData.description || "",
            bidAmount: bidData.financial_amount != null ? String(bidData.financial_amount) : "",
          });
        }

        if (balRes.ok) {
          const balData = await balRes.json();
          setTokenBalance(balData.credit_balance);
          try {
            localStorage.setItem('org_token_balance', balData.credit_balance.toString());
          } catch { }
        }

        if (priceRes.ok) {
          const priceData = await priceRes.json();
          setBidCost(priceData.bid_cost);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tenderId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormValidationError(null);
  };

  const handleSingleFile = (
    reqDocId: number,
    inputId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (file.type !== "application/pdf") {
        setDocErrors(prev => ({ ...prev, [reqDocId]: "Only PDF files are allowed (.pdf)." }));
        e.target.value = "";
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setDocErrors(prev => ({ ...prev, [reqDocId]: "File size must not exceed 20MB." }));
        e.target.value = "";
        return;
      }
    }
    setDocErrors(prev => {
      const copy = { ...prev };
      delete copy[reqDocId];
      return copy;
    });
    setMissingMandatoryIds(prev => prev.filter(id => id !== reqDocId));
    setDocFiles(prev => ({ ...prev, [reqDocId]: file }));
  };

  const clearFile = (reqDocId: number, inputId: string) => {
    setDocFiles(prev => ({ ...prev, [reqDocId]: null }));
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tenderId || submitting) return;

    if (tokenBalance < bidCost) {
      setTokenError(`Insufficient tokens. Submitting this bid requires ${bidCost} tokens, but your organization only has ${tokenBalance} tokens.`);
      setShowManageTokens(true);
      return;
    }

    setFormValidationError(null);

    // Validate financial amount
    const amountVal = parseFloat(formData.bidAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setFormValidationError("Please provide a valid financial bid amount greater than 0.");
      return;
    }

    // Validate description
    if (!formData.description.trim()) {
      setFormValidationError("Please provide a proposal description.");
      return;
    }

    // Validate mandatory documents
    const missing: number[] = [];
    const collectedDocs: { file: File; typeName: string }[] = [];

    if (tender?.required_documents) {
      for (const rd of tender.required_documents) {
        const file = docFiles[rd.req_doc_id];
        if (file) {
          collectedDocs.push({ file, typeName: rd.custom_doc_name || `Document_${rd.req_doc_id}` });
        } else if (rd.is_mandatory) {
          missing.push(rd.req_doc_id);
        }
      }
    }

    if (missing.length > 0) {
      setMissingMandatoryIds(missing);
      setFormValidationError("Please upload all mandatory documents highlighted below.");
      return;
    }

    setSubmitting(true);
    setTokenError(null);
    try {
      const body = new FormData();

      body.append(
        "bid_data",
        JSON.stringify({
          tender_id: parseInt(tenderId),
          financial_amount: amountVal,
          description: formData.description,
        })
      );

      // Collect files and their document type names from dynamic required docs
      const collectedDocs: { file: File; reqDocId: number; typeName: string }[] = [];
      if (tender?.required_documents) {
        for (const rd of tender.required_documents) {
          const file = docFiles[rd.req_doc_id];
          if (file) {
            collectedDocs.push({
              file,
              reqDocId: rd.req_doc_id,
              typeName: rd.custom_doc_name || `Document_${rd.req_doc_id}`
            });
          } else if (rd.is_mandatory) {
            alert(`Please upload the required document: ${rd.custom_doc_name || "Unnamed document"}`);
            setSubmitting(false);
            return;
          }
        }
      }
      body.append(
        "req_doc_ids",
        JSON.stringify(collectedDocs.map((d) => d.reqDocId))
      );
      body.append(
        "doc_type_names",
        JSON.stringify(collectedDocs.map((d) => d.typeName))
      );

      for (const { file } of collectedDocs) {
        body.append("files", file);
      }

      const res = await fetch("/api/bids/vendor/submit-with-documents", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errorMsg = errData?.detail || "Failed to submit bid";
        setTokenError(errorMsg);
        if (res.status === 400 && typeof errorMsg === 'string' && errorMsg.toLowerCase().includes('token')) {
          setShowManageTokens(true);
        } else {
          alert(errorMsg);
        }
        return;
      }

      const newBid = await res.json();
      setSubmittedBidResult(newBid);
      setIsSuccessModalOpen(true);
    } catch (err) {
      setFormValidationError(err instanceof Error ? err.message : "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewSubmission = () => {
    if (submittedBidResult) {
      setExistingBid({
        bid_id: submittedBidResult.bid_id,
        tender_id: submittedBidResult.tender_id,
        financial_amount: submittedBidResult.financial_amount,
        description: submittedBidResult.description,
        status: submittedBidResult.status,
        submitted_at: submittedBidResult.submitted_at || new Date().toISOString(),
        documents: submittedBidResult.documents || [],
      });
      setFormData({
        description: submittedBidResult.description || "",
        bidAmount:
          submittedBidResult.financial_amount != null
            ? String(submittedBidResult.financial_amount)
            : "",
      });
    }
    setIsSuccessModalOpen(false);
    setIsEditing(false);
  };

  const canModifyBid =
    existingBid &&
    !["Accepted", "Rejected", "Withdrawn"].includes(existingBid.status) &&
    tender &&
    !["Closed", "Awarded", "Cancelled"].includes(tender.status);

  const handleUpdateBid = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!existingBid || submitting) return;

    const amountVal = parseFloat(formData.bidAmount);
    if (isNaN(amountVal) || amountVal <= 0) {
      setFormValidationError("Please provide a valid financial bid amount greater than 0.");
      return;
    }
    if (!formData.description.trim()) {
      setFormValidationError("Please provide a proposal description.");
      return;
    }

    setSubmitting(true);
    setFormValidationError(null);
    try {
      const res = await fetch(`/api/bids/${existingBid.bid_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financial_amount: amountVal,
          description: formData.description.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setFormValidationError(errData?.detail || "Failed to update bid.");
        return;
      }

      const updated = await res.json();
      setExistingBid({
        ...existingBid,
        financial_amount: updated.financial_amount,
        description: updated.description,
        status: updated.status,
        documents: updated.documents || existingBid.documents,
      });
      setIsEditing(false);
    } catch (err) {
      setFormValidationError(err instanceof Error ? err.message : "Failed to update bid.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawBid = async () => {
    if (!existingBid || withdrawing) return;
    if (
      !window.confirm(
        "Withdraw this bid? This removes your proposal and cannot be undone without submitting again.",
      )
    ) {
      return;
    }

    setWithdrawing(true);
    try {
      const res = await fetch(`/api/bids/${existingBid.bid_id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        alert(errData?.detail || "Failed to withdraw bid.");
        return;
      }
      setExistingBid(null);
      setIsEditing(false);
      setFormData({ description: "", bidAmount: "" });
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-app">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-content-muted mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-content-muted text-lg font-medium">Loading tender details...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !tender) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-app">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-status-rejected-bg flex items-center justify-center">
            <svg className="w-8 h-8 text-status-rejected-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-status-rejected-text text-lg mb-4 font-medium">{error || "Tender not found"}</p>
          <button onClick={() => router.push("/home")}
            className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition">
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // Build dates array for rendering
  const dates = [
    { label: "Deadline", value: formatDate(tender.submission_deadline), urgent: true },
    { label: "Tender Public Date", value: formatDate(tender.tender_public_date), urgent: false },
    { label: "Pre-Bid Meeting", value: formatDate(tender.pre_bid_meeting), urgent: false },
    { label: "Tender Opening Date", value: formatDate(tender.tender_opening_date), urgent: false },
  ];

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-app">
      {/* Compact sticky top bar */}
      <header className="h-[52px] flex-shrink-0 bg-surface border-b border-subtle flex items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/home")}
            className="flex items-center gap-1.5 text-content-muted hover:text-content-primary transition-colors cursor-pointer flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium text-xs hidden sm:inline">Back</span>
          </button>
          <div className="h-5 w-px bg-subtle flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-content-primary truncate">
              {existingBid && !isEditing ? "Your Bid" : isEditing ? "Edit Bid" : "Bid for Tender"}
            </h1>
            <p className="text-[11px] text-content-secondary truncate hidden sm:block">
              {tender.buyer_org_name} · {tender.title}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowManageTokens(true)}
          className={`h-9 px-3 rounded text-xs font-semibold flex items-center gap-2 transition cursor-pointer flex-shrink-0 border ${
            tokenBalance < bidCost
              ? "bg-status-rejected-bg border-red-200 text-status-rejected-text hover:opacity-90"
              : "bg-brand-navy border-brand-navy text-white hover:bg-slate-900"
          }`}
          title="Manage Organization Tokens"
        >
          <svg className={`w-3.5 h-3.5 ${tokenBalance < bidCost ? "text-status-rejected-text" : "text-amber-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="tabular-nums">{tokenBalance.toLocaleString()}</span>
          <span className={`hidden sm:inline ${tokenBalance < bidCost ? "opacity-80" : "text-slate-300"}`}>
            · Fee {bidCost}
          </span>
        </button>
      </header>

      {(formValidationError || tokenError) && !(existingBid && !isEditing) && (
        <div className="flex-shrink-0 border-b border-subtle bg-surface px-4 md:px-6 lg:px-8 py-2 space-y-1.5">
          {formValidationError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded flex items-start gap-2 animate-fade-in text-red-800 text-xs">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="font-semibold">Validation Error:</strong> {formValidationError}
              </div>
            </div>
          )}
          {tokenError && (
            <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded flex items-center justify-between gap-2 text-rose-700 text-xs font-semibold">
              <span className="min-w-0">{tokenError}</span>
              <button
                type="button"
                onClick={() => setShowManageTokens(true)}
                className="underline font-bold text-rose-900 hover:text-rose-950 flex-shrink-0 cursor-pointer"
              >
                Buy Tokens Now
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto xl:overflow-hidden px-4 md:px-6 lg:px-8 py-3">
        <div className="h-full min-h-0 overflow-visible xl:overflow-hidden grid grid-cols-1 xl:grid-cols-12 gap-3 xl:gap-0 border border-subtle rounded bg-surface">
          {/* LEFT: Tender details */}
          <div className="xl:col-span-5 xl:overflow-y-auto xl:border-r border-subtle">
            <div className="p-4 space-y-4">
              <div className="rounded border border-subtle overflow-hidden">
                <div className="bg-brand-navy px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] font-bold rounded">{tender.buyer_org_name}</span>
                  </div>
                  <h2 className="text-sm font-semibold text-white leading-snug">{tender.title}</h2>
                </div>
                <div className="p-3 space-y-3">
                  <p className="text-content-secondary text-xs leading-relaxed">{tender.description}</p>

                  <div className="grid grid-cols-2 gap-2">
                    {dates.map((date) => (
                      <div key={date.label}
                        className={`flex items-start gap-2 rounded px-2.5 py-2 border ${
                          date.urgent ? "bg-status-rejected-bg border-red-200" : "bg-app border-subtle"
                        }`}>
                        <div className={`mt-0.5 flex-shrink-0 rounded p-1 ${date.urgent ? "bg-red-100" : "bg-slate-200"}`}>
                          <svg className={`w-3.5 h-3.5 ${date.urgent ? "text-red-500" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-medium mb-0.5 ${date.urgent ? "text-red-400" : "text-content-muted"}`}>{date.label}</p>
                          <p className={`text-xs font-bold tabular-nums ${date.urgent ? "text-red-600" : "text-content-primary"}`}>{date.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-content-primary mb-2">Attached Files</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tender.documents.length === 0 ? (
                        <p className="text-xs text-content-muted">No documents attached</p>
                      ) : (
                        tender.documents.map((doc) => (
                          <div key={doc.tender_doc_id} className="rounded px-2.5 py-1.5 flex items-center gap-2 border border-subtle bg-app">
                            <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                              <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="1" />
                              <text x="7" y="19" fontSize="7" fill="white" fontWeight="bold">PDF</text>
                            </svg>
                            <span className="text-xs font-medium text-content-primary truncate max-w-[140px]">{doc.file_name || "Document"}</span>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                try {
                                  const res = await fetch(`/api/tenders/documents/${doc.tender_doc_id}/view`);
                                  if (res.ok) { const data = await res.json(); window.open(data.url, '_blank'); }
                                } catch (err) { console.error('Failed to open document:', err); }
                              }}
                              className="text-brand-blue hover:text-brand-blue/80 text-xs font-semibold transition cursor-pointer">
                              View
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Bid form / existing bid / edit */}
          <div className="xl:col-span-7 xl:overflow-y-auto flex flex-col min-h-0">
            {existingBid && !isEditing ? (
              <div className="p-4 space-y-4 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-content-primary">Your Submitted Bid</h2>
                  <span className={`badge-status ${
                    existingBid.status === 'Accepted' ? 'badge-approved' :
                    existingBid.status === 'Rejected' || existingBid.status === 'Withdrawn' ? 'badge-rejected' :
                    existingBid.status === 'Draft' ? 'badge-draft' :
                    'badge-pending'
                  }`}>
                    <span className="badge-dot" />
                    {existingBid.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-content-secondary text-[10px] font-medium uppercase tracking-wider mb-1.5">Financial Proposal</h3>
                  <div className="bg-app p-3 rounded border border-subtle">
                    <span className="text-xl font-semibold text-content-primary tabular-nums">৳ {existingBid.financial_amount?.toLocaleString() || "0"}</span>
                  </div>
                </div>

                {existingBid.description && (
                  <div>
                    <h3 className="text-content-secondary text-[10px] font-medium uppercase tracking-wider mb-1.5">Proposal Description</h3>
                    <p className="text-content-secondary bg-app p-3 rounded border border-subtle whitespace-pre-wrap leading-relaxed text-xs">
                      {existingBid.description}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-content-secondary text-[10px] font-medium uppercase tracking-wider mb-1.5">Submitted On</h3>
                  <p className="text-content-primary text-sm font-semibold">{formatDate(existingBid.submitted_at)}</p>
                </div>

                <div>
                  <h3 className="text-content-secondary text-[10px] font-medium uppercase tracking-wider mb-2">Submitted Documents</h3>
                  <div className="space-y-2">
                    {existingBid.documents?.map((doc, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-2.5 rounded border ${doc.has_access !== false ? 'bg-app border-subtle' : 'bg-slate-100 border-slate-300 opacity-80'}`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          {doc.has_access !== false ? (
                            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                              <path d="M14 2v6h6" />
                            </svg>
                          ) : (
                            <span className="text-slate-500 text-sm flex-shrink-0">🔒</span>
                          )}
                          <span className={`text-xs font-semibold truncate ${doc.has_access !== false ? 'text-content-primary' : 'text-slate-500 italic'}`}>
                            {doc.document_type} {doc.has_access === false && '(Restricted)'}
                          </span>
                        </div>
                        {doc.has_access !== false ? (
                          <button type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
                                const res = await fetch(`/api/bids/documents/${doc.bid_doc_id}/view`);
                                if (res.ok) { const data = await res.json(); window.open(data.url, '_blank'); }
                              } catch (err) { console.error('Failed to open document:', err); }
                            }}
                            className="text-brand-blue hover:text-brand-blue/80 text-xs font-semibold transition px-2 py-1 cursor-pointer">
                            View
                          </button>
                        ) : (
                          <button type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setRestrictedDocAlert({ isOpen: true, docName: doc.document_type });
                            }}
                            className="text-slate-400 hover:text-slate-500 text-xs font-semibold transition px-2 py-1 cursor-pointer">
                            View
                          </button>
                        )}
                      </div>
                    ))}
                    {!existingBid.documents?.length && (
                      <p className="text-xs text-content-muted">No documents submitted.</p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-subtle flex flex-wrap gap-2">
                  {canModifyBid && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="h-9 px-4 bg-brand-navy text-white hover:bg-slate-900 text-xs font-medium rounded transition cursor-pointer"
                      >
                        Edit Proposal
                      </button>
                      <button
                        type="button"
                        onClick={handleWithdrawBid}
                        disabled={withdrawing}
                        className="h-9 px-4 bg-red-50 text-red-700 font-semibold rounded hover:bg-red-100 transition border border-red-200 text-xs disabled:opacity-50 cursor-pointer"
                      >
                        {withdrawing ? "Withdrawing..." : "Withdraw Bid"}
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => router.push("/view-my-bids")}
                    className="h-9 px-4 bg-brand-navy text-white hover:bg-slate-900 text-xs font-medium rounded transition cursor-pointer">
                    View All My Bids
                  </button>
                  <button type="button" onClick={() => router.push("/home")}
                    className="h-9 px-4 bg-app text-content-primary font-semibold rounded border border-subtle hover:bg-slate-200 transition text-xs cursor-pointer">
                    Dashboard
                  </button>
                </div>
              </div>
            ) : existingBid && isEditing ? (
              <form onSubmit={handleUpdateBid} className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <h2 className="text-sm font-semibold text-content-primary">Edit Your Proposal</h2>
                    <p className="text-[11px] text-content-secondary mt-0.5">
                      Update your financial amount and description. Document changes are not supported here.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-content-primary mb-1">Financial bid amount</label>
                    <input
                      name="bidAmount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={formData.bidAmount}
                      onChange={handleChange}
                      required
                      className="w-full h-9 px-3 border border-subtle rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-content-primary mb-1">Proposal description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={6}
                      required
                      className="w-full px-3 py-2 border border-subtle rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 border-t border-subtle bg-surface px-4 py-2.5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormValidationError(null);
                      if (existingBid) {
                        setFormData({
                          description: existingBid.description || "",
                          bidAmount:
                            existingBid.financial_amount != null
                              ? String(existingBid.financial_amount)
                              : "",
                        });
                      }
                    }}
                    className="h-9 px-4 bg-app text-content-primary font-semibold rounded border border-subtle text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-9 px-4 bg-brand-navy text-white hover:bg-slate-900 font-medium rounded text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-semibold text-content-primary">Place Your Bid</h2>
                      <p className="text-[11px] text-content-secondary mt-0.5">Proposal details and required documents</p>
                    </div>
                    <span className="badge-status badge-draft"><span className="badge-dot" />Drafting</span>
                  </div>

                  <div>
                    <label htmlFor="bidAmount" className="block text-xs font-medium text-content-primary mb-1">
                      Financial Amount (BDT) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm font-semibold">৳</span>
                      <input type="number" id="bidAmount" name="bidAmount" value={formData.bidAmount} onChange={handleChange}
                        required min="0" step="0.01" placeholder="e.g. 25000.00"
                        className="w-full h-9 pl-8 pr-3 border border-subtle rounded bg-white text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition text-sm tabular-nums" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-xs font-medium text-content-primary mb-1">
                      Proposal Description <span className="text-red-500">*</span>
                    </label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange}
                      required rows={4} placeholder="Describe your technical proposal, deliverables, approach, and timelines..."
                      className="w-full px-3 py-2 border border-subtle rounded bg-white text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition text-sm resize-none"></textarea>
                  </div>

                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-subtle mb-2">
                      <h3 className="text-xs font-semibold text-content-primary uppercase tracking-wide">Required Documents</h3>
                      <span className="text-[10px] text-content-muted">PDF only · max 20MB</span>
                    </div>
                    <p className="text-[11px] text-content-secondary mb-3">
                      Upload documents requested by the buyer. Files marked with <span className="text-red-500 font-bold">*</span> are mandatory.
                    </p>

                    {tender.required_documents.length === 0 ? (
                      <div className="p-3 bg-app rounded border border-subtle text-xs text-content-muted italic text-center">
                        No specific documents required by the buyer for this tender.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tender.required_documents.map((rd) => {
                          const inputId = `file-req-${rd.req_doc_id}`;
                          const file = docFiles[rd.req_doc_id] ?? null;
                          const isMissing = missingMandatoryIds.includes(rd.req_doc_id);
                          const fileError = docErrors[rd.req_doc_id];

                          return (
                            <div
                              key={rd.req_doc_id}
                              className={`p-3 border rounded transition-all ${
                                isMissing
                                  ? 'border-red-400 bg-red-50/70 ring-1 ring-red-400/20'
                                  : file
                                  ? 'border-emerald-400 bg-emerald-50/50'
                                  : 'border-subtle bg-app hover:border-brand-blue/40'
                              }`}
                            >
                              <div className="flex items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                                    file ? 'bg-emerald-100 text-emerald-600' : isMissing ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-semibold text-content-primary truncate">
                                        {rd.custom_doc_name || "Document"}
                                      </span>
                                      {rd.is_mandatory ? (
                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded border border-red-200">
                                          * Mandatory
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-medium rounded">
                                          Optional
                                        </span>
                                      )}
                                    </div>

                                    {file ? (
                                      <p className="text-[11px] text-emerald-700 font-medium truncate mt-0.5 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        {file.name} ({formatFileSize(file.size)})
                                      </p>
                                    ) : (
                                      <p className={`text-[11px] mt-0.5 ${isMissing ? 'text-red-600 font-bold' : 'text-content-muted'}`}>
                                        {isMissing ? 'Missing required upload' : 'No PDF attached'}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {file ? (
                                    <div className="flex items-center gap-1.5">
                                      <label htmlFor={inputId}
                                        className="cursor-pointer text-[11px] font-semibold text-content-primary bg-white border border-subtle hover:bg-slate-100 rounded px-2.5 py-1.5 transition">
                                        Change
                                        <input type="file" id={inputId} accept=".pdf" className="hidden"
                                          onChange={(e) => handleSingleFile(rd.req_doc_id, inputId, e)} />
                                      </label>
                                      <button type="button" onClick={() => clearFile(rd.req_doc_id, inputId)}
                                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded p-1.5 transition cursor-pointer" title="Remove file">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <label htmlFor={inputId}
                                      className={`cursor-pointer text-[11px] font-bold rounded px-3 py-1.5 transition flex items-center gap-1 ${
                                        isMissing
                                          ? 'bg-red-600 hover:bg-red-700 text-white'
                                          : 'bg-brand-navy hover:bg-slate-900 text-white'
                                      }`}>
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                      </svg>
                                      Select PDF
                                      <input type="file" id={inputId} accept=".pdf" className="hidden"
                                        onChange={(e) => handleSingleFile(rd.req_doc_id, inputId, e)} />
                                    </label>
                                  )}
                                </div>
                              </div>

                              {fileError && (
                                <p className="mt-1.5 text-[11px] text-red-600 font-semibold">{fileError}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 border-t border-subtle bg-surface px-4 py-2.5 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => router.push("/home")}
                    className="h-9 px-4 bg-app text-content-primary font-semibold rounded hover:bg-slate-200 transition border border-subtle text-xs cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="h-9 px-4 bg-brand-navy text-white hover:bg-slate-900 font-medium rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs cursor-pointer">
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span>Submit Bid</span>
                        <span className="text-[10px] opacity-80 font-normal tabular-nums">({bidCost}</span>
                        <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-[10px] opacity-80 font-normal">)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Restricted Document Access Modal */}
      {restrictedDocAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-fade-in">
          <div className="bg-surface rounded border border-subtle max-w-md w-full animate-fade-in">
            <div className="p-8">
              <div className="w-14 h-14 mx-auto mb-5 rounded bg-red-50 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-content-primary mb-2 text-center">Access Restricted</h3>
              <p className="text-content-secondary mb-6 text-center text-sm">
                You do not have authorization to view <strong className="text-content-primary">{restrictedDocAlert.docName}</strong>. This document requires <strong className="text-content-primary">Owner</strong> privileges. Contact your administrator or tender manager to request access.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => setRestrictedDocAlert({ isOpen: false, docName: '' })}
                  className="px-6 py-2.5 rounded bg-app text-content-primary font-semibold hover:bg-slate-200 transition border border-subtle"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Tokens Modal */}
      <ManageTokensModal
        isOpen={showManageTokens}
        onClose={() => setShowManageTokens(false)}
        onBalanceUpdate={(newBal) => {
          setTokenBalance(newBal);
          setTokenError(null);
          try {
            localStorage.setItem('org_token_balance', newBal.toString());
          } catch { }
        }}
      />

      {/* Bid Submitted Successfully Modal */}
      <ModalShell
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        maxWidth="max-w-lg"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg ring-8 ring-emerald-50/50">
            <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-content-primary mb-1">Bid Placed Successfully!</h2>
          <p className="text-content-secondary text-sm mb-6">
            Your proposal has been submitted to <strong className="text-content-primary">{tender?.buyer_org_name || 'Buyer'}</strong> for evaluation.
          </p>

          <div className="bg-app border border-subtle rounded p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-subtle">
              <span className="text-xs text-content-secondary font-semibold uppercase">Tender</span>
              <span className="text-xs font-bold text-content-primary truncate max-w-[240px]">{tender?.title}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-subtle">
              <span className="text-xs text-content-secondary font-semibold uppercase">Your Proposal</span>
              <span className="text-base font-semibold text-emerald-700 tabular-nums">৳ {parseFloat(formData.bidAmount || '0').toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-content-secondary font-semibold uppercase">Status</span>
              <span className="badge-status badge-pending">
                <span className="badge-dot" />Submitted (Under Review)
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/view-my-bids")}
              className="w-full py-3.5 bg-brand-navy text-white hover:bg-slate-900 font-medium rounded transition text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View in My Submitted Bids
            </button>

            <button
              onClick={handleReviewSubmission}
              className="w-full py-3 bg-app hover:bg-slate-200 text-content-primary font-medium rounded transition border border-subtle text-sm"
            >
              Review Submitted Proposal on this Page
            </button>

            <button
              onClick={() => router.push("/home")}
              className="w-full py-2.5 text-content-muted hover:text-content-secondary font-semibold transition text-xs"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </ModalShell>
    </main>
  );
}
