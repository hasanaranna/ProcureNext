"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTenderPage() {
  const router = useRouter();
  const [sellerDocs, setSellerDocs] = useState<string[]>([]);
  const [newSellerDoc, setNewSellerDoc] = useState("");

  const addSellerDoc = () => {
    const trimmed = newSellerDoc.trim();
    if (!trimmed) return;
    setSellerDocs((prev) => [...prev, trimmed]);
    setNewSellerDoc("");
  };

  const removeSellerDoc = (index: number) => {
    setSellerDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    deadline: "",
    tenderPublicDate: "",
    preBidMeeting: "",
    tenderOpeningDate: "",
    category: "",
    files: [] as File[],
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      // Validate that all files are PDFs
      const validFiles = selectedFiles.filter(
        (file) => file.type === "application/pdf",
      );
      if (validFiles.length !== selectedFiles.length) {
        alert("Only PDF files are allowed");
        e.target.value = "";
        return;
      }
      setFormData((prev) => ({
        ...prev,
        files: validFiles,
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Submit tender to backend
    console.log("Tender submitted:", formData);
    router.push("/home-buyer");
  };

  const handleCancel = () => {
    router.push("/home-buyer");
  };

  return (
    <main
      className="w-full min-h-screen flex items-center justify-center py-20 px-4 relative overflow-x-hidden"
      style={{
        backgroundColor: "#3a4556",
      }}
    >
      <div className="relative z-10 max-w-2xl mx-auto w-full">
        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-2xl p-12 border border-gray-200">
          {/* Header */}
          <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">
            Create New Tender
          </h1>
          <p className="text-lg text-gray-600 mb-8 text-center">
            Fill in the details to publish a new tender
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:border-gray-600 focus:outline-none transition"
              >
                <option value="">Select a category</option>
                <option value="supplies">Supplies</option>
                <option value="equipment">Equipment</option>
                <option value="services">Services</option>
                <option value="construction">Construction</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Tender Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Tender Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter tender title"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter tender description"
                required
                rows={4}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition resize-none"
              />
            </div>

            {/* Budget */}
            <div>
              <label
                htmlFor="budget"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Budget (in BDT)
              </label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Enter budget"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition"
              />
            </div>

            {/* Deadline */}
            <div>
              <label
                htmlFor="deadline"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Deadline
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:border-gray-600 focus:outline-none transition"
              />
            </div>

            {/* Tender Public Date, Pre-Bid Meeting, Tender Opening Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tender Public Date */}
              <div>
                <label
                  htmlFor="tenderPublicDate"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Tender Public Date
                </label>
                <input
                  type="date"
                  id="tenderPublicDate"
                  name="tenderPublicDate"
                  value={formData.tenderPublicDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:border-gray-600 focus:outline-none transition"
                />
              </div>

              {/* Pre-Bid Meeting */}
              <div>
                <label
                  htmlFor="preBidMeeting"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Pre-Bid Meeting
                </label>
                <input
                  type="date"
                  id="preBidMeeting"
                  name="preBidMeeting"
                  value={formData.preBidMeeting}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:border-gray-600 focus:outline-none transition"
                />
              </div>

              {/* Tender Opening Date */}
              <div>
                <label
                  htmlFor="tenderOpeningDate"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Tender Opening Date
                </label>
                <input
                  type="date"
                  id="tenderOpeningDate"
                  name="tenderOpeningDate"
                  value={formData.tenderOpeningDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:border-gray-600 focus:outline-none transition"
                />
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label
                htmlFor="files"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Attachments for Tender Details (PDF only)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-600 transition">
                <input
                  type="file"
                  id="files"
                  name="files"
                  multiple
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="files" className="cursor-pointer">
                  <svg
                    className="w-8 h-8 text-gray-400 mx-auto mb-2"
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
                  <p className="text-gray-700 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">PDF files only</p>
                </label>
              </div>

              {/* Display uploaded files */}
              {formData.files.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Uploaded Files:
                  </p>
                  <div className="space-y-2">
                    {formData.files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-100 p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-5 h-5 text-red-600"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                            <polyline points="13 2 13 9 20 9" />
                          </svg>
                          <span className="text-sm text-gray-800">
                            {file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Documents Required from Seller */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Documents Required from Seller
              </label>

              {/* Existing items */}
              {sellerDocs.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {sellerDocs.map((doc, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between bg-gray-100 px-4 py-2.5 rounded-lg"
                    >
                      <div className="flex items-center gap-2.5">
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm text-gray-800">{doc}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSellerDoc(index)}
                        className="text-gray-400 hover:text-red-500 transition flex-shrink-0 ml-3"
                        aria-label="Remove"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add new item */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSellerDoc}
                  onChange={(e) => setNewSellerDoc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSellerDoc();
                    }
                  }}
                  placeholder="e.g. Company registration certificate"
                  className="flex-1 px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition text-sm"
                />
                <button
                  type="button"
                  onClick={addSellerDoc}
                  className="px-4 py-2.5 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition flex items-center gap-1.5 flex-shrink-0"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6 pb-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background:
                    "linear-gradient(135deg, #4a5668 0%, #3a4556 100%)",
                }}
                className="flex-1 px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1"
              >
                Create Tender
                <span className="text-sm">( 100</span>
                <svg
                  className="w-4 h-4 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">)</span>
              </button>
            </div>

            {/* Token Info */}
            <div className="text-center pt-4 border-t border-gray-300">
              <p className="text-sm text-gray-600 flex items-center justify-center gap-1">
                You currently have{" "}
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  250
                  <svg
                    className="w-4 h-4 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  tokens
                </span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
