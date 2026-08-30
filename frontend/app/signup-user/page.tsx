"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface FileFields {
  nidFront: File | null;
  nidBack: File | null;
}

interface InvitationDetails {
  email: string;
  organization_name: string;
  organization_id: number;
  is_valid: boolean;
  status: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function SignupUserContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenError, setTokenError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    nid: "",
    date_of_birth: "",
    password: "",
  });

  const [files, setFiles] = useState<FileFields>({
    nidFront: null,
    nidBack: null,
  });

  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setTokenError("no-token");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/org/invitation-details?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.invitation?.is_valid) {
            setInvitation(data.invitation);
            setFormData((prev) => ({ ...prev, email: data.invitation.email }));
          } else {
            setTokenError(
              data.invitation?.status === "Accepted"
                ? "This invitation has already been used."
                : data.invitation?.status === "Cancelled"
                  ? "This invitation has been cancelled by the organization owner."
                  : "This invitation link has expired."
            );
          }
        } else {
          setTokenError("Invalid invitation link.");
        }
      } catch {
        setTokenError("Unable to validate invitation. Please try again later.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSubmitError("");
  };

  const handleNidFile = (
    field: keyof FileFields,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (!file.type.startsWith("image/")) {
        setFileErrors((prev) => ({ ...prev, [field]: "Please upload an image file (JPG, PNG)." }));
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

  const removeNidFile = (field: keyof FileFields, inputId: string) => {
    setFiles((prev) => ({ ...prev, [field]: null }));
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError("");

    const errors: Record<string, string> = {};
    if (!files.nidFront) errors.nidFront = "NID Front image is required";
    if (!files.nidBack) errors.nidBack = "NID Back image is required";

    if (Object.keys(errors).length > 0) {
      setFileErrors(errors);
      setSubmitError("Please upload both Front and Back sides of your National ID.");
      return;
    }

    setIsSubmitting(true);

    try {
      const body = new FormData();
      body.append("name", formData.name);
      body.append("email", formData.email);
      body.append("phone", formData.phone);
      body.append("nid", formData.nid);
      body.append("date_of_birth", formData.date_of_birth);
      body.append("password", formData.password);
      body.append("token", token || "");

      if (files.nidFront) body.append("nidFront", files.nidFront);
      if (files.nidBack) body.append("nidBack", files.nidBack);

      const res = await fetch("/api/auth/register-user", {
        method: "POST",
        body,
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setSubmitSuccess(true);
      } else {
        const err = await res.json();
        setSubmitError(err.detail || err.error?.message || "Registration failed.");
      }
    } catch {
      setSubmitError("Network error. Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-accent-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-300 text-lg">Validating invitation...</p>
        </div>
      </main>
    );
  }

  // ─── Token error ──────────────────────────────────────────
  if (tokenError) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-navy-900 mb-2">Invitation Error</h2>
          <p className="text-slate-600 mb-6 text-sm">
            {tokenError === "no-token"
              ? "No invitation token found. Please use the link provided in your invitation email."
              : tokenError}
          </p>
          <button onClick={() => router.push("/login")}
            className="w-full py-3 bg-navy-900 text-white font-bold rounded-xl hover:bg-navy-800 transition">
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  // ─── Success state ────────────────────────────────────────
  if (submitSuccess) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-navy-900 mb-2">Account Created!</h2>
          <p className="text-slate-600 mb-6 text-sm">
            You have successfully joined <strong className="text-navy-900">{invitation?.organization_name}</strong>.
          </p>
          <button onClick={() => router.push("/home")}
            className="w-full py-3 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition shadow-lg">
            Go to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // ─── Registration Form ────────────────────────────────────
  return (
    <main className="w-full min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 relative overflow-x-hidden">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-accent-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-accent-400/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-2xl mx-auto w-full animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-slate-200">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-navy-900 mb-1">Join Your Organization</h1>
            <p className="text-slate-500 text-sm">
              Complete your profile to join <strong className="text-navy-900">{invitation?.organization_name}</strong>
            </p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-navy-900 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name" required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-navy-900 mb-1.5">Email Address</label>
                <input type="email" id="email" name="email" value={formData.email} disabled
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-navy-900 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter your phone number" required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
              </div>
              <div>
                <label htmlFor="nid" className="block text-sm font-semibold text-navy-900 mb-1.5">National ID Number <span className="text-red-500">*</span></label>
                <input type="number" id="nid" name="nid" value={formData.nid} onChange={handleChange} placeholder="Enter your NID number" required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date_of_birth" className="block text-sm font-semibold text-navy-900 mb-1.5">Date of Birth <span className="text-red-500">*</span></label>
                <input type="date" id="date_of_birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-navy-900 mb-1.5">Password <span className="text-red-500">*</span></label>
                <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} placeholder="Min 8 characters" required minLength={8}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
              </div>
            </div>

            {/* NID — Front & Back */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-navy-900">
                  National ID (NID) <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-slate-400">JPG or PNG image</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['nidFront', 'nidBack'] as const).map((field) => {
                  const hasError = !!fileErrors[field];
                  const file = files[field];
                  const label = field === 'nidFront' ? 'Front Side' : 'Back Side';

                  return (
                    <div key={field} className={`p-4 border-2 rounded-2xl transition-all ${
                      hasError ? 'border-red-400 bg-red-50/60' : file ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-navy-900">{label} <span className="text-red-500">*</span></span>
                        {file ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">✓ Attached</span>
                        ) : (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">Required</span>
                        )}
                      </div>

                      {file ? (
                        <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200">
                          <span className="text-xs text-navy-900 font-medium truncate">{file.name} ({formatFileSize(file.size)})</span>
                          <button type="button" onClick={() => removeNidFile(field, field)} className="text-red-500 hover:text-red-700 p-1 text-xs font-bold">
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label htmlFor={field} className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-accent-400 bg-white transition">
                          <svg className="w-6 h-6 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-accent-600">Select Image ({label})</span>
                          <input id={field} type="file" accept="image/*" className="hidden" onChange={(e) => handleNidFile(field, e)} />
                        </label>
                      )}
                      {hasError && <p className="text-xs text-red-600 font-semibold mt-1.5">{fileErrors[field]}</p>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Creating Account...</span>
                </>
              ) : (
                "Create Account"
              )}
            </button>

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

export default function SignupUserPage() {
  return (
    <Suspense fallback={
      <main className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-accent-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-300 text-lg">Loading...</p>
        </div>
      </main>
    }>
      <SignupUserContent />
    </Suspense>
  );
}
