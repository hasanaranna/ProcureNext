"use client";

import { useState } from "react";
import ModalShell from "@/components/ModalShell";

export interface RegistrationDetail {
  id: number;
  orgId: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  submittedAt: string;
  documents: {
    nidFront: string | null;
    nidBack: string | null;
    tradeLicense: string | null;
    tinCertificate: string | null;
    vatCertificate: string | null;
    additionalDocs: string[];
  };
}

interface PendingRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: (reg: RegistrationDetail) => Promise<void> | void;
  onDecline?: (reg: RegistrationDetail) => Promise<void> | void;
  registration: RegistrationDetail | null;
}

function DocRow({
  label,
  filename,
  type,
}: {
  label: string;
  filename: string | null;
  type: "image" | "pdf";
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2.5">
        {type === "pdf" ? (
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-blue-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        )}
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
        </div>
      </div>
      {filename ? (
        <a
          href={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full hover:bg-indigo-100 transition-colors"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          View Doc
        </a>
      ) : (
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
          Not provided
        </span>
      )}
    </div>
  );
}

export default function PendingRequestDetailModal({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  registration,
}: PendingRequestDetailModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!registration) return null;

  const handleAction = async (
    actionFn?: (reg: RegistrationDetail) => Promise<void> | void
  ) => {
    if (!actionFn) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await actionFn(registration);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {registration.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              {registration.name}
            </h2>
            <p className="text-sm text-gray-300">{registration.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30">
            Pending Review
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-2xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">

        {/* Submission meta */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <svg
            className="w-3.5 h-3.5"
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
          Submitted on {registration.submittedAt}
        </div>

        {/* Personal Information */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Personal Information
          </h3>
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
              {/* Full Name */}
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 font-medium mb-1">Full Name</p>
                <p className="text-sm font-semibold text-gray-800">{registration.name}</p>
              </div>
              {/* Phone */}
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 font-medium mb-1">Phone Number</p>
                <p className="text-sm font-semibold text-gray-800">{registration.phone}</p>
              </div>
            </div>
            <div className="border-t border-gray-200 px-5 py-4">
              <p className="text-xs text-gray-400 font-medium mb-1">Email Address</p>
              <p className="text-sm font-semibold text-gray-800">{registration.email}</p>
            </div>
          </div>
        </section>

        {/* Organization Information */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Organization
          </h3>
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-xs text-gray-400 font-medium mb-1">Organization Name</p>
            <p className="text-sm font-semibold text-gray-800">{registration.company}</p>
          </div>
        </section>

        {/* Identity Documents */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Identity Documents
          </h3>
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-1">
            <DocRow
              label="NID — Front Side"
              filename={registration.documents.nidFront}
              type="image"
            />
            <DocRow
              label="NID — Back Side"
              filename={registration.documents.nidBack}
              type="image"
            />
          </div>
        </section>

        {/* Regulatory Documents */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Regulatory Documents
          </h3>
          <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-1">
            <DocRow
              label="Trade License"
              filename={registration.documents.tradeLicense}
              type="pdf"
            />
            <DocRow
              label="TIN Certificate"
              filename={registration.documents.tinCertificate}
              type="pdf"
            />
            <DocRow
              label="VAT Certificate"
              filename={registration.documents.vatCertificate}
              type="pdf"
            />
          </div>
        </section>

        {/* Additional Documents */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Additional Documents
            <span className="ml-2 normal-case font-normal text-gray-400">(Optional)</span>
          </h3>
          {registration.documents.additionalDocs.length > 0 ? (
            <div className="bg-gray-50 rounded-xl border border-gray-200 px-5 py-1">
              {registration.documents.additionalDocs.map((doc, i) => (
                <DocRow key={i} label={doc} filename={doc} type="pdf" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic bg-gray-50 rounded-xl border border-gray-200 px-5 py-4">
              No additional documents submitted.
            </p>
          )}
        </section>

      </div>

      {/* Footer — Accept / Decline */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => handleAction(onDecline)}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition shadow-sm"
          >
            {isSubmitting && (
              <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            Decline
          </button>
          <button
            onClick={() => handleAction(onAccept)}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition shadow-sm"
          >
            {isSubmitting && (
              <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            Accept
          </button>
        </div>
        {errorMsg && (
          <div className="mt-3 text-right text-sm text-red-600 font-medium">
            {errorMsg}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
