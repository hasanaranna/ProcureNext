"use client";

import { useState } from "react";
import { SIGNUP_BACKGROUND_IMAGE } from "@/lib/constants";

interface FileFields {
  nidFront: File | null;
  nidBack: File | null;
}

export default function SignupUserPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [files, setFiles] = useState<FileFields>({
    nidFront: null,
    nidBack: null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Form submitted:", formData, files);
  };

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
        {/* Form Container with Header */}
        <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-2xl p-8 md:p-12 border border-white/30">
          {/* Header */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 text-center">
            Create Your Account
          </h1>
          <p className="text-lg text-gray-700 mb-8 text-center">
            Register as a User of CompanyNameGoesHere with ProcureNext
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
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

            {/* Mobile Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
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

            {/* NID — Front & Back side by side */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                National ID (NID) <span className="text-red-600">*</span>
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
                      required
                      onChange={(e) => handleNidFile("nidFront", e)}
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
                      required
                      onChange={(e) => handleNidFile("nidBack", e)}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 mt-4 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Create Account
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
