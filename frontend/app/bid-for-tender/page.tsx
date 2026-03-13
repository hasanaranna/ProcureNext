'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const tenderDetails = {
  title: 'Office Supplies Tender',
  subtitle:
    'Procurement of office stationery and supplies for Q2 2026. This tender includes bulk paper, writing instruments, filing systems, desk organizers, and other essential office materials. The buyer is looking for competitive pricing with reliable delivery schedules.',
  buyer: 'Acme Corporation',
  files: ['requirements.pdf', 'item_list.pdf'],
};

export default function BidForTenderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    description: '',
    bidAmount: '',
    files: [] as File[],
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(
        (file) => file.type === 'application/pdf'
      );
      if (validFiles.length !== selectedFiles.length) {
        alert('Only PDF files are allowed');
        e.target.value = '';
        return;
      }
      setFormData((prev) => ({
        ...prev,
        files: [...prev.files, ...validFiles],
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
    console.log('Bid submitted:', formData);
    router.push('/home-seller');
  };

  return (
    <main
      className="w-full min-h-screen py-10 px-4"
      style={{ backgroundColor: '#3a4556' }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/home-seller')}
          className="mb-6 flex items-center gap-2 text-gray-300 hover:text-white transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="font-medium">Back to Dashboard</span>
        </button>

        {/* Tender Details Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 mb-8">
          {/* Buyer Badge */}
          <div className="mb-4 flex items-center gap-2">
            <div
              style={{ backgroundColor: '#d1d5db' }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
            >
              🏢
            </div>
            <span
              style={{ backgroundColor: '#374151' }}
              className="rounded-full px-4 py-1 text-white text-xs font-semibold"
            >
              {tenderDetails.buyer}
            </span>
          </div>

          <h1
            style={{ color: '#111827' }}
            className="text-3xl font-bold mb-2"
          >
            {tenderDetails.title}
          </h1>
          <p style={{ color: '#6b7280' }} className="text-base leading-relaxed mb-6">
            {tenderDetails.subtitle}
          </p>

          {/* Attached Files */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Attached Files
            </p>
            <div className="flex flex-wrap gap-2">
              {tenderDetails.files.map((file, index) => (
                <div
                  key={index}
                  style={{ backgroundColor: '#f3f4f6' }}
                  className="rounded-full px-4 py-2 flex items-center gap-2 border border-gray-300"
                >
                  <svg
                    className="w-4 h-4 text-red-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                    <path
                      d="M14 2v6h6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <text
                      x="7"
                      y="19"
                      fontSize="7"
                      fill="white"
                      fontWeight="bold"
                    >
                      PDF
                    </text>
                  </svg>
                  <span
                    style={{ color: '#374151' }}
                    className="text-sm font-medium"
                  >
                    {file}
                  </span>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-semibold transition">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bid Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
          <h2
            style={{ color: '#111827' }}
            className="text-2xl font-bold mb-1 text-center"
          >
            Place Your Bid
          </h2>
          <p className="text-gray-500 text-sm mb-8 text-center">
            Provide your proposal details and bid amount
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Your Proposal
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your proposal, delivery timeline, and any special offers..."
                required
                rows={5}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition resize-none"
              />
            </div>

            {/* Bid Amount */}
            <div>
              <label
                htmlFor="bidAmount"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Bid Amount (in BDT)
              </label>
              <input
                type="number"
                id="bidAmount"
                name="bidAmount"
                value={formData.bidAmount}
                onChange={handleChange}
                placeholder="Enter your bid amount"
                required
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:border-gray-600 focus:outline-none transition"
              />
            </div>

            {/* File Upload */}
            <div>
              <label
                htmlFor="bid-files"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Upload Documents (PDF only)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-600 transition">
                <input
                  type="file"
                  id="bid-files"
                  name="files"
                  multiple
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="bid-files" className="cursor-pointer">
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

              {/* Uploaded Files List */}
              {formData.files.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Your Files:
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

            {/* Buttons */}
            <div className="flex gap-4 pt-6 pb-4">
              <button
                type="button"
                onClick={() => router.push('/home-seller')}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 font-semibold rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background:
                    'linear-gradient(135deg, #4a5668 0%, #3a4556 100%)',
                }}
                className="flex-1 px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition flex items-center justify-center gap-1"
              >
                Submit Bid
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
                You currently have{' '}
                <span className="font-semibold text-gray-800 flex items-center gap-1">
                  180
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
