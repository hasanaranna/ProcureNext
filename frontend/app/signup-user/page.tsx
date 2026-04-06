"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SIGNUP_BACKGROUND_IMAGE } from "@/lib/constants";

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
      <main
        className="w-full min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#374151" }}
      >
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-white mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-300 text-lg">Validating invitation...</p>
        </div>
      </main>
    );
  }

  // ─── No Token / Invalid Token ─────────────────────────────
  if (tokenError) {
    return (
      <main
        className="w-full min-h-screen flex items-center justify-center py-20 px-4"
        style={{
          backgroundImage: `url("${SIGNUP_BACKGROUND_IMAGE}")`,
          backgroundAttachment: "fixed",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#374151",
        }}
      >
        <div className="relative z-10 max-w-lg mx-auto w-full">
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-2xl p-8 md:p-12 border border-white/30 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#fee2e2' }}>
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            {tokenError === "no-token" ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Invitation Required
                </h1>
                <p className="text-gray-600 mb-2">
                  Employee accounts can only be created through an invitation from your company owner.
                </p>
                <p className="text-gray-500 text-sm mb-8">
                  Please ask your organization&apos;s master account holder to send you an invitation link.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  Invalid Invitation
                </h1>
                <p className="text-gray-600 mb-8">{tokenError}</p>
              </>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push("/login")}
                className="px-6 py-2.5 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all shadow-lg"
              >
                Go to Login
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-6 py-2.5 bg-white text-gray-700 font-semibold rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-all"
              >
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
      <main
        className="w-full min-h-screen flex items-center justify-center py-20 px-4"
        style={{
          backgroundImage: `url("${SIGNUP_BACKGROUND_IMAGE}")`,
          backgroundAttachment: "fixed",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#374151",
        }}
      >
        <div className="relative z-10 max-w-xl mx-auto w-full">
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-2xl p-8 md:p-12 border border-white/30 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#d1fae5' }}>
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Welcome to {invitation?.organization_name}!
            </h1>
            <p className="text-gray-600 mb-8">
              Your account has been created successfully. You can now log in and start using ProcureNext.
            </p>
            <button
              onClick={() => router.push("/home")}
              className="px-8 py-3 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all shadow-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── Registration Form ────────────────────────────────────
  return (
    <main
      className="w-full min-h-screen flex items-center justify-center py-20 px-4 relative overflow-x-hidden"
      style={{
        backgroundImage: `url("${SIGNUP_BACKGROUND_IMAGE}")`,
        backgroundAttachment: "fixed",
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#374151",
      }}
    >
      <div className="relative z-10 max-w-2xl mx-auto w-full">
        <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-2xl p-8 md:p-12 border border-white/30">
          {/* Header */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 text-center">
            Create Your Account
          </h1>
          <p className="text-lg text-gray-700 mb-2 text-center">
            Register as a member of{" "}
            <span className="font-bold text-gray-900">{invitation?.organization_name}</span>
          </p>
          <p className="text-sm text-gray-500 mb-8 text-center">
            Invitation sent to: <span className="font-medium">{invitation?.email}</span>
          </p>

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-700 text-sm">
              {submitError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>

            {/* Email (pre-filled, read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                Email Address <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                This email was specified in the invitation and cannot be changed.
              </p>
            </div>

            {/* Mobile Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-800 mb-2">
                Mobile Phone <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your mobile phone number"
                required
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>

            {/* NID Number */}
            <div>
              <label htmlFor="nid" className="block text-sm font-semibold text-gray-800 mb-2">
                National ID Number <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                id="nid"
                name="nid"
                value={formData.nid}
                onChange={handleChange}
                placeholder="Enter your NID number"
                required
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-semibold text-gray-800 mb-2">
                Date of Birth <span className="text-red-600">*</span>
              </label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                Password <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password (min 8 characters)"
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>

            {/* NID — Front & Back side by side */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                National ID (NID)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 mb-1 font-medium">Front Side</p>
                  <label
                    htmlFor="nidFront"
                    className="flex flex-col items-center justify-center gap-1 px-3 py-4 border-2 border-dashed border-gray-400 rounded-lg bg-white/80 cursor-pointer hover:border-gray-600 transition"
                  >
                    {files.nidFront ? (
                      <>
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-gray-700 text-center truncate w-full">
                          {files.nidFront.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-500">Upload image</span>
                      </>
                    )}
                    <input id="nidFront" type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleNidFile("nidFront", e)} />
                  </label>
                </div>

                <div>
                  <p className="text-xs text-gray-600 mb-1 font-medium">Back Side</p>
                  <label
                    htmlFor="nidBack"
                    className="flex flex-col items-center justify-center gap-1 px-3 py-4 border-2 border-dashed border-gray-400 rounded-lg bg-white/80 cursor-pointer hover:border-gray-600 transition"
                  >
                    {files.nidBack ? (
                      <>
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-gray-700 text-center truncate w-full">
                          {files.nidBack.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-500">Upload image</span>
                      </>
                    )}
                    <input id="nidBack" type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleNidFile("nidBack", e)} />
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-4 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
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

            {/* Login Link */}
            <p className="text-center text-gray-700 text-sm mt-4">
              Already have an account?{" "}
              <a href="/login" className="text-gray-800 font-semibold hover:text-gray-900 transition">
                Login here
              </a>
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
      <main className="w-full min-h-screen flex items-center justify-center" style={{ backgroundColor: "#374151" }}>
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-white mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-300 text-lg">Loading...</p>
        </div>
      </main>
    }>
      <SignupUserContent />
    </Suspense>
  );
}
