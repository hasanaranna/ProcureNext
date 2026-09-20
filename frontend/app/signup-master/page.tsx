"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FileFields {
  nidFront: File | null;
  nidBack: File | null;
  tradeLicense: File | null;
  tinCertificate: File | null;
  vatCertificate: File | null;
  additionalDocs: File[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SignupMasterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    organizationName: "",
    email: "",
    phone: "",
    nid: "",
    date_of_birth: "",
    password: "",
  });

  const [files, setFiles] = useState<FileFields>({
    nidFront: null,
    nidBack: null,
    tradeLicense: null,
    tinCertificate: null,
    vatCertificate: null,
    additionalDocs: [],
  });

  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSubmitError("");
  };

  const handleSingleFile = (
    field: keyof Omit<FileFields, "additionalDocs">,
    accept: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      const isImage = accept === "image/*";
      const isPdf = accept === ".pdf";
      if (isImage && !file.type.startsWith("image/")) {
        setFileErrors((prev) => ({ ...prev, [field]: "Please upload an image file (JPG, PNG)." }));
        e.target.value = "";
        return;
      }
      if (isPdf && file.type !== "application/pdf") {
        setFileErrors((prev) => ({ ...prev, [field]: "Please upload a valid PDF document." }));
        e.target.value = "";
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setFileErrors((prev) => ({ ...prev, [field]: "File size must not exceed 20MB." }));
        e.target.value = "";
        return;
      }
    }

    setFileErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setFiles((prev) => ({ ...prev, [field]: file }));
  };

  const removeSingleFile = (field: keyof Omit<FileFields, "additionalDocs">, inputId: string) => {
    setFiles((prev) => ({ ...prev, [field]: null }));
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleAdditionalDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => ({
        ...prev,
        additionalDocs: [...prev.additionalDocs, ...selected],
      }));
    }
  };

  const removeAdditionalDoc = (index: number) => {
    setFiles((prev) => ({
      ...prev,
      additionalDocs: prev.additionalDocs.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    // Validate mandatory files
    const errors: Record<string, string> = {};
    if (!files.nidFront) errors.nidFront = "NID Front image is required";
    if (!files.nidBack) errors.nidBack = "NID Back image is required";
    if (!files.tradeLicense) errors.tradeLicense = "Trade License PDF is required";
    if (!files.tinCertificate) errors.tinCertificate = "TIN Certificate PDF is required";
    if (!files.vatCertificate) errors.vatCertificate = "VAT Certificate PDF is required";

    if (Object.keys(errors).length > 0) {
      setFileErrors(errors);
      setSubmitError("Please upload all required mandatory documents highlighted below.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body = new FormData();
      // Text fields
      body.append("name", formData.name);
      body.append("organizationName", formData.organizationName);
      body.append("email", formData.email);
      body.append("phone", formData.phone);
      body.append("nid", formData.nid);
      body.append("date_of_birth", formData.date_of_birth);
      body.append("password", formData.password);

      // Files
      if (files.nidFront) body.append("nidFront", files.nidFront);
      if (files.nidBack) body.append("nidBack", files.nidBack);
      if (files.tradeLicense) body.append("tradeLicense", files.tradeLicense);
      if (files.tinCertificate) body.append("tinCertificate", files.tinCertificate);
      if (files.vatCertificate) body.append("vatCertificate", files.vatCertificate);
      files.additionalDocs.forEach((doc) => body.append("additionalDocs", doc));

      const res = await fetch("/api/org/orgs", {
        method: "POST",
        body,
      });

      if (res.ok) {
        setSubmitSuccess(true);
      } else {
        const err = await res.json();
        const message =
          typeof err.detail === "string"
            ? err.detail
            : err.error?.message || "Registration failed.";
        setSubmitError(message);
      }
    } catch {
      setSubmitError("Network error. Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Success state ──────────────────────────────────
  if (submitSuccess) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center py-20 px-4 bg-app">
        <div className="max-w-xl mx-auto w-full">
          <div className="bg-surface rounded border border-subtle p-8 md:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-status-approved-bg flex items-center justify-center">
              <svg className="w-8 h-8 text-status-approved-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-content-primary mb-3">Application Submitted!</h1>
            <p className="text-content-secondary text-sm mb-2">Your master account application has been submitted successfully.</p>
            <p className="text-content-muted text-xs mb-8">A system administrator will review your documents and approve your account. You will be able to log in once your account is verified.</p>
            <div className="badge-status badge-pending inline-flex mb-6">
              <span className="badge-dot"></span>
              Pending Admin Approval
            </div>
            <div>
              <button
                onClick={() => router.push("/login")}
                className="h-9 px-6 bg-brand-navy text-white text-sm font-medium rounded hover:bg-slate-900 transition-colors duration-200"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const inputClass = "w-full px-3 py-2 border border-subtle rounded bg-surface text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition";

  return (
    <main className="w-full min-h-screen flex items-center justify-center py-12 px-4 bg-app">
      <div className="max-w-2xl mx-auto w-full">
        <div className="bg-surface rounded border border-subtle p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded bg-brand-navy flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-content-primary mb-1">Create Master Account</h1>
            <p className="text-content-secondary text-sm">Register as an Owner to manage your organization on ProcureNext</p>
            <p className="text-xs text-content-muted mt-2">Are you an Employee? Use the invitation sent by your company owner to sign up!</p>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 p-3 bg-status-rejected-bg border border-red-200 rounded text-status-rejected-text text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="font-bold">Error:</strong> {submitError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ── Section 1: Personal Info ──────────────── */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-subtle">
                <span className="w-6 h-6 rounded bg-brand-navy text-white flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="text-xs font-medium text-content-secondary uppercase tracking-wide">Personal & Company Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-content-primary mb-1.5">Full Name</label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleChange}
                    placeholder="Enter your full name"
                    className={inputClass} />
                </div>
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-medium text-content-primary mb-1.5">Organization Name <span className="text-status-rejected-text">*</span></label>
                  <input type="text" id="organizationName" name="organizationName" value={formData.organizationName} onChange={handleChange}
                    placeholder="Enter your organization name" required
                    className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-content-primary mb-1.5">Email Address <span className="text-status-rejected-text">*</span></label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange}
                    placeholder="you@company.com" required
                    className={inputClass} />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-content-primary mb-1.5">Phone Number <span className="text-status-rejected-text">*</span></label>
                  <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="Enter your phone number" required
                    className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="nid" className="block text-sm font-medium text-content-primary mb-1.5">National ID Number <span className="text-status-rejected-text">*</span></label>
                  <input type="number" id="nid" name="nid" value={formData.nid} onChange={handleChange}
                    placeholder="NID number" required
                    className={inputClass} />
                </div>
                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-medium text-content-primary mb-1.5">Date of Birth <span className="text-status-rejected-text">*</span></label>
                  <input type="date" id="date_of_birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange}
                    required
                    className={inputClass} />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-content-primary mb-1.5">Password <span className="text-status-rejected-text">*</span></label>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange}
                    placeholder="Min 8 characters" required minLength={8}
                    className={inputClass} />
                </div>
              </div>
            </div>

            {/* ── Section 2: Identity Documents ────────── */}
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-subtle">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-brand-navy text-white flex items-center justify-center text-xs font-bold">2</span>
                  <h3 className="text-xs font-medium text-content-secondary uppercase tracking-wide">Identity Documents</h3>
                </div>
                <span className="text-xs text-status-rejected-text font-medium">* Both sides mandatory</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-content-primary mb-2">
                  National ID (NID) <span className="text-status-rejected-text">*</span>
                  <span className="text-xs font-normal text-content-muted ml-2">(Upload clear JPG or PNG images)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NID Front */}
                  <div className={`p-4 border rounded transition-all ${
                    fileErrors.nidFront ? 'border-red-400 bg-status-rejected-bg' : files.nidFront ? 'border-emerald-300 bg-status-approved-bg' : 'border-subtle bg-app'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-content-primary">NID Front Side <span className="text-status-rejected-text">*</span></span>
                      {files.nidFront ? (
                        <span className="badge-status badge-approved text-[10px]"><span className="badge-dot"></span>Attached</span>
                      ) : (
                        <span className="badge-status badge-rejected text-[10px]"><span className="badge-dot"></span>Required</span>
                      )}
                    </div>
                    {files.nidFront ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-surface rounded border border-subtle">
                        <span className="text-xs text-content-primary font-medium truncate">{files.nidFront.name} ({formatFileSize(files.nidFront.size)})</span>
                        <button type="button" onClick={() => removeSingleFile("nidFront", "nidFront")} className="text-status-rejected-text hover:text-red-700 p-1 text-xs font-medium">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="nidFront" className="flex flex-col items-center justify-center p-4 border border-dashed border-subtle rounded cursor-pointer hover:border-brand-blue bg-surface transition">
                        <svg className="w-6 h-6 text-content-muted mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium text-brand-blue">Select Image (Front)</span>
                        <input id="nidFront" type="file" accept="image/*" className="hidden" onChange={(e) => handleSingleFile("nidFront", "image/*", e)} />
                      </label>
                    )}
                    {fileErrors.nidFront && <p className="text-xs text-status-rejected-text font-medium mt-1.5">{fileErrors.nidFront}</p>}
                  </div>

                  {/* NID Back */}
                  <div className={`p-4 border rounded transition-all ${
                    fileErrors.nidBack ? 'border-red-400 bg-status-rejected-bg' : files.nidBack ? 'border-emerald-300 bg-status-approved-bg' : 'border-subtle bg-app'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-content-primary">NID Back Side <span className="text-status-rejected-text">*</span></span>
                      {files.nidBack ? (
                        <span className="badge-status badge-approved text-[10px]"><span className="badge-dot"></span>Attached</span>
                      ) : (
                        <span className="badge-status badge-rejected text-[10px]"><span className="badge-dot"></span>Required</span>
                      )}
                    </div>
                    {files.nidBack ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-surface rounded border border-subtle">
                        <span className="text-xs text-content-primary font-medium truncate">{files.nidBack.name} ({formatFileSize(files.nidBack.size)})</span>
                        <button type="button" onClick={() => removeSingleFile("nidBack", "nidBack")} className="text-status-rejected-text hover:text-red-700 p-1 text-xs font-medium">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="nidBack" className="flex flex-col items-center justify-center p-4 border border-dashed border-subtle rounded cursor-pointer hover:border-brand-blue bg-surface transition">
                        <svg className="w-6 h-6 text-content-muted mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium text-brand-blue">Select Image (Back)</span>
                        <input id="nidBack" type="file" accept="image/*" className="hidden" onChange={(e) => handleSingleFile("nidBack", "image/*", e)} />
                      </label>
                    )}
                    {fileErrors.nidBack && <p className="text-xs text-status-rejected-text font-medium mt-1.5">{fileErrors.nidBack}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Regulatory Documents ──────── */}
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-subtle">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-brand-navy text-white flex items-center justify-center text-xs font-bold">3</span>
                  <h3 className="text-xs font-medium text-content-secondary uppercase tracking-wide">Regulatory Documents</h3>
                </div>
                <span className="text-xs text-content-muted">PDF format required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Trade License */}
                <div className={`p-4 border rounded transition-all ${
                  fileErrors.tradeLicense ? 'border-red-400 bg-status-rejected-bg' : files.tradeLicense ? 'border-emerald-300 bg-status-approved-bg' : 'border-subtle bg-app'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-content-primary truncate">Trade License <span className="text-status-rejected-text">*</span></span>
                    {files.tradeLicense && <span className="text-[10px] text-status-approved-text font-medium">✓ PDF</span>}
                  </div>
                  {files.tradeLicense ? (
                    <div className="space-y-2">
                      <p className="text-xs text-content-secondary font-medium truncate">{files.tradeLicense.name}</p>
                      <p className="text-[10px] text-content-muted">{formatFileSize(files.tradeLicense.size)}</p>
                      <button type="button" onClick={() => removeSingleFile("tradeLicense", "tradeLicense")}
                        className="text-xs text-status-rejected-text hover:text-red-700 font-medium">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="tradeLicense" className="flex flex-col items-center justify-center p-3 border border-dashed border-subtle rounded cursor-pointer hover:border-brand-blue bg-surface transition text-center">
                      <svg className="w-5 h-5 text-content-muted mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs font-medium text-brand-blue">Upload PDF</span>
                      <input id="tradeLicense" type="file" accept=".pdf" className="hidden" onChange={(e) => handleSingleFile("tradeLicense", ".pdf", e)} />
                    </label>
                  )}
                  {fileErrors.tradeLicense && <p className="text-xs text-status-rejected-text font-medium mt-1.5">{fileErrors.tradeLicense}</p>}
                </div>

                {/* TIN Certificate */}
                <div className={`p-4 border rounded transition-all ${
                  fileErrors.tinCertificate ? 'border-red-400 bg-status-rejected-bg' : files.tinCertificate ? 'border-emerald-300 bg-status-approved-bg' : 'border-subtle bg-app'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-content-primary truncate">TIN Certificate <span className="text-status-rejected-text">*</span></span>
                    {files.tinCertificate && <span className="text-[10px] text-status-approved-text font-medium">✓ PDF</span>}
                  </div>
                  {files.tinCertificate ? (
                    <div className="space-y-2">
                      <p className="text-xs text-content-secondary font-medium truncate">{files.tinCertificate.name}</p>
                      <p className="text-[10px] text-content-muted">{formatFileSize(files.tinCertificate.size)}</p>
                      <button type="button" onClick={() => removeSingleFile("tinCertificate", "tinCertificate")}
                        className="text-xs text-status-rejected-text hover:text-red-700 font-medium">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="tinCertificate" className="flex flex-col items-center justify-center p-3 border border-dashed border-subtle rounded cursor-pointer hover:border-brand-blue bg-surface transition text-center">
                      <svg className="w-5 h-5 text-content-muted mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs font-medium text-brand-blue">Upload PDF</span>
                      <input id="tinCertificate" type="file" accept=".pdf" className="hidden" onChange={(e) => handleSingleFile("tinCertificate", ".pdf", e)} />
                    </label>
                  )}
                  {fileErrors.tinCertificate && <p className="text-xs text-status-rejected-text font-medium mt-1.5">{fileErrors.tinCertificate}</p>}
                </div>

                {/* VAT Certificate */}
                <div className={`p-4 border rounded transition-all ${
                  fileErrors.vatCertificate ? 'border-red-400 bg-status-rejected-bg' : files.vatCertificate ? 'border-emerald-300 bg-status-approved-bg' : 'border-subtle bg-app'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-content-primary truncate">VAT Certificate <span className="text-status-rejected-text">*</span></span>
                    {files.vatCertificate && <span className="text-[10px] text-status-approved-text font-medium">✓ PDF</span>}
                  </div>
                  {files.vatCertificate ? (
                    <div className="space-y-2">
                      <p className="text-xs text-content-secondary font-medium truncate">{files.vatCertificate.name}</p>
                      <p className="text-[10px] text-content-muted">{formatFileSize(files.vatCertificate.size)}</p>
                      <button type="button" onClick={() => removeSingleFile("vatCertificate", "vatCertificate")}
                        className="text-xs text-status-rejected-text hover:text-red-700 font-medium">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="vatCertificate" className="flex flex-col items-center justify-center p-3 border border-dashed border-subtle rounded cursor-pointer hover:border-brand-blue bg-surface transition text-center">
                      <svg className="w-5 h-5 text-content-muted mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs font-medium text-brand-blue">Upload PDF</span>
                      <input id="vatCertificate" type="file" accept=".pdf" className="hidden" onChange={(e) => handleSingleFile("vatCertificate", ".pdf", e)} />
                    </label>
                  )}
                  {fileErrors.vatCertificate && <p className="text-xs text-status-rejected-text font-medium mt-1.5">{fileErrors.vatCertificate}</p>}
                </div>
              </div>

              {/* Additional Regulatory Documents (Optional) */}
              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">
                  Additional Regulatory Documents
                  <span className="ml-2 text-xs font-normal text-content-muted">(Optional)</span>
                </label>
                <p className="text-xs text-content-muted mb-2">Any other supporting documents (PDF, images, ISO certifications, etc.)</p>
                <label htmlFor="additionalDocs"
                  className="flex items-center gap-3 px-4 py-3 border border-dashed border-subtle rounded bg-app cursor-pointer hover:border-brand-blue hover:bg-surface transition-all duration-200">
                  <svg className="w-5 h-5 text-content-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm text-content-secondary font-medium">Click to add additional documents</span>
                  <input id="additionalDocs" type="file" multiple className="hidden" onChange={handleAdditionalDocs} />
                </label>

                {/* List of additional docs */}
                {files.additionalDocs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.additionalDocs.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-app px-4 py-2.5 rounded border border-subtle">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 text-content-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="text-xs text-content-secondary font-medium truncate">{file.name} ({formatFileSize(file.size)})</span>
                        </div>
                        <button type="button" onClick={() => removeAdditionalDoc(index)}
                          className="text-status-rejected-text hover:text-red-700 text-xs font-medium ml-3 flex-shrink-0 transition">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={isSubmitting}
              className="w-full h-9 bg-brand-navy text-white text-sm font-medium rounded hover:bg-slate-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Submitting Application...</span>
                </>
              ) : (
                "Submit Application"
              )}
            </button>

            <p className="text-center text-sm text-content-secondary">
              Already have an account?{" "}
              <button type="button" onClick={() => router.push("/login")} className="text-brand-blue hover:text-blue-700 font-medium">
                Sign in
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
