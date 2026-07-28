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
        alert("Please upload an image file.");
        e.target.value = "";
        return;
      }
    }
    setFiles((prev) => ({ ...prev, [field]: file }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

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
        setSubmitError(err.error?.message || "Registration failed.");
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
          <p className="text-slate-300 text-lg font-medium">Validating invitation...</p>
        </div>
      </main>
    );
  }

  // ─── No Token / Invalid Token ─────────────────────────────
  if (tokenError) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center py-20 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
        <div className="relative z-10 max-w-lg mx-auto w-full animate-scale-in">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {tokenError === "no-token" ? (
              <>
                <h1 className="text-2xl font-black text-navy-900 mb-3">Invitation Required</h1>
                <p className="text-slate-600 mb-2">Employee accounts can only be created through an invitation from your company owner.</p>
                <p className="text-slate-400 text-sm mb-8">Please ask your organization&apos;s master account holder to send you an invitation link.</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-black text-navy-900 mb-3">Invalid Invitation</h1>
                <p className="text-slate-600 mb-8">{tokenError}</p>
              </>
            )}

            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push("/login")}
                className="px-6 py-2.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all shadow-lg">
                Go to Login
              </button>
              <button onClick={() => router.push("/")}
                className="px-6 py-2.5 bg-white text-navy-900 font-semibold rounded-xl border-2 border-slate-200 hover:bg-slate-50 transition-all">
                Home
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─── Success ──────────────────────────────────────────────
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
            <h1 className="text-3xl font-black text-navy-900 mb-3">Welcome to {invitation?.organization_name}!</h1>
            <p className="text-slate-600 mb-8">Your account has been created successfully. You can now log in and start using ProcureNext.</p>
            <button onClick={() => router.push("/home")}
              className="px-8 py-3 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all shadow-lg">
              Go to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── Registration Form ────────────────────────────────────
  return (
    <main className="w-full min-h-screen flex items-center justify-center py-12 px-4 relative overflow-x-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-accent-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-2xl mx-auto w-full animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-slate-200">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-navy-900 mb-1">Create Your Account</h1>
            <p className="text-slate-500">
              Register as a member of <span className="font-bold text-navy-900">{invitation?.organization_name}</span>
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Invitation sent to: <span className="font-medium">{invitation?.email}</span>
            </p>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-navy-900 mb-1.5">Full Name</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-navy-900 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <input type="email" id="email" name="email" value={formData.email} readOnly
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 cursor-not-allowed" />
                <p className="text-xs text-slate-400 mt-1">This email was specified in the invitation and cannot be changed.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-navy-900 mb-1.5">Mobile Phone <span className="text-red-500">*</span></label>
                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter your mobile phone number" required
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
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-2">National ID (NID)</label>
              <div className="grid grid-cols-2 gap-4">
                {(['nidFront', 'nidBack'] as const).map((field) => (
                  <div key={field}>
                    <p className="text-xs text-slate-500 mb-1.5 font-medium">{field === 'nidFront' ? 'Front Side' : 'Back Side'}</p>
                    <label htmlFor={field}
                      className={`flex flex-col items-center justify-center gap-2 px-3 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                        files[field] ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-accent-400 hover:bg-accent-50'
                      }`}>
                      {files[field] ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-xs text-slate-600 text-center truncate w-full font-medium">{files[field]!.name}</span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <span className="text-xs text-slate-500">Upload image</span>
                        </>
                      )}
                      <input id={field} type="file" accept="image/*" className="hidden" onChange={(e) => handleNidFile(field, e)} />
                    </label>
                  </div>
                ))}
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
                  Creating Account...
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
