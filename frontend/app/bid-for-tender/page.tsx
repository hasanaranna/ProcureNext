"use client";

import { useState, useEffect } from "react";
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
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center" style={{ backgroundColor: "#3a4556" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-gray-300 text-lg">Loading tender details...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !tender) {
    return (
      <main className="w-full min-h-screen py-10 px-4 flex items-center justify-center" style={{ backgroundColor: "#3a4556" }}>
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || "Tender not found"}</p>
          <button
            onClick={() => router.push("/home")}
            className="px-6 py-2 bg-white text-gray-800 font-semibold rounded-lg hover:bg-gray-100 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // Build dates array for rendering
  const dates = [
    {
      label: "Deadline",
      value: formatDate(tender.submission_deadline),
      urgent: true,
    },
    {
      label: "Tender Public Date",
      value: formatDate(tender.tender_public_date),
      urgent: false,
    },
    {
      label: "Pre-Bid Meeting",
      value: formatDate(tender.pre_bid_meeting),
      urgent: false,
    },
    {
      label: "Tender Opening Date",
      value: formatDate(tender.tender_opening_date),
      urgent: false,
    },
  ];

  return (
    <main
      className="w-full min-h-screen py-10 px-4"
      style={{ backgroundColor: "#3a4556" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/home")}
          className="mb-6 flex items-center gap-2 text-gray-300 hover:text-white transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="font-medium">Back to Dashboard</span>
        </button>

        {/* Tender Details Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
          {/* Buyer Badge */}
          <div className="mb-4 flex items-center gap-2">
            <div
              style={{ backgroundColor: "#d1d5db" }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
            >
              🏢
            </div>
            <span
              style={{ backgroundColor: "#374151" }}
              className="rounded-full px-4 py-1 text-white text-xs font-semibold"
            >
              {tender.buyer_org_name}
            </span>
          </div>

          <h1 style={{ color: "#111827" }} className="text-3xl font-bold mb-2">
            {tender.title}
          </h1>
          <p
            style={{ color: "#6b7280" }}
            className="text-base leading-relaxed mb-6"
          >
            {tender.description}
          </p>

          {/* Key Dates */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {dates.map((date) => (
              <div
                key={date.label}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${
                  date.urgent
                    ? "bg-red-50 border-red-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div
                  className={`mt-0.5 flex-shrink-0 rounded-lg p-1.5 ${
                    date.urgent ? "bg-red-100" : "bg-gray-200"
                  }`}
                >
                  <svg
                    className={`w-4 h-4 ${date.urgent ? "text-red-500" : "text-gray-500"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <p
                    className={`text-xs font-medium mb-0.5 ${date.urgent ? "text-red-400" : "text-gray-400"}`}
                  >
                    {date.label}
                  </p>
                  <p
                    className={`text-sm font-bold ${date.urgent ? "text-red-600" : "text-gray-800"}`}
                  >
                    {date.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Attached Files */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Attached Files
            </p>
            <div className="flex flex-wrap gap-2">
              {tender.documents.length === 0 ? (
                <p className="text-sm text-gray-400">No documents attached</p>
              ) : (
                tender.documents.map((doc) => (
                  <div
                    key={doc.tender_doc_id}
                    style={{ backgroundColor: "#f3f4f6" }}
                    className="rounded-full px-4 py-2 flex items-center gap-2 border border-gray-300"
                  >
                    <svg
                      className="w-4 h-4 text-red-600"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                      <path
                        d="M14 2v6h6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                      <text
                        x="7"
                        y="19"
                        fontSize="7"
                        fill="white"
                        fontWeight="bold"
                      >
                        PDF
                      </text>
                    </svg>
                    <span
                      style={{ color: "#374151" }}
                      className="text-sm font-medium"
                    >
                      {doc.file_name || "Document"}
                    </span>
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await fetch(`/api/tenders/documents/${doc.tender_doc_id}/view`);
                          if (res.ok) {
                            const data = await res.json();
                            window.open(data.url, '_blank');
                          }
                        } catch (err) {
                          console.error('Failed to open document:', err);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition"
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bid Form Card or Existing Bid View */}
        {existingBid ? (
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full border border-green-200 shadow-sm">
                {existingBid.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b">
              Your Submitted Bid
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Financial Proposal</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <span className="text-3xl font-bold text-gray-800">
                    Tk {existingBid.financial_amount?.toLocaleString() || "0"}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Submitted On</h3>
                <p className="text-gray-800 text-lg">{formatDate(existingBid.submitted_at)}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Submitted Documents</h3>
                <div className="space-y-3">
                  {existingBid.documents?.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                          <path d="M14 2v6h6" />
                        </svg>
                        <span className="font-medium text-gray-800">{doc.document_type}</span>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          try {
                            const res = await fetch(`/api/bids/documents/${doc.bid_doc_id}/view`);
                            if (res.ok) {
                              const data = await res.json();
                              window.open(data.url, '_blank');
                            }
                          } catch (err) {
                            console.error('Failed to open document:', err);
                          }
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition px-2 py-1"
                      >
                        View
                      </button>
                    </div>
                  ))}
                  {!existingBid.documents?.length && (
                    <p className="text-sm text-gray-500">No documents submitted.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t mt-6">
              <button
                type="button"
                onClick={() => router.push("/home")}
                className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 relative">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full border border-yellow-200 shadow-sm flex items-center gap-1">
                Draft
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-1 text-center">
              Place Your Bid
            </h2>
            <p className="text-gray-500 text-sm mb-8 text-center">
              Provide your proposal details and bid amount
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Financial Amount */}
              <div>
                <label
                  htmlFor="bidAmount"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Financial Amount (BDT) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    Tk
                  </span>
                  <input
                    type="number"
                    id="bidAmount"
                    name="bidAmount"
                    value={formData.bidAmount}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 focus:bg-white transition text-gray-800 font-medium"
                    placeholder="e.g. 25000.00"
                  />
                </div>
              </div>

              {/* Supporting Documents */}
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">
                  Required Documents
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Please upload the necessary documents to support your bid. Only
                  PDF files are accepted.
                </p>

                <div className="space-y-4">
                  {[
                    {
                      id: "file-tax",
                      label: "Tax Certificate",
                      required: true,
                      file: taxCertificate,
                      setter: setTaxCertificate,
                    },
                    {
                      id: "file-bizid",
                      label: "Business Identification",
                      required: true,
                      file: businessId,
                      setter: setBusinessId,
                    },
                    {
                      id: "file-other",
                      label: "Other Documents",
                      required: false,
                      file: otherDoc,
                      setter: setOtherDoc,
                    },
                  ].map(({ id, label, required, file, setter }) => (
                    <div
                      key={id}
                      className="flex items-center gap-3 border-2 border-gray-200 rounded-lg px-4 py-2.5 bg-gray-50 hover:border-gray-400 transition"
                    >
                      {/* PDF icon */}
                      <svg
                        className={`w-5 h-5 flex-shrink-0 ${file ? "text-red-500" : "text-gray-300"}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                        <path d="M14 2v6h6" />
                        <path d="M16 13H8" />
                        <path d="M16 17H8" />
                        <path d="M10 9H8" />
                      </svg>

                      <div className="flex-1 flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-gray-700 truncate">
                          {label}{" "}
                          {required && <span className="text-red-500">*</span>}
                        </span>
                        {file ? (
                          <span className="text-xs text-gray-500 truncate">
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No file selected
                          </span>
                        )}
                      </div>

                      {file ? (
                        <button
                          type="button"
                          onClick={() => clearFile(setter, id)}
                          className="flex-shrink-0 text-gray-400 hover:text-red-500 p-1 rounded-full transition"
                          title="Remove file"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      ) : (
                        <label
                          htmlFor={id}
                          className="flex-shrink-0 cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-800 bg-white border border-gray-300 hover:border-gray-500 rounded-md px-3 py-1.5 transition"
                        >
                          Choose file
                          <input
                            type="file"
                            id={id}
                            accept=".pdf"
                            required={required}
                            className="hidden"
                            onChange={(e) => handleSingleFile(setter, id, e)}
                          />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6 pb-4">
                <button
                  type="button"
                  onClick={() => router.push("/home")}
                  className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background:
                      "linear-gradient(135deg, #4a5668 0%, #3a4556 100%)",
                  }}
                  className="flex-1 px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Bid
                      <span className="text-sm">( 100</span>
                      <svg
                        className="w-4 h-4 text-yellow-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="text-sm">)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Token Info */}
              <div className="text-center pt-4 border-t border-gray-300">
                <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                  You currently have{" "}
                  <span className="font-semibold text-gray-800 flex items-center gap-1">
                    180
                    <svg
                      className="w-4 h-4 text-yellow-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    tokens
                  </span>
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
