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
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
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
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-accent-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-300 text-lg font-medium">Loading tender details...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !tender) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400 text-lg mb-4 font-medium">{error || "Tender not found"}</p>
          <button onClick={() => router.push("/home")}
            className="px-6 py-2.5 bg-white text-navy-900 font-semibold rounded-xl hover:bg-slate-100 transition shadow-lg">
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
    <main className="w-full min-h-screen py-10 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Back Button */}
        <button onClick={() => router.push("/home")}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">Back to Dashboard</span>
        </button>

        {/* Tender Details Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-6 py-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-white/10 text-white text-xs font-bold rounded-full">{tender.buyer_org_name}</span>
            </div>
            <h1 className="text-2xl font-black text-white">{tender.title}</h1>
          </div>
          <div className="p-6">
            <p className="text-slate-600 text-sm leading-relaxed mb-6">{tender.description}</p>

            {/* Key Dates */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {dates.map((date) => (
                <div key={date.label}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
                    date.urgent ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
                  }`}>
                  <div className={`mt-0.5 flex-shrink-0 rounded-lg p-1.5 ${date.urgent ? "bg-red-100" : "bg-slate-200"}`}>
                    <svg className={`w-4 h-4 ${date.urgent ? "text-red-500" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-xs font-medium mb-0.5 ${date.urgent ? "text-red-400" : "text-slate-400"}`}>{date.label}</p>
                    <p className={`text-sm font-bold ${date.urgent ? "text-red-600" : "text-navy-900"}`}>{date.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Attached Files */}
            <div>
              <p className="text-sm font-semibold text-navy-900 mb-2">Attached Files</p>
              <div className="flex flex-wrap gap-2">
                {tender.documents.length === 0 ? (
                  <p className="text-sm text-slate-400">No documents attached</p>
                ) : (
                  tender.documents.map((doc) => (
                    <div key={doc.tender_doc_id} className="rounded-full px-4 py-2 flex items-center gap-2 border border-slate-200 bg-slate-50">
                      <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                        <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="1" />
                        <text x="7" y="19" fontSize="7" fill="white" fontWeight="bold">PDF</text>
                      </svg>
                      <span className="text-sm font-medium text-navy-900">{doc.file_name || "Document"}</span>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            const res = await fetch(`/api/tenders/documents/${doc.tender_doc_id}/view`);
                            if (res.ok) { const data = await res.json(); window.open(data.url, '_blank'); }
                          } catch (err) { console.error('Failed to open document:', err); }
                        }}
                        className="text-accent-600 hover:text-accent-700 text-sm font-semibold transition">
                        View
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bid Form Card or Existing Bid View */}
        {existingBid && !isEditing ? (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {existingBid.status}
              </span>
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-black text-navy-900 mb-2 pb-4 border-b border-slate-200">Your Submitted Bid</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Financial Proposal</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-3xl font-black text-navy-900">৳ {existingBid.financial_amount?.toLocaleString() || "0"}</span>
                  </div>
                </div>
                {existingBid.description && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Proposal Description</h3>
                    <p className="text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-wrap leading-relaxed text-sm">
                      {existingBid.description}
                    </p>
                  </div>
                )}
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Submitted On</h3>
                  <p className="text-navy-900 text-base font-semibold">{formatDate(existingBid.submitted_at)}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Submitted Documents</h3>
                  <div className="space-y-3">
                    {existingBid.documents?.map((doc, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${doc.has_access !== false ? 'bg-slate-50 border-slate-200' : 'bg-slate-100 border-slate-300 opacity-80'}`}>
                        <div className="flex items-center gap-3">
                          {doc.has_access !== false ? (
                            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                              <path d="M14 2v6h6" />
                            </svg>
                          ) : (
                            <span className="text-slate-500 text-lg">🔒</span>
                          )}
                          <span className={`font-semibold ${doc.has_access !== false ? 'text-navy-900' : 'text-slate-500 italic'}`}>
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
                            className="text-accent-600 hover:text-accent-700 text-sm font-semibold transition px-2 py-1">
                            View
                          </button>
                        ) : (
                          <button type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setRestrictedDocAlert({ isOpen: true, docName: doc.document_type });
                            }}
                            className="text-slate-400 hover:text-slate-500 text-sm font-semibold transition px-2 py-1 cursor-pointer">
                            View
                          </button>
                        )}
                      </div>
                    ))}
                    {!existingBid.documents?.length && (
                      <p className="text-sm text-slate-400">No documents submitted.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-200 mt-6 flex flex-col sm:flex-row gap-3">
                {canModifyBid && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex-1 px-6 py-3 bg-accent-600 text-white font-bold rounded-xl hover:bg-accent-700 transition text-sm shadow"
                    >
                      Edit Proposal
                    </button>
                    <button
                      type="button"
                      onClick={handleWithdrawBid}
                      disabled={withdrawing}
                      className="flex-1 px-6 py-3 bg-red-50 text-red-700 font-semibold rounded-xl hover:bg-red-100 transition border border-red-200 text-sm disabled:opacity-50"
                    >
                      {withdrawing ? "Withdrawing..." : "Withdraw Bid"}
                    </button>
                  </>
                )}
                <button type="button" onClick={() => router.push("/view-my-bids")}
                  className="flex-1 px-6 py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition text-sm shadow">
                  View All My Bids
                </button>
                <button type="button" onClick={() => router.push("/home")}
                  className="flex-1 px-6 py-3 bg-slate-100 text-navy-900 font-semibold rounded-xl hover:bg-slate-200 transition border border-slate-200 text-sm">
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : existingBid && isEditing ? (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
            <div className="p-8">
              <h2 className="text-2xl font-black text-navy-900 mb-1">Edit Your Proposal</h2>
              <p className="text-slate-500 text-sm mb-6">
                Update your financial amount and description. Document changes are not supported here.
              </p>

              {formValidationError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                  {formValidationError}
                </div>
              )}

              <form onSubmit={handleUpdateBid} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-navy-900 mb-1">Financial bid amount</label>
                  <input
                    name="bidAmount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.bidAmount}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-navy-900 mb-1">Proposal description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
                    className="flex-1 px-6 py-3 bg-slate-100 text-navy-900 font-semibold rounded-xl border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-navy-900 text-white font-bold rounded-xl disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1">Drafting Proposal</span>
            </div>

            <div className="p-8">
              <h2 className="text-2xl font-black text-navy-900 mb-1 text-center">Place Your Bid</h2>
              <p className="text-slate-500 text-sm mb-6 text-center">Provide your proposal details and attach all required documents</p>

              {/* Form Level Validation Error Alert */}
              {formValidationError && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-fade-in text-red-800 text-sm">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <strong className="font-bold">Validation Error:</strong> {formValidationError}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Token Cost & Balance Banner ───────── */}
                <div className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  tokenBalance < bidCost
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50/70 border-amber-200/80 text-navy-900'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tokenBalance < bidCost ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase font-bold text-slate-500">Bidding Fee</p>
                      <p className="text-sm font-black text-navy-900">
                        Cost: <span className="text-amber-600 font-black">{bidCost} Tokens</span>
                        <span className="mx-2 text-slate-300">|</span>
                        Available: <span className={`font-black ${tokenBalance < bidCost ? 'text-rose-600' : 'text-emerald-600'}`}>{tokenBalance} Tokens</span>
                      </p>
                      {tokenBalance < bidCost && (
                        <p className="text-xs text-rose-600 font-semibold mt-0.5">
                          Insufficient balance. You need {bidCost - tokenBalance} more tokens to place a bid.
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowManageTokens(true)}
                    className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Buy Tokens
                  </button>
                </div>

                {tokenError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between">
                    <span>{tokenError}</span>
                    <button
                      type="button"
                      onClick={() => setShowManageTokens(true)}
                      className="underline font-bold text-rose-900 hover:text-rose-950 ml-2"
                    >
                      Buy Tokens Now
                    </button>
                  </div>
                )}

                {/* Financial Amount */}
                <div>
                  <label htmlFor="bidAmount" className="block text-sm font-semibold text-navy-900 mb-2">
                    Financial Amount (BDT) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                    <input type="number" id="bidAmount" name="bidAmount" value={formData.bidAmount} onChange={handleChange}
                      required min="0" step="0.01" placeholder="e.g. 25000.00"
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition font-medium" />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-navy-900 mb-2">
                    Proposal Description <span className="text-red-500">*</span>
                  </label>
                  <textarea id="description" name="description" value={formData.description} onChange={handleChange}
                    required rows={4} placeholder="Describe your technical proposal, deliverables, approach, and timelines..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition font-medium resize-none"></textarea>
                </div>

                {/* Supporting Documents */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                    <h3 className="text-base font-bold text-navy-900">Required Documents</h3>
                    <span className="text-xs text-slate-400">PDF documents only (max 20MB)</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Upload documents requested by the buyer. Files marked with <span className="text-red-500 font-bold">*</span> are mandatory.
                  </p>

                  {tender.required_documents.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 italic text-center">
                      No specific documents required by the buyer for this tender.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tender.required_documents.map((rd) => {
                        const inputId = `file-req-${rd.req_doc_id}`;
                        const file = docFiles[rd.req_doc_id] ?? null;
                        const isMissing = missingMandatoryIds.includes(rd.req_doc_id);
                        const fileError = docErrors[rd.req_doc_id];

                        return (
                          <div
                            key={rd.req_doc_id}
                            className={`p-4 border-2 rounded-2xl transition-all duration-300 ${
                              isMissing
                                ? 'border-red-400 bg-red-50/70 shadow-sm ring-2 ring-red-400/20'
                                : file
                                ? 'border-emerald-400 bg-emerald-50/50 shadow-sm'
                                : 'border-slate-200 bg-slate-50 hover:border-accent-300'
                            }`}
                          >
                            <div className="flex items-start sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  file ? 'bg-emerald-100 text-emerald-600' : isMissing ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-navy-900 truncate">
                                      {rd.custom_doc_name || "Document"}
                                    </span>
                                    {rd.is_mandatory ? (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">
                                        * Mandatory
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-medium rounded-full">
                                        Optional
                                      </span>
                                    )}
                                  </div>

                                  {file ? (
                                    <p className="text-xs text-emerald-700 font-medium truncate mt-0.5 flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                      {file.name} ({formatFileSize(file.size)})
                                    </p>
                                  ) : (
                                    <p className={`text-xs mt-0.5 ${isMissing ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                                      {isMissing ? 'Missing required upload' : 'No PDF attached'}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Action: Upload / Change / Remove */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {file ? (
                                  <div className="flex items-center gap-2">
                                    <label htmlFor={inputId}
                                      className="cursor-pointer text-xs font-semibold text-navy-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl px-3 py-1.5 transition shadow-sm">
                                      Change
                                      <input type="file" id={inputId} accept=".pdf" className="hidden"
                                        onChange={(e) => handleSingleFile(rd.req_doc_id, inputId, e)} />
                                    </label>
                                    <button type="button" onClick={() => clearFile(rd.req_doc_id, inputId)}
                                      className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl p-1.5 transition" title="Remove file">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <label htmlFor={inputId}
                                    className={`cursor-pointer text-xs font-bold rounded-xl px-4 py-2 transition shadow-sm flex items-center gap-1.5 ${
                                      isMissing
                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                        : 'bg-navy-900 hover:bg-navy-800 text-white'
                                    }`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              <p className="mt-2 text-xs text-red-600 font-semibold">{fileError}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => router.push("/home")}
                    className="flex-1 px-6 py-3.5 bg-slate-100 text-navy-900 font-semibold rounded-xl hover:bg-slate-200 transition border border-slate-200 text-sm cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer">
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting Proposal...
                      </>
                    ) : (
                      <>
                        <span>Submit Bid Proposal</span>
                        <span className="text-xs opacity-80 font-normal">({bidCost}</span>
                        <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs opacity-80 font-normal">)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Token Info */}
                <div className="text-center pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                  <p className="flex items-center gap-1">
                    Organization Balance:{" "}
                    <span className="font-bold text-navy-900 flex items-center gap-1 text-sm">
                      {tokenBalance.toLocaleString()}
                      <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowManageTokens(true)}
                    className="font-bold text-amber-600 hover:text-amber-700 underline cursor-pointer"
                  >
                    + Buy More Tokens
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Restricted Document Access Modal */}
      {restrictedDocAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            <div className="p-8">
              <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-50 flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-black text-navy-900 mb-2 text-center">Access Restricted</h3>
              <p className="text-slate-600 mb-6 text-center text-sm">
                You do not have authorization to view <strong className="text-navy-900">{restrictedDocAlert.docName}</strong>. This document requires <strong className="text-navy-900">Owner</strong> privileges. Contact your administrator or tender manager to request access.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => setRestrictedDocAlert({ isOpen: false, docName: '' })}
                  className="px-6 py-2.5 rounded-xl bg-slate-100 text-navy-900 font-semibold hover:bg-slate-200 transition border border-slate-200"
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg ring-8 ring-emerald-50/50">
            <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-black text-navy-900 mb-1">Bid Placed Successfully!</h2>
          <p className="text-slate-600 text-sm mb-6">
            Your proposal has been submitted to <strong className="text-navy-900">{tender?.buyer_org_name || 'Buyer'}</strong> for evaluation.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-semibold uppercase">Tender</span>
              <span className="text-xs font-bold text-navy-900 truncate max-w-[240px]">{tender?.title}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-semibold uppercase">Your Proposal</span>
              <span className="text-base font-black text-emerald-700">৳ {parseFloat(formData.bidAmount || '0').toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold uppercase">Status</span>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                Submitted (Under Review)
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/view-my-bids")}
              className="w-full py-3.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition shadow-lg text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              View in My Submitted Bids
            </button>

            <button
              onClick={handleReviewSubmission}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold rounded-xl transition border border-slate-200 text-sm"
            >
              Review Submitted Proposal on this Page
            </button>

            <button
              onClick={() => router.push("/home")}
              className="w-full py-2.5 text-slate-500 hover:text-slate-700 font-semibold transition text-xs"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </ModalShell>
    </main>
  );
}
