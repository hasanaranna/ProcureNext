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
    <div className="flex items-center justify-between py-3 border-b border-subtle last:border-0">
      <div className="flex items-center gap-3">
        {type === "pdf" ? (
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
            </svg>
          </div>
        ) : (
          <div className="w-8 h-8 rounded bg-app flex items-center justify-center flex-shrink-0 border border-subtle">
            <svg className="w-4 h-4 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <p className="text-sm font-medium text-content-primary">{label}</p>
      </div>
      {filename ? (
        <a href={filename} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-brand-blue bg-surface border border-subtle px-2.5 py-0.5 rounded hover:bg-app transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View
        </a>
      ) : (
        <span className="text-xs font-medium text-content-muted bg-app border border-subtle px-2.5 py-0.5 rounded">
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
      <div className="bg-surface px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-subtle">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-brand-navy flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
            {registration.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-semibold text-content-primary leading-tight">{registration.name}</h2>
            <p className="text-content-secondary text-xs font-medium">{registration.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge-status badge-pending">
            <span className="badge-dot" />Pending Review
          </span>
          <button onClick={onClose}
            className="w-8 h-8 rounded bg-transparent hover:bg-slate-100 text-content-secondary hover:text-content-primary flex items-center justify-center transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">
        {/* Submission meta */}
        <div className="flex items-center gap-2 text-content-secondary text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Submitted on {registration.submittedAt}
        </div>

        {/* Personal Information */}
        <section>
          <h3 className="text-content-secondary text-xs font-medium uppercase tracking-widest mb-3">Personal Information</h3>
          <div className="bg-app rounded border border-subtle overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-subtle">
              <div className="px-4 py-3">
                <p className="text-content-secondary text-xs font-medium mb-1">Full Name</p>
                <p className="text-sm font-medium text-content-primary">{registration.name}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-content-secondary text-xs font-medium mb-1">Phone Number</p>
                <p className="text-sm font-medium text-content-primary">{registration.phone}</p>
              </div>
            </div>
            <div className="border-t border-subtle px-4 py-3">
              <p className="text-content-secondary text-xs font-medium mb-1">Email Address</p>
              <p className="text-sm font-medium text-content-primary">{registration.email}</p>
            </div>
          </div>
        </section>

        {/* Organization */}
        <section>
          <h3 className="text-content-secondary text-xs font-medium uppercase tracking-widest mb-3">Organization</h3>
          <div className="bg-app rounded border border-subtle px-4 py-3">
            <p className="text-content-secondary text-xs font-medium mb-1">Organization Name</p>
            <p className="text-sm font-medium text-content-primary">{registration.company}</p>
          </div>
        </section>

        {/* Identity Documents */}
        <section>
          <h3 className="text-content-secondary text-xs font-medium uppercase tracking-widest mb-3">Identity Documents</h3>
          <div className="bg-app rounded border border-subtle px-4 py-1">
            <DocRow label="NID — Front Side" filename={registration.documents.nidFront} type="image" />
            <DocRow label="NID — Back Side" filename={registration.documents.nidBack} type="image" />
          </div>
        </section>

        {/* Regulatory Documents */}
        <section>
          <h3 className="text-content-secondary text-xs font-medium uppercase tracking-widest mb-3">Regulatory Documents</h3>
          <div className="bg-app rounded border border-subtle px-4 py-1">
            <DocRow label="Trade License" filename={registration.documents.tradeLicense} type="pdf" />
            <DocRow label="TIN Certificate" filename={registration.documents.tinCertificate} type="pdf" />
            <DocRow label="VAT Certificate" filename={registration.documents.vatCertificate} type="pdf" />
          </div>
        </section>

        {/* Additional Documents */}
        <section>
          <h3 className="text-content-secondary text-xs font-medium uppercase tracking-widest mb-3">
            Additional Documents
            <span className="ml-2 normal-case font-normal text-content-muted">(Optional)</span>
          </h3>
          {registration.documents.additionalDocs.length > 0 ? (
            <div className="bg-app rounded border border-subtle px-4 py-1">
              {registration.documents.additionalDocs.map((doc, i) => (
                <DocRow key={i} label={doc} filename={doc} type="pdf" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-content-muted italic bg-app rounded border border-subtle px-4 py-3">
              No additional documents submitted.
            </p>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-subtle bg-surface">
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => handleAction(onDecline)} disabled={isSubmitting}
            className="flex items-center justify-center gap-2 px-3.5 h-9 bg-status-rejected-bg text-status-rejected-text hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded border border-subtle transition-all">
            {isSubmitting && (
              <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            Decline
          </button>
          <button onClick={() => handleAction(onAccept)} disabled={isSubmitting}
            className="flex items-center justify-center gap-2 bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {isSubmitting && (
              <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
            )}
            Accept
          </button>
        </div>
        {errorMsg && (
          <div className="mt-3 text-right text-sm text-red-600 font-medium">{errorMsg}</div>
        )}
      </div>
    </ModalShell>
  );
}
