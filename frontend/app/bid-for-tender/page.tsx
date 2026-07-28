"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface TenderDocument {
  tender_doc_id: number;
  file_name: string | null;
  file_path: string | null;
  uploaded_at: string | null;
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
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface BidDocument {
  bid_doc_id: number;
  file_path: string | null;
  document_type: string;
}

interface ExistingBid {
  bid_id: number;
  tender_id: number;
  financial_amount: number | null;
  status: string;
  submitted_at: string | null;
  documents: BidDocument[];
}

export default function BidForTenderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div></div>}>
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

  const [formData, setFormData] = useState({
    description: "",
    bidAmount: "",
  });
  const [taxCertificate, setTaxCertificate] = useState<File | null>(null);
  const [businessId, setBusinessId] = useState<File | null>(null);
  const [otherDoc, setOtherDoc] = useState<File | null>(null);

  useEffect(() => {
    if (!tenderId) {
      setError("No tender ID provided");
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const tenderRes = await fetch(`/api/tenders/${tenderId}/detail`);
        if (!tenderRes.ok) {
          throw new Error(tenderRes.status === 404 ? "Tender not found" : "Failed to load tender");
        }
        const tenderData = await tenderRes.json();
        setTender(tenderData);

        // Fetch existing bid if any
        const bidRes = await fetch(`/api/bids/vendor/tender/${tenderId}`);
        if (bidRes.ok) {
          const bidData = await bidRes.json();
          setExistingBid(bidData);
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
  };

  const handleSingleFile = (
    setter: (f: File | null) => void,
    inputId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf") {
      alert("Only PDF files are allowed");
      e.target.value = "";
      return;
    }
    setter(file);
  };

  const clearFile = (setter: (f: File | null) => void, inputId: string) => {
    setter(null);
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!tenderId || submitting) return;

    setSubmitting(true);
    try {
      const body = new FormData();

      // Bid data as JSON
      body.append(
        "bid_data",
        JSON.stringify({
          tender_id: parseInt(tenderId),
          financial_amount: parseFloat(formData.bidAmount),
        })
      );

      // Collect files and their document type names
      const docFiles: { file: File; typeName: string }[] = [];
      if (taxCertificate) docFiles.push({ file: taxCertificate, typeName: "TIN" });
      if (businessId) docFiles.push({ file: businessId, typeName: "TradeLicense" });
      if (otherDoc) docFiles.push({ file: otherDoc, typeName: "VAT" });

      body.append(
        "doc_type_names",
        JSON.stringify(docFiles.map((d) => d.typeName))
      );

      for (const { file } of docFiles) {
        body.append("files", file);
      }

      const res = await fetch("/api/bids/vendor/submit-with-documents", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to submit bid");
      }

      router.push("/home");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to submit bid");
    } finally {
      setSubmitting(false);
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
        {existingBid ? (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-full border border-emerald-200">{existingBid.status}</span>
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-black text-navy-900 mb-6 pb-4 border-b border-slate-200">Your Submitted Bid</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Financial Proposal</h3>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-3xl font-black text-navy-900">Tk {existingBid.financial_amount?.toLocaleString() || "0"}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Submitted On</h3>
                  <p className="text-navy-900 text-lg font-semibold">{formatDate(existingBid.submitted_at)}</p>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Submitted Documents</h3>
                  <div className="space-y-3">
                    {existingBid.documents?.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                            <path d="M14 2v6h6" />
                          </svg>
                          <span className="font-semibold text-navy-900">{doc.document_type}</span>
                        </div>
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
                      </div>
                    ))}
                    {!existingBid.documents?.length && (
                      <p className="text-sm text-slate-400">No documents submitted.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-200 mt-6">
                <button type="button" onClick={() => router.push("/home")}
                  className="w-full px-6 py-3 bg-slate-100 text-navy-900 font-semibold rounded-xl hover:bg-slate-200 transition border border-slate-200">
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1">Draft</span>
            </div>

            <div className="p-8">
              <h2 className="text-2xl font-black text-navy-900 mb-1 text-center">Place Your Bid</h2>
              <p className="text-slate-500 text-sm mb-8 text-center">Provide your proposal details and bid amount</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Financial Amount */}
                <div>
                  <label htmlFor="bidAmount" className="block text-sm font-semibold text-navy-900 mb-2">
                    Financial Amount (BDT) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">Tk</span>
                    <input type="number" id="bidAmount" name="bidAmount" value={formData.bidAmount} onChange={handleChange}
                      required min="0" step="0.01" placeholder="e.g. 25000.00"
                      className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition font-medium" />
                  </div>
                </div>

                {/* Supporting Documents */}
                <div>
                  <h3 className="text-lg font-bold text-navy-900 mb-2 pb-2 border-b border-slate-200">Required Documents</h3>
                  <p className="text-sm text-slate-500 mb-4">Upload necessary documents to support your bid. Only PDF files accepted.</p>

                  <div className="space-y-3">
                    {[
                      { id: "file-tax", label: "Tax Certificate", required: true, file: taxCertificate, setter: setTaxCertificate },
                      { id: "file-bizid", label: "Business Identification", required: true, file: businessId, setter: setBusinessId },
                      { id: "file-other", label: "Other Documents", required: false, file: otherDoc, setter: setOtherDoc },
                    ].map(({ id, label, required, file, setter }) => (
                      <div key={id}
                        className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 transition-all duration-300 ${
                          file ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-accent-300'
                        }`}>
                        <svg className={`w-5 h-5 flex-shrink-0 ${file ? "text-emerald-500" : "text-slate-300"}`} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                          <path d="M14 2v6h6" />
                          <path d="M16 13H8" />
                          <path d="M16 17H8" />
                          <path d="M10 9H8" />
                        </svg>

                        <div className="flex-1 flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-navy-900 truncate">
                            {label} {required && <span className="text-red-500">*</span>}
                          </span>
                          {file ? (
                            <span className="text-xs text-slate-500 truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                          ) : (
                            <span className="text-xs text-slate-400">No file selected</span>
                          )}
                        </div>

                        {file ? (
                          <button type="button" onClick={() => clearFile(setter, id)}
                            className="flex-shrink-0 text-slate-400 hover:text-red-500 p-1 rounded-full transition" title="Remove file">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        ) : (
                          <label htmlFor={id}
                            className="flex-shrink-0 cursor-pointer text-xs font-semibold text-accent-600 bg-white border border-accent-200 hover:bg-accent-50 rounded-lg px-3 py-1.5 transition">
                            Choose file
                            <input type="file" id={id} accept=".pdf" required={required} className="hidden"
                              onChange={(e) => handleSingleFile(setter, id, e)} />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => router.push("/home")}
                    className="flex-1 px-6 py-3 bg-slate-100 text-navy-900 font-semibold rounded-xl hover:bg-slate-200 transition border border-slate-200">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                    {submitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit Bid
                        <span className="text-sm opacity-80">( 100</span>
                        <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm opacity-80">)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Token Info */}
                <div className="text-center pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-500 flex items-center justify-center gap-1">
                    You currently have{" "}
                    <span className="font-bold text-navy-900 flex items-center gap-1">
                      180
                      <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      tokens
                    </span>
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
