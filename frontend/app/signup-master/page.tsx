"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SIGNUP_BACKGROUND_IMAGE } from "@/lib/constants";

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

      const res = await fetch("/api/auth/register-master", {
        method: "POST",
        body, // No Content-Type header — browser sets multipart boundary
      });

      if (res.ok) {
        const data = await res.json();
        // Store tokens
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

  // Success state
  if (submitSuccess) {
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
        <div className="relative z-10 max-w-xl mx-auto w-full">
          <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-2xl p-8 md:p-12 border border-white/30 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#d1fae5' }}>
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Application Submitted!
            </h1>
            <p className="text-gray-600 mb-2">
              Your master account application has been submitted successfully.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              A system administrator will review your documents and approve your account.
              You will be able to log in once your account is verified.
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pending Admin Approval
            </div>
            <div className="mt-8">
              <button
                onClick={() => router.push("/login")}
                className="px-8 py-3 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl"
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
            Create Master Account
          </h1>
          <p className="text-lg text-gray-700 mb-4 text-center">
            Register as an Owner to manage your organization on ProcureNext
          </p>
          <p className="text-sm text-gray-600 mb-8 text-center">
            Are you an Employee? Use the invitation sent by your company owner
            to sign up!
          </p>

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-700 text-sm">
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
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

            {/* Organization Name */}
            <div>
              <label
                htmlFor="organizationName"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Organization Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleChange}
                placeholder="Enter your organization name"
                required
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Email Address <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                required
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Phone Number <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                required
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
              />
            </div>

            {/* NID Number */}
            <div>
              <label
                htmlFor="nid"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
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
              <label
                htmlFor="date_of_birth"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
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
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
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

            {/* Divider */}
            <div className="border-t border-gray-300 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-4">
                Identity & Regulatory Documents
              </p>
            </div>

            {/* NID — Front & Back side by side */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                National ID (NID)
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* NID Front */}
                <div>
                  <p className="text-xs text-gray-600 mb-1 font-medium">
                    Front Side
                  </p>
                  <label
                    htmlFor="nidFront"
                    className="flex flex-col items-center justify-center gap-1 px-3 py-4 border-2 border-dashed border-gray-400 rounded-lg bg-white/80 cursor-pointer hover:border-gray-600 transition"
                  >
                    {files.nidFront ? (
                      <>
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-xs text-gray-700 text-center truncate w-full text-center">
                          {files.nidFront.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-6 h-6 text-gray-400"
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
                        <span className="text-xs text-gray-500">
                          Upload image
                        </span>
                      </>
                    )}
                    <input
                      id="nidFront"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleSingleFile("nidFront", "image/*", e)
                      }
                    />
                  </label>
                </div>

                {/* NID Back */}
                <div>
                  <p className="text-xs text-gray-600 mb-1 font-medium">
                    Back Side
                  </p>
                  <label
                    htmlFor="nidBack"
                    className="flex flex-col items-center justify-center gap-1 px-3 py-4 border-2 border-dashed border-gray-400 rounded-lg bg-white/80 cursor-pointer hover:border-gray-600 transition"
                  >
                    {files.nidBack ? (
                      <>
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-xs text-gray-700 text-center truncate w-full text-center">
                          {files.nidBack.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-6 h-6 text-gray-400"
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
                        <span className="text-xs text-gray-500">
                          Upload image
                        </span>
                      </>
                    )}
                    <input
                      id="nidBack"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleSingleFile("nidBack", "image/*", e)
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Trade License */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Trade License
              </label>
              <label
                htmlFor="tradeLicense"
                className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-400 rounded-lg bg-white/80 cursor-pointer hover:border-gray-600 transition"
              >
                {files.tradeLicense ? (
                  <>
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                    </svg>
                    <span className="text-sm text-gray-700 truncate">
                      {files.tradeLicense.name}
                    </span>
                    <svg
                      className="w-5 h-5 text-green-600 ml-auto flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-sm text-gray-500">Upload PDF</span>
                  </>
                )}
                <input
                  id="tradeLicense"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleSingleFile("tradeLicense", ".pdf", e)}
                />
              </label>
            </div>

            {/* TIN Certificate */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                TIN Certificate
              </label>
              <label
                htmlFor="tinCertificate"
                className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-400 rounded-lg bg-white/80 cursor-pointer hover:border-gray-600 transition"
              >
                {files.tinCertificate ? (
                  <>
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                    </svg>
                    <span className="text-sm text-gray-700 truncate">
                      {files.tinCertificate.name}
                    </span>
                    <svg
                      className="w-5 h-5 text-green-600 ml-auto flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-sm text-gray-500">Upload PDF</span>
                  </>
                )}
                <input
                  id="tinCertificate"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) =>
                    handleSingleFile("tinCertificate", ".pdf", e)
                  }
                />
              </label>
            </div>

            {/* VAT Certificate */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                VAT Certificate
              </label>
              <label
                htmlFor="vatCertificate"
                className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-400 rounded-lg bg-white/80 cursor-pointer hover:border-gray-600 transition"
              >
                {files.vatCertificate ? (
                  <>
                    <svg
                      className="w-5 h-5 text-red-600 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                    </svg>
                    <span className="text-sm text-gray-700 truncate">
                      {files.vatCertificate.name}
                    </span>
                    <svg
                      className="w-5 h-5 text-green-600 ml-auto flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-sm text-gray-500">Upload PDF</span>
                  </>
                )}
                <input
                  id="vatCertificate"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) =>
                    handleSingleFile("vatCertificate", ".pdf", e)
                  }
                />
              </label>
            </div>

            {/* Additional Regulatory Documents (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Additional Regulatory Documents
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (Optional)
                </span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Any other supporting documents (PDF, images, etc.)
              </p>
              <label
                htmlFor="additionalDocs"
                className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg bg-white/70 cursor-pointer hover:border-gray-500 transition"
              >
                <svg
                  className="w-5 h-5 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-sm text-gray-500">
                  Click to add documents
                </span>
                <input
                  id="additionalDocs"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleAdditionalDocs}
                />
              </label>

              {/* List of additional docs */}
              {files.additionalDocs.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.additionalDocs.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-white/80 px-3 py-2 rounded-lg border border-gray-300"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <svg
                          className="w-4 h-4 text-gray-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                          />
                        </svg>
                        <span className="text-sm text-gray-700 truncate">
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAdditionalDoc(index)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium ml-3 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-4 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                "Create Master Account"
              )}
            </button>

            {/* Login Link */}
            <p className="text-center text-gray-700 text-sm mt-4">
              Already have an account?{" "}
              <a
                href="/login"
                className="text-gray-800 font-semibold hover:text-gray-900 transition"
              >
                Login here
              </a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
