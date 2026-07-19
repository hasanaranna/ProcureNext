"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTenderPage() {
  const router = useRouter();
  const [sellerDocs, setSellerDocs] = useState<string[]>([]);
  const [newSellerDoc, setNewSellerDoc] = useState("");
  
  const [fileCount, setFileCount] = useState<number | "">("");
  const [customFiles, setCustomFiles] = useState<{name: string, file: File | null}[]>([]);

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

  const handleFileCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
        setFileCount("");
        setCustomFiles([]);
        return;
    }
    const count = parseInt(val);
    if (isNaN(count) || count < 0) return;
    
    setFileCount(count);
    setCustomFiles(prev => {
      const newArray = [...prev];
      if (count > newArray.length) {
        for (let i = newArray.length; i < count; i++) {
          newArray.push({ name: "", file: null });
        }
      } else if (count < newArray.length) {
        newArray.length = count;
      }
      return newArray;
    });
  };

  const updateCustomFile = (index: number, field: 'name' | 'file', value: any) => {
    setCustomFiles(prev => {
      const newArray = [...prev];
      newArray[index] = { ...newArray[index], [field]: value };
      return newArray;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const count = typeof fileCount === "number" ? fileCount : 0;
    const validFiles = customFiles.filter(cf => cf.name.trim() && cf.file);
    if (validFiles.length !== count) {
      alert(`Please ensure all ${count} files have a custom name and a file attached.`);
      return;
    }
    
    // Map to the backend schema TenderCreateRequest
    const tenderData = {
      title: formData.title,
      description: formData.description,
      budget_max: parseFloat(formData.budget) || null,
      submission_deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      visibility_type: "Public",
      security_required: false
    };
    
    const fileNames = validFiles.map(cf => cf.name.trim());
    const filesToUpload = validFiles.map(cf => cf.file);
    
    const data = new FormData();
    data.append('tender_data', JSON.stringify(tenderData));
    data.append('file_names', JSON.stringify(fileNames));
    filesToUpload.forEach(f => {
      if (f) data.append('files', f);
    });
    
    try {
        // Call the Next.js API proxy which automatically attaches the HttpOnly cookie token
        const response = await fetch('/api/tenders/buyer/publish-with-documents', {
            method: 'POST',
            body: data,
        });
        
        if (response.ok) {
            console.log("Tender published successfully!");
            router.push("/home");
        } else {
            const errorText = await response.text();
            console.error("Failed to publish tender:", errorText);
            alert("Failed to publish tender.");
        }
    } catch (e) {
        console.error("Error submitting tender:", e);
        alert("Error submitting tender.");
    }
  };

  const handleCancel = () => {
    router.push("/home");
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

            {/* Dynamic File Uploads */}
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <label
                htmlFor="fileCount"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                How many files does this tender have?
              </label>
              <input
                type="number"
                id="fileCount"
                name="fileCount"
                value={fileCount}
                onChange={handleFileCountChange}
                placeholder="e.g. 3"
                min="0"
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition mb-6"
              />
              
              {customFiles.length > 0 && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-700">Configure your files:</p>
                  {customFiles.map((cf, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">File Name {index + 1}</label>
                        <input
                          type="text"
                          value={cf.name}
                          onChange={(e) => updateCustomFile(index, 'name', e.target.value)}
                          placeholder="e.g. Technical Specifications"
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition text-sm"
                          required
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Select Document</label>
                        <input
                          type="file"
                          onChange={(e) => {
                             if (e.target.files && e.target.files[0]) {
                               updateCustomFile(index, 'file', e.target.files[0]);
                             }
                          }}
                          className="w-full px-3 py-1.5 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition"
                          required
                        />
                      </div>
                    </div>
                  ))}
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
