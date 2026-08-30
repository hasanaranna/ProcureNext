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
      <main className="w-full min-h-screen flex items-center justify-center py-20 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="relative z-10 max-w-xl mx-auto w-full animate-scale-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-navy-900 mb-3">Application Submitted!</h1>
            <p className="text-slate-600 mb-2">Your master account application has been submitted successfully.</p>
            <p className="text-slate-400 text-sm mb-8">A system administrator will review your documents and approve your account. You will be able to log in once your account is verified.</p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pending Admin Approval
            </div>
            <div>
              <button
                onClick={() => router.push("/login")}
                className="px-8 py-3 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 relative overflow-x-hidden">
      {/* Decorative */}
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-accent-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-accent-400/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-2xl mx-auto w-full animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-slate-200">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-navy-900 mb-1">Create Master Account</h1>
            <p className="text-slate-500">Register as an Owner to manage your organization on ProcureNext</p>
            <p className="text-sm text-slate-400 mt-2">Are you an Employee? Use the invitation sent by your company owner to sign up!</p>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3 animate-fade-in">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Personal & Company Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-navy-900 mb-1.5">Full Name</label>
                  <input type="text" id="name" name="name" value={formData.name} onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
                </div>
                {/* Organization Name */}
                <div>
                  <label htmlFor="organizationName" className="block text-sm font-semibold text-navy-900 mb-1.5">Organization Name <span className="text-red-500">*</span></label>
                  <input type="text" id="organizationName" name="organizationName" value={formData.organizationName} onChange={handleChange}
                    placeholder="Enter your organization name" required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-navy-900 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange}
                    placeholder="you@company.com" required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
                </div>
                {/* Phone Number */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-navy-900 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                  <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange}
                    placeholder="Enter your phone number" required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* NID Number */}
                <div>
                  <label htmlFor="nid" className="block text-sm font-semibold text-navy-900 mb-1.5">National ID Number <span className="text-red-500">*</span></label>
                  <input type="number" id="nid" name="nid" value={formData.nid} onChange={handleChange}
                    placeholder="NID number" required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
                </div>
                {/* Date of Birth */}
                <div>
                  <label htmlFor="date_of_birth" className="block text-sm font-semibold text-navy-900 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                  <input type="date" id="date_of_birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
                </div>
                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-navy-900 mb-1.5">Password <span className="text-red-500">*</span></label>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange}
                    placeholder="Min 8 characters" required minLength={8}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
                </div>
              </div>
            </div>

            {/* ── Section 2: Identity Documents ────────── */}
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                  <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Identity Documents</h3>
                </div>
                <span className="text-xs text-red-500 font-bold">* Both sides mandatory</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-2">
                  National ID (NID) <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-slate-400 ml-2">(Upload clear JPG or PNG images)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NID Front */}
                  <div className={`p-4 border-2 rounded-2xl transition-all ${
                    fileErrors.nidFront ? 'border-red-400 bg-red-50/60' : files.nidFront ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-navy-900">NID Front Side <span className="text-red-500">*</span></span>
                      {files.nidFront ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">✓ Attached</span>
                      ) : (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">Required</span>
                      )}
                    </div>
                    {files.nidFront ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs text-navy-900 font-medium truncate">{files.nidFront.name} ({formatFileSize(files.nidFront.size)})</span>
                        <button type="button" onClick={() => removeSingleFile("nidFront", "nidFront")} className="text-red-500 hover:text-red-700 p-1 text-xs font-bold">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="nidFront" className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-accent-400 bg-white transition">
                        <svg className="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-accent-600">Select Image (Front)</span>
                        <input id="nidFront" type="file" accept="image/*" className="hidden" onChange={(e) => handleSingleFile("nidFront", "image/*", e)} />
                      </label>
                    )}
                    {fileErrors.nidFront && <p className="text-xs text-red-600 font-semibold mt-1.5">{fileErrors.nidFront}</p>}
                  </div>

                  {/* NID Back */}
                  <div className={`p-4 border-2 rounded-2xl transition-all ${
                    fileErrors.nidBack ? 'border-red-400 bg-red-50/60' : files.nidBack ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-navy-900">NID Back Side <span className="text-red-500">*</span></span>
                      {files.nidBack ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">✓ Attached</span>
                      ) : (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">Required</span>
                      )}
                    </div>
                    {files.nidBack ? (
                      <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-xs text-navy-900 font-medium truncate">{files.nidBack.name} ({formatFileSize(files.nidBack.size)})</span>
                        <button type="button" onClick={() => removeSingleFile("nidBack", "nidBack")} className="text-red-500 hover:text-red-700 p-1 text-xs font-bold">
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label htmlFor="nidBack" className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-accent-400 bg-white transition">
                        <svg className="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-accent-600">Select Image (Back)</span>
                        <input id="nidBack" type="file" accept="image/*" className="hidden" onChange={(e) => handleSingleFile("nidBack", "image/*", e)} />
                      </label>
                    )}
                    {fileErrors.nidBack && <p className="text-xs text-red-600 font-semibold mt-1.5">{fileErrors.nidBack}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 3: Regulatory Documents ──────── */}
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold">3</span>
                  <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Regulatory Documents</h3>
                </div>
                <span className="text-xs text-slate-400">PDF format required</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Trade License */}
                <div className={`p-4 border-2 rounded-2xl transition-all ${
                  fileErrors.tradeLicense ? 'border-red-400 bg-red-50/60' : files.tradeLicense ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-navy-900 truncate">Trade License <span className="text-red-500">*</span></span>
                    {files.tradeLicense && <span className="text-[10px] text-emerald-700 font-bold">✓ PDF</span>}
                  </div>
                  {files.tradeLicense ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-700 font-medium truncate">{files.tradeLicense.name}</p>
                      <p className="text-[10px] text-slate-400">{formatFileSize(files.tradeLicense.size)}</p>
                      <button type="button" onClick={() => removeSingleFile("tradeLicense", "tradeLicense")}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="tradeLicense" className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-accent-400 bg-white transition text-center">
                      <svg className="w-5 h-5 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs font-semibold text-accent-600">Upload PDF</span>
                      <input id="tradeLicense" type="file" accept=".pdf" className="hidden" onChange={(e) => handleSingleFile("tradeLicense", ".pdf", e)} />
                    </label>
                  )}
                  {fileErrors.tradeLicense && <p className="text-xs text-red-600 font-semibold mt-1.5">{fileErrors.tradeLicense}</p>}
                </div>

                {/* TIN Certificate */}
                <div className={`p-4 border-2 rounded-2xl transition-all ${
                  fileErrors.tinCertificate ? 'border-red-400 bg-red-50/60' : files.tinCertificate ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-navy-900 truncate">TIN Certificate <span className="text-red-500">*</span></span>
                    {files.tinCertificate && <span className="text-[10px] text-emerald-700 font-bold">✓ PDF</span>}
                  </div>
                  {files.tinCertificate ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-700 font-medium truncate">{files.tinCertificate.name}</p>
                      <p className="text-[10px] text-slate-400">{formatFileSize(files.tinCertificate.size)}</p>
                      <button type="button" onClick={() => removeSingleFile("tinCertificate", "tinCertificate")}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="tinCertificate" className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-accent-400 bg-white transition text-center">
                      <svg className="w-5 h-5 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs font-semibold text-accent-600">Upload PDF</span>
                      <input id="tinCertificate" type="file" accept=".pdf" className="hidden" onChange={(e) => handleSingleFile("tinCertificate", ".pdf", e)} />
                    </label>
                  )}
                  {fileErrors.tinCertificate && <p className="text-xs text-red-600 font-semibold mt-1.5">{fileErrors.tinCertificate}</p>}
                </div>

                {/* VAT Certificate */}
                <div className={`p-4 border-2 rounded-2xl transition-all ${
                  fileErrors.vatCertificate ? 'border-red-400 bg-red-50/60' : files.vatCertificate ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-navy-900 truncate">VAT Certificate <span className="text-red-500">*</span></span>
                    {files.vatCertificate && <span className="text-[10px] text-emerald-700 font-bold">✓ PDF</span>}
                  </div>
                  {files.vatCertificate ? (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-700 font-medium truncate">{files.vatCertificate.name}</p>
                      <p className="text-[10px] text-slate-400">{formatFileSize(files.vatCertificate.size)}</p>
                      <button type="button" onClick={() => removeSingleFile("vatCertificate", "vatCertificate")}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="vatCertificate" className="flex flex-col items-center justify-center p-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-accent-400 bg-white transition text-center">
                      <svg className="w-5 h-5 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs font-semibold text-accent-600">Upload PDF</span>
                      <input id="vatCertificate" type="file" accept=".pdf" className="hidden" onChange={(e) => handleSingleFile("vatCertificate", ".pdf", e)} />
                    </label>
                  )}
                  {fileErrors.vatCertificate && <p className="text-xs text-red-600 font-semibold mt-1.5">{fileErrors.vatCertificate}</p>}
                </div>
              </div>

              {/* Additional Regulatory Documents (Optional) */}
              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-1">
                  Additional Regulatory Documents
                  <span className="ml-2 text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <p className="text-xs text-slate-400 mb-2">Any other supporting documents (PDF, images, ISO certifications, etc.)</p>
                <label htmlFor="additionalDocs"
                  className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-accent-400 hover:bg-accent-50 transition-all duration-300">
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm text-slate-500 font-medium">Click to add additional documents</span>
                  <input id="additionalDocs" type="file" multiple className="hidden" onChange={handleAdditionalDocs} />
                </label>

                {/* List of additional docs */}
                {files.additionalDocs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.additionalDocs.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span className="text-xs text-slate-700 font-medium truncate">{file.name} ({formatFileSize(file.size)})</span>
                        </div>
                        <button type="button" onClick={() => removeAdditionalDoc(index)}
                          className="text-red-500 hover:text-red-700 text-xs font-bold ml-3 flex-shrink-0 transition">
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
              className="w-full py-3.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Submitting Application...</span>
                </>
              ) : (
                "Submit Application"
              )}
            </button>

            <p className="text-center text-sm text-slate-500">
              Already have an account?{" "}
              <button type="button" onClick={() => router.push("/login")} className="text-accent-600 hover:text-accent-700 font-semibold">
                Sign in
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
