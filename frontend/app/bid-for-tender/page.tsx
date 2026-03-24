"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const tenderDetails = {
  title: "Office Supplies Tender",
  subtitle:
    "Procurement of office stationery and supplies for Q2 2026. This tender includes bulk paper, writing instruments, filing systems, desk organizers, and other essential office materials. The buyer is looking for competitive pricing with reliable delivery schedules.",
  buyer: "Acme Corporation",
  files: ["requirements.pdf", "item_list.pdf"],
  dates: {
    deadline: { label: "Deadline", value: "30 Jun 2026", urgent: true },
    tenderPublicDate: {
      label: "Tender Public Date",
      value: "01 Apr 2026",
      urgent: false,
    },
    preBidMeeting: {
      label: "Pre-Bid Meeting",
      value: "15 Apr 2026",
      urgent: false,
    },
    tenderOpeningDate: {
      label: "Tender Opening Date",
      value: "05 Jul 2026",
      urgent: false,
    },
  },
};

export default function BidForTenderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    description: "",
    bidAmount: "",
  });
  const [taxCertificate, setTaxCertificate] = useState<File | null>(null);
  const [businessId, setBusinessId] = useState<File | null>(null);
  const [otherDoc, setOtherDoc] = useState<File | null>(null);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Bid submitted:", formData);
    router.push("/home-seller");
  };

  return (
    <main
      className="w-full min-h-screen py-10 px-4"
      style={{ backgroundColor: "#3a4556" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push("/home-seller")}
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
              {tenderDetails.buyer}
            </span>
          </div>

          <h1 style={{ color: "#111827" }} className="text-3xl font-bold mb-2">
            {tenderDetails.title}
          </h1>
          <p
            style={{ color: "#6b7280" }}
            className="text-base leading-relaxed mb-6"
          >
            {tenderDetails.subtitle}
          </p>

          {/* Key Dates */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {Object.values(tenderDetails.dates).map((date) => (
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
              {tenderDetails.files.map((file, index) => (
                <div
                  key={index}
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
                    {file}
                  </span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bid Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          <h2
            style={{ color: "#111827" }}
            className="text-2xl font-bold mb-1 text-center"
          >
            Place Your Bid
          </h2>
          <p className="text-gray-500 text-sm mb-8 text-center">
            Provide your proposal details and bid amount
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Your Proposal
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your proposal, delivery timeline, and any special offers..."
                required
                rows={5}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition resize-none"
              />
            </div>

            {/* Bid Amount */}
            <div>
              <label
                htmlFor="bidAmount"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Bid Amount (in BDT)
              </label>
              <input
                type="number"
                id="bidAmount"
                name="bidAmount"
                value={formData.bidAmount}
                onChange={handleChange}
                placeholder="Enter your bid amount"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition"
              />
            </div>

            {/* Document Uploads */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">
                Upload Documents{" "}
                <span className="font-normal text-gray-400">(PDF only)</span>
              </p>

              {/* Reusable file row renderer */}
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
                  </svg>

                  {/* Label + filename */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-700">
                      {label}
                      {required && (
                        <span className="text-red-500 ml-0.5">*</span>
                      )}
                      {!required && (
                        <span className="ml-1 text-xs font-normal text-gray-400">
                          (Optional)
                        </span>
                      )}
                    </span>
                    {file && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {file.name}
                      </p>
                    )}
                  </div>

                  {/* Choose / Clear */}
                  {file ? (
                    <button
                      type="button"
                      onClick={() => clearFile(setter, id)}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 transition"
                      aria-label="Remove file"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
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

            {/* Buttons */}
            <div className="flex gap-4 pt-6 pb-4">
              <button
                type="button"
                onClick={() => router.push("/home-seller")}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background:
                    "linear-gradient(135deg, #4a5668 0%, #3a4556 100%)",
                }}
                className="flex-1 px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1"
              >
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
      </div>
    </main>
  );
}
