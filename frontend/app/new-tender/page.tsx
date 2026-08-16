"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModalShell from "@/components/ModalShell";

const ALL_ROLES = ["Owner", "ProcurementOfficer", "Finance", "Viewer", "TenderReceiver"] as const;
const ROLE_LABELS: Record<string, string> = {
  Owner: "Owner",
  ProcurementOfficer: "Procurement Officer",
  Finance: "Finance",
  Viewer: "Viewer",
  TenderReceiver: "Tender Receiver",
};

interface SellerDoc {
  name: string;
  allowed_roles: string[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function NewTenderPage() {
  const router = useRouter();
  const [sellerDocs, setSellerDocs] = useState<SellerDoc[]>([]);
  const [newSellerDoc, setNewSellerDoc] = useState("");
  const [showAccessConfig, setShowAccessConfig] = useState(false);
  
  const [fileCount, setFileCount] = useState<number | "">("");
  const [customFiles, setCustomFiles] = useState<{name: string, file: File | null}[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Modal State
  const [createdTenderResult, setCreatedTenderResult] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const addSellerDoc = () => {
    const trimmed = newSellerDoc.trim();
    if (!trimmed) return;
    setSellerDocs((prev) => [...prev, { name: trimmed, allowed_roles: ["Owner"] }]);
    setNewSellerDoc("");
  };

  const removeSellerDoc = (index: number) => {
    setSellerDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRole = (docIndex: number, role: string) => {
    if (role === "Owner") return;
    setSellerDocs((prev) => {
      const updated = [...prev];
      const doc = { ...updated[docIndex] };
      if (doc.allowed_roles.includes(role)) {
        doc.allowed_roles = doc.allowed_roles.filter((r) => r !== role);
      } else {
        doc.allowed_roles = [...doc.allowed_roles, role];
      }
      updated[docIndex] = doc;
      return updated;
    });
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
    setFormError(null);
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
    setFormError(null);
  };

  const removeFileSlot = (index: number) => {
    setCustomFiles(prev => {
      const newArray = prev.filter((_, i) => i !== index);
      setFileCount(newArray.length);
      return newArray;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    
    const count = typeof fileCount === "number" ? fileCount : 0;
    if (count > 0) {
      const missingSlots = customFiles.some(cf => !cf.name.trim() || !cf.file);
      if (missingSlots || customFiles.length !== count) {
        setFormError(`Please provide a document title and attach a file for all ${count} document slots.`);
        return;
      }
    }
    
    // Map to the backend schema TenderCreateRequest
    const tenderData = {
      title: formData.title,
      description: formData.description,
      budget_max: parseFloat(formData.budget) || null,
      submission_deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      visibility_type: "Public",
      security_required: false,
      category: formData.category || null,
      tender_public_date: formData.tenderPublicDate ? new Date(formData.tenderPublicDate).toISOString() : null,
      pre_bid_meeting: formData.preBidMeeting ? new Date(formData.preBidMeeting).toISOString() : null,
      tender_opening_date: formData.tenderOpeningDate ? new Date(formData.tenderOpeningDate).toISOString() : null,
      required_seller_docs: sellerDocs.length > 0 ? sellerDocs : null,
    };
    
    const validFiles = customFiles.filter(cf => cf.name.trim() && cf.file);
    const fileNames = validFiles.map(cf => cf.name.trim());
    const filesToUpload = validFiles.map(cf => cf.file);
    
    const data = new FormData();
    data.append('tender_data', JSON.stringify(tenderData));
    data.append('file_names', JSON.stringify(fileNames));
    filesToUpload.forEach(f => {
      if (f) data.append('files', f);
    });
    
    setIsSubmitting(true);
    try {
        const response = await fetch('/api/tenders/buyer/publish-with-documents', {
            method: 'POST',
            body: data,
        });
        
        if (response.ok) {
            const resJson = await response.json().catch(() => null);
            setCreatedTenderResult(resJson);
            setIsSuccessModalOpen(true);
        } else {
            const errorJson = await response.json().catch(() => null);
            setFormError(errorJson?.detail || "Failed to publish tender.");
        }
    } catch (e: any) {
        setFormError(e.message || "Error submitting tender.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/home");
  };

  const inputClass = "w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200";

  return (
    <main className="w-full min-h-screen py-12 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 relative overflow-x-hidden">
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-accent-500/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-2xl mx-auto w-full animate-fade-in">
        {/* Back button */}
        <button onClick={handleCancel} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy-900 to-navy-800 px-8 py-6">
            <h1 className="text-2xl font-black text-white">Create New Tender</h1>
            <p className="text-slate-300 text-sm mt-1">Fill in the details and attach specification documents to publish a new tender</p>
          </div>

          {/* Form Error Alert */}
          {formError && (
            <div className="m-8 mb-0 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3 animate-fade-in text-red-800 text-sm">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="font-bold">Validation Error:</strong> {formError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* ── Section: Tender Details ───────────── */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Tender Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-navy-900 mb-1.5">Category <span className="text-red-500">*</span></label>
                  <select id="category" name="category" value={formData.category} onChange={handleChange} required
                    className={`${inputClass} appearance-none`}>
                    <option value="">Select a category</option>
                    <option value="supplies">Supplies</option>
                    <option value="equipment">Equipment</option>
                    <option value="services">Services</option>
                    <option value="construction">Construction</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="budget" className="block text-sm font-semibold text-navy-900 mb-1.5">Budget Ceiling (BDT) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                    <input type="number" id="budget" name="budget" value={formData.budget} onChange={handleChange} placeholder="Enter budget" required min="0" className={`${inputClass} pl-10`} />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-navy-900 mb-1.5">Tender Title <span className="text-red-500">*</span></label>
                <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} placeholder="Enter tender title" required className={inputClass} />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-navy-900 mb-1.5">Description <span className="text-red-500">*</span></label>
                <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Enter detailed tender requirements, scope of work, and terms..." required rows={4}
                  className={`${inputClass} resize-none`} />
              </div>
            </div>

            {/* ── Section: Key Dates ───────────────── */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold">2</span>
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Key Dates</h3>
              </div>

              <div>
                <label htmlFor="deadline" className="block text-sm font-semibold text-navy-900 mb-1.5">Submission Deadline <span className="text-red-500">*</span></label>
                <input type="date" id="deadline" name="deadline" value={formData.deadline} onChange={handleChange} required className={inputClass} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="tenderPublicDate" className="block text-sm font-semibold text-navy-900 mb-1.5">Public Date <span className="text-red-500">*</span></label>
                  <input type="date" id="tenderPublicDate" name="tenderPublicDate" value={formData.tenderPublicDate} onChange={handleChange} required className={inputClass} />
                </div>
                <div>
                  <label htmlFor="preBidMeeting" className="block text-sm font-semibold text-navy-900 mb-1.5">Pre-Bid Meeting</label>
                  <input type="date" id="preBidMeeting" name="preBidMeeting" value={formData.preBidMeeting} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="tenderOpeningDate" className="block text-sm font-semibold text-navy-900 mb-1.5">Opening Date <span className="text-red-500">*</span></label>
                  <input type="date" id="tenderOpeningDate" name="tenderOpeningDate" value={formData.tenderOpeningDate} onChange={handleChange} required className={inputClass} />
                </div>
              </div>
            </div>

            {/* ── Section: Documents ────────────────── */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center text-xs font-bold">3</span>
                <h3 className="text-sm font-bold text-navy-900 uppercase tracking-wide">Tender Specification Documents</h3>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <label htmlFor="fileCount" className="block text-sm font-semibold text-navy-900 mb-1.5">
                  How many specification files does this tender include?
                </label>
                <input type="number" id="fileCount" name="fileCount" value={fileCount} onChange={handleFileCountChange} placeholder="e.g. 2" min="0" className={`${inputClass} mb-4`} />
                
                {customFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attached Specification Files ({customFiles.length}):</p>
                    {customFiles.map((cf, index) => {
                      const isComplete = cf.name.trim() && cf.file;

                      return (
                        <div
                          key={index}
                          className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                            isComplete ? 'bg-white border-emerald-300 shadow-sm' : 'bg-white border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-navy-900">Document #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeFileSlot(index)}
                              className="text-xs text-red-500 hover:text-red-700 font-semibold"
                            >
                              Remove Slot
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Document Title <span className="text-red-500">*</span></label>
                              <input type="text" value={cf.name} onChange={(e) => updateCustomFile(index, 'name', e.target.value)}
                                placeholder="e.g. Technical Specifications" required
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 transition text-xs" />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-500 mb-1">Upload File <span className="text-red-500">*</span></label>
                              {cf.file ? (
                                <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                                  <span className="text-xs text-emerald-800 font-medium truncate max-w-[150px]">
                                    {cf.file.name} ({formatFileSize(cf.file.size)})
                                  </span>
                                  <label className="cursor-pointer text-[10px] bg-white border border-slate-200 hover:bg-slate-50 text-navy-900 px-2 py-1 rounded font-bold transition">
                                    Change
                                    <input type="file" className="hidden" onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        updateCustomFile(index, 'file', e.target.files[0]);
                                      }
                                    }} />
                                  </label>
                                </div>
                              ) : (
                                <input type="file" onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      updateCustomFile(index, 'file', e.target.files[0]);
                                    }
                                 }} required
                                  className="w-full px-3 py-1 text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 transition" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Documents Required from Seller */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-navy-900">Mandatory Documents Required from Vendors</label>
                  {sellerDocs.length > 0 && (
                    <button type="button" onClick={() => setShowAccessConfig(!showAccessConfig)}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${
                        showAccessConfig
                          ? 'bg-accent-50 text-accent-700 border-accent-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Document Access {showAccessConfig ? '' : '(default)'}
                    </button>
                  )}
                </div>

                {sellerDocs.length > 0 && (
                  <ul className="mb-3 space-y-2">
                    {sellerDocs.map((doc, index) => (
                      <li key={index} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 text-accent-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-navy-900 font-medium">{doc.name}</span>
                          </div>
                          <button type="button" onClick={() => removeSellerDoc(index)}
                            className="text-slate-400 hover:text-red-500 transition flex-shrink-0 ml-3" aria-label="Remove">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Role checkboxes — visible when access config is toggled */}
                        {showAccessConfig && (
                          <div className="px-4 pb-3 pt-1 border-t border-slate-200 bg-white">
                            <p className="text-xs text-slate-400 mb-2">Who can view this document:</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                              {ALL_ROLES.map((role) => (
                                <label key={role} className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${role === "Owner" ? "opacity-60" : ""}`}>
                                  <input
                                    type="checkbox"
                                    checked={role === "Owner" || doc.allowed_roles.includes(role)}
                                    disabled={role === "Owner"}
                                    onChange={() => toggleRole(index, role)}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-accent-600 focus:ring-accent-500 focus:ring-offset-0 disabled:opacity-60"
                                  />
                                  <span className="text-slate-600 font-medium">{ROLE_LABELS[role]}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2">
                  <input type="text" value={newSellerDoc} onChange={(e) => setNewSellerDoc(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSellerDoc(); } }}
                    placeholder="e.g. ISO Certification, Tax Clearance"
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 transition text-sm" />
                  <button type="button" onClick={addSellerDoc}
                    className="px-4 py-2.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold rounded-xl transition flex items-center gap-1.5 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Required Doc
                  </button>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={handleCancel}
                className="flex-1 px-6 py-3.5 bg-slate-100 text-navy-900 font-semibold rounded-xl hover:bg-slate-200 transition border border-slate-200 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Publishing Tender...
                  </>
                ) : (
                  <span>Publish Tender</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tender Published Successfully Modal */}
      <ModalShell
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        maxWidth="max-w-lg"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg ring-8 ring-emerald-50/50">
            <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-black text-navy-900 mb-1">Tender Published!</h2>
          <p className="text-slate-600 text-sm mb-6">
            Your tender has been published and is now open for vendors to submit proposals.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-semibold uppercase">Title</span>
              <span className="text-xs font-bold text-navy-900 truncate max-w-[240px]">{formData.title}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-semibold uppercase">Budget Ceiling</span>
              <span className="text-base font-black text-navy-900">৳ {parseFloat(formData.budget || '0').toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 font-semibold uppercase">Category</span>
              <span className="px-2.5 py-0.5 bg-accent-50 text-accent-700 text-xs font-bold rounded-full border border-accent-200 capitalize">
                {formData.category || 'General'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {createdTenderResult?.tender_id ? (
              <button
                onClick={() => router.push(`/view-my-tender/${createdTenderResult.tender_id}`)}
                className="w-full py-3.5 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition shadow-lg text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Published Tender Workbench
              </button>
            ) : null}

            <button
              onClick={() => router.push("/home")}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold rounded-xl transition border border-slate-200 text-sm"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </ModalShell>
    </main>
  );
}
