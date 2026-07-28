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
        alert("Please upload an image file.");
        e.target.value = "";
        return;
      }
      if (isPdf && file.type !== "application/pdf") {
        alert("Please upload a PDF file.");
        e.target.value = "";
        return;
      }
    }
    setFiles((prev) => ({ ...prev, [field]: file }));
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
    setIsSubmitting(true);
    setSubmitError("");

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
        body, // No Content-Type header — browser sets multipart boundary
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

  // ─── File upload component ─────────────────────────
  const FileUploadZone = ({ 
    id, label, sublabel, file, accept, onChangeFn, type = 'single' 
  }: { 
    id: string; label: string; sublabel?: string; file: File | null; accept: string; 
    onChangeFn: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: 'single' | 'image' 
  }) => (
    <div>
      {sublabel && <p className="text-xs text-slate-500 mb-1.5 font-medium">{sublabel}</p>}
      <label
        htmlFor={id}
        className={`flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
          file 
            ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400' 
            : 'border-slate-300 bg-slate-50 hover:border-accent-400 hover:bg-accent-50'
        }`}
      >
        {file ? (
          <>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-xs text-slate-600 text-center truncate w-full font-medium">{file.name}</span>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {type === 'image' ? 'Upload image' : 'Upload PDF'}
            </span>
          </>
        )}
        <input id={id} type="file" accept={accept} className="hidden" onChange={onChangeFn} />
      </label>
    </div>
  );

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
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {submitError}
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
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Identity Documents</h3>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-2">National ID (NID)</label>
                <div className="grid grid-cols-2 gap-4">
                  <FileUploadZone id="nidFront" label="NID Front" sublabel="Front Side" file={files.nidFront} accept="image/*" type="image"
                    onChangeFn={(e) => handleSingleFile("nidFront", "image/*", e)} />
                  <FileUploadZone id="nidBack" label="NID Back" sublabel="Back Side" file={files.nidBack} accept="image/*" type="image"
                    onChangeFn={(e) => handleSingleFile("nidBack", "image/*", e)} />
                </div>
              </div>
            </div>

            {/* ── Section 3: Regulatory Documents ──────── */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold">3</span>
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Regulatory Documents</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-navy-900 mb-2">Trade License</label>
                  <label htmlFor="tradeLicense"
                    className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${files.tradeLicense ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-accent-400'}`}>
                    {files.tradeLicense ? (
                      <>
                        <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-slate-700 truncate font-medium">{files.tradeLicense.name}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-xs text-slate-500">Upload PDF</span>
                      </>
                    )}
                    <input id="tradeLicense" type="file" accept=".pdf" className="hidden" onChange={(e) => handleSingleFile("tradeLicense", ".pdf", e)} />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy-900 mb-2">TIN Certificate</label>
                  <label htmlFor="tinCertificate"
                    className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${files.tinCertificate ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-accent-400'}`}>
                    {files.tinCertificate ? (
                      <>
                        <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-slate-700 truncate font-medium">{files.tinCertificate.name}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-xs text-slate-500">Upload PDF</span>
                      </>
                    )}
                    <input id="tinCertificate" type="file" accept=".pdf" className="hidden" onChange={(e) => handleSingleFile("tinCertificate", ".pdf", e)} />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy-900 mb-2">VAT Certificate</label>
                  <label htmlFor="vatCertificate"
                    className={`flex items-center gap-3 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${files.vatCertificate ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-accent-400'}`}>
                    {files.vatCertificate ? (
                      <>
                        <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-slate-700 truncate font-medium">{files.vatCertificate.name}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-xs text-slate-500">Upload PDF</span>
                      </>
                    )}
                    <input id="vatCertificate" type="file" accept=".pdf" className="hidden" onChange={(e) => handleSingleFile("vatCertificate", ".pdf", e)} />
                  </label>
                </div>
              </div>

              {/* Additional Regulatory Documents (Optional) */}
              <div>
                <label className="block text-sm font-semibold text-navy-900 mb-1">
                  Additional Regulatory Documents
                  <span className="ml-2 text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <p className="text-xs text-slate-400 mb-2">Any other supporting documents (PDF, images, etc.)</p>
                <label htmlFor="additionalDocs"
                  className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 cursor-pointer hover:border-accent-400 hover:bg-accent-50 transition-all duration-300">
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm text-slate-500">Click to add documents</span>
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
                          <span className="text-sm text-slate-700 truncate">{file.name}</span>
                        </div>
                        <button type="button" onClick={() => removeAdditionalDoc(index)}
                          className="text-red-400 hover:text-red-600 text-sm font-semibold ml-3 flex-shrink-0 transition">
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
                  Submitting...
                </>
              ) : (
                "Create Master Account"
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-slate-500 text-sm">
              Already have an account?{" "}
              <a href="/login" className="text-accent-600 font-semibold hover:text-accent-700 transition">Login here</a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
