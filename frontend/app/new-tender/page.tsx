"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ManageTokensModal from "@/components/ManageTokensModal";
import ModalShell from "@/components/ModalShell";
import { parseApiError, pollTenderPdfJob } from "@/lib/tenderPdf";
import {
  clearTenderDraft,
  loadInitialTenderFormState,
  saveTenderDraft,
} from "@/lib/tenderDraft";

const EMPTY_FORM_DATA = {
  title: "",
  description: "",
  procurementNature: "Goods",
  procurementMethod: "OTM",
  eligibilityOfTenderer: "",
  category: "construction",
  budget: "",
  deadline: "",
  tenderPublicDate: "",
  preBidMeeting: "",
  tenderOpeningDate: "",
};

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

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export default function NewTenderPage() {
  const router = useRouter();
  const [initialFormState] = useState(() => loadInitialTenderFormState(EMPTY_FORM_DATA));
  const [sellerDocs, setSellerDocs] = useState<SellerDoc[]>(initialFormState.sellerDocs);
  const [newSellerDoc, setNewSellerDoc] = useState("");
  const [showAccessConfig, setShowAccessConfig] = useState(initialFormState.showAccessConfig);
  
  const [fileCount, setFileCount] = useState<number | "">(initialFormState.fileCount);
  const [customFiles, setCustomFiles] = useState<{name: string, file: File | null}[]>(
    initialFormState.customFiles,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishingPdf, setIsPublishingPdf] = useState(false);
  const [pdfJobMessage, setPdfJobMessage] = useState<string | null>(null);

  // PDF Extraction & AI state
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [localFormRestoredMessage, setLocalFormRestoredMessage] = useState<string | null>(
    initialFormState.restoredMessage,
  );
  const [extractedEmbedding, setExtractedEmbedding] = useState<number[] | null>(
    initialFormState.extractedEmbedding,
  );
  const skipLocalSaveRef = useRef(false);

  // Success Modal State
  const [createdTenderResult, setCreatedTenderResult] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  // Token monetization state
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [tenderPublishCost, setTenderPublishCost] = useState<number>(50);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [showManageTokens, setShowManageTokens] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [formData, setFormData] = useState(initialFormState.formData);

  // FR-08: Packaging, Bid Bond & Visibility State
  const [packageType, setPackageType] = useState<"SingleItem" | "PackagedLots">("SingleItem");
  const [bidBondAmount, setBidBondAmount] = useState<string>("");
  const [visibilityType, setVisibilityType] = useState<"Public" | "Exclusive">("Public");
  const [scheduledPublishAt, setScheduledPublishAt] = useState<string>("");
  const [tenderItems, setTenderItems] = useState<{
    lot_number: string;
    item_name: string;
    quantity: number;
    unit_of_measure: string;
    estimated_unit_price: string;
    specifications: string;
  }[]>([
    { lot_number: "LOT-1", item_name: "", quantity: 1, unit_of_measure: "Units", estimated_unit_price: "", specifications: "" }
  ]);

  const handleAddLotItem = () => {
    setTenderItems(prev => [
      ...prev,
      {
        lot_number: `LOT-${prev.length + 1}`,
        item_name: "",
        quantity: 1,
        unit_of_measure: "Units",
        estimated_unit_price: "",
        specifications: ""
      }
    ]);
  };

  const handleRemoveLotItem = (index: number) => {
    if (tenderItems.length <= 1) return;
    setTenderItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLotItem = (index: number, field: string, value: any) => {
    setTenderItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const clearFormAndLocalSave = () => {
    skipLocalSaveRef.current = true;
    clearTenderDraft();
    setFormData({ ...EMPTY_FORM_DATA });
    setPackageType("SingleItem");
    setBidBondAmount("");
    setVisibilityType("Public");
    setScheduledPublishAt("");
    setTenderItems([
      { lot_number: "LOT-1", item_name: "", quantity: 1, unit_of_measure: "Units", estimated_unit_price: "", specifications: "" }
    ]);
    setSellerDocs([]);
    setFileCount(1);
    setCustomFiles([{ name: "", file: null }]);
    setExtractedEmbedding(null);
    setPdfSuccessMessage(null);
    setLocalFormRestoredMessage(null);
    setShowAccessConfig(false);
  };

  useEffect(() => {
    if (skipLocalSaveRef.current) {
      skipLocalSaveRef.current = false;
      return;
    }

    const hasContent =
      formData.title.trim() ||
      formData.description.trim() ||
      formData.budget.trim() ||
      sellerDocs.length > 0 ||
      customFiles.some((f) => f.name.trim());

    if (!hasContent) {
      clearTenderDraft();
      return;
    }

    saveTenderDraft({
      formData,
      sellerDocs,
      fileCount,
      customFileNames: customFiles.map((f) => f.name),
      extractedEmbedding,
      showAccessConfig,
    });
  }, [
    formData,
    sellerDocs,
    fileCount,
    customFiles,
    extractedEmbedding,
    showAccessConfig,
  ]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('org_token_balance');
      if (cached !== null && !isNaN(Number(cached))) {
        setTokenBalance(Number(cached));
        setLoadingTokens(false);
      }
    } catch { }

    const loadTokensAndPricing = async () => {
      try {
        const [balRes, priceRes] = await Promise.all([
          fetch('/api/payments/balance'),
          fetch('/api/payments/pricing'),
        ]);

        if (balRes.ok) {
          const balData = await balRes.json();
          setTokenBalance(balData.credit_balance);
          try {
            localStorage.setItem('org_token_balance', balData.credit_balance.toString());
          } catch { }
        }

        if (priceRes.ok) {
          const priceData = await priceRes.json();
          setTenderPublishCost(priceData.tender_publish_cost);
        }
      } catch (err) {
        console.error('Error fetching token info:', err);
      } finally {
        setLoadingTokens(false);
      }
    };

    loadTokensAndPricing();
  }, []);

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

  const refreshTokenBalance = async () => {
    try {
      const balRes = await fetch("/api/payments/balance");
      if (balRes.ok) {
        const balData = await balRes.json();
        setTokenBalance(balData.credit_balance);
        localStorage.setItem("org_token_balance", balData.credit_balance.toString());
      }
    } catch (err) {
      console.error("Error refreshing token balance:", err);
    }
  };

  const handlePdfFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setFormError("Please select a valid PDF file.");
      return;
    }

    setIsExtractingPdf(true);
    setPdfSuccessMessage(null);
    setFormError(null);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/tenders/extract-from-pdf", {
        method: "POST",
        body: uploadData,
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res, "Failed to extract data from PDF."));
      }

      const data = await res.json();

      setFormData({
        title: data.title || "",
        description: data.description || "",
        procurementNature: data.procurement_nature || "Goods",
        procurementMethod: data.procurement_method || "OTM",
        eligibilityOfTenderer: data.eligibility_of_tenderer || "",
        category: data.category || "construction",
        budget: data.budget_max ? data.budget_max.toString() : "",
        deadline: formatDateForInput(data.submission_deadline),
        tenderPublicDate: formatDateForInput(data.tender_public_date),
        preBidMeeting: formatDateForInput(data.pre_bid_meeting),
        tenderOpeningDate: formatDateForInput(data.tender_opening_date),
      });

      if (data.embedding && Array.isArray(data.embedding)) {
        setExtractedEmbedding(data.embedding);
      }

      // Attach this PDF into document slot #1
      setFileCount(1);
      setCustomFiles([
        {
          name: file.name.replace(/\.pdf$/i, "").replace(/_/g, " "),
          file: file,
        }
      ]);

      setPdfSuccessMessage(
        `Form fields populated from "${(data.title || "tender notice").substring(0, 60)}${(data.title || "").length > 60 ? "..." : ""}". Review the details below before publishing.`
      );
    } catch (err: any) {
      setFormError(err.message || "Error processing PDF notice.");
    } finally {
      setIsExtractingPdf(false);
      e.target.value = "";
    }
  };

  // ── Handle 1-Click PDF Creation ──────────────────────────────────────────
  const handleDirect1ClickCreate = async (file: File) => {
    if (tokenBalance < tenderPublishCost) {
      setTokenError(`Insufficient tokens. Publishing this tender requires ${tenderPublishCost} tokens, but your organization only has ${tokenBalance} tokens.`);
      setShowManageTokens(true);
      return;
    }

    setIsPublishingPdf(true);
    setIsSubmitting(true);
    setFormError(null);
    setPdfSuccessMessage(null);
    setPdfJobMessage("Uploading PDF and starting processing...");

    try {
      const directData = new FormData();
      directData.append("file", file);

      const res = await fetch("/api/tenders/buyer/create-from-pdf", {
        method: "POST",
        body: directData,
      });

      if (res.status === 202) {
        const job = await res.json();
        if (!job?.task_id) {
          throw new Error("Server did not return a processing job id.");
        }

        setPdfJobMessage("Extracting notice details and publishing tender...");
        const result = await pollTenderPdfJob(job.task_id);
        setCreatedTenderResult(result);
        clearFormAndLocalSave();
        await refreshTokenBalance();
        setPdfJobMessage(null);
        setIsSuccessModalOpen(true);
        return;
      }

      if (res.ok) {
        const resJson = await res.json().catch(() => null);
        if (resJson) {
          setCreatedTenderResult(resJson);
        }
        clearFormAndLocalSave();
        await refreshTokenBalance();
        setIsSuccessModalOpen(true);
        return;
      }

      const errorMsg = await parseApiError(res, "Failed to publish tender from PDF.");
      setFormError(errorMsg);
      if (res.status === 400 && errorMsg.toLowerCase().includes("token")) {
        setShowManageTokens(true);
      }
    } catch (e: any) {
      setFormError(e.message || "Error creating tender from PDF.");
    } finally {
      setIsPublishingPdf(false);
      setIsSubmitting(false);
      setPdfJobMessage(null);
    }
  };

  const buildTenderPayload = () => {
    const validItems = tenderItems
      .filter(ti => ti.item_name.trim())
      .map(ti => ({
        lot_number: ti.lot_number.trim() || "LOT-1",
        item_name: ti.item_name.trim(),
        specifications: ti.specifications.trim() || null,
        quantity: Number(ti.quantity) || 1,
        unit_of_measure: ti.unit_of_measure.trim() || "Units",
        estimated_unit_price: ti.estimated_unit_price ? parseFloat(ti.estimated_unit_price) : null
      }));

    return {
      title: formData.title,
      description: formData.description,
      procurement_nature: formData.procurementNature || "Goods",
      procurement_method: formData.procurementMethod || "OTM",
      eligibility_of_tenderer: formData.eligibilityOfTenderer || null,
      package_type: packageType,
      budget_max: parseFloat(formData.budget) || null,
      bid_bond_amount: parseFloat(bidBondAmount) || 0.0,
      submission_deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      visibility_type: visibilityType,
      security_required: Boolean(parseFloat(bidBondAmount) > 0),
      category: formData.category || null,
      tender_public_date: formData.tenderPublicDate ? new Date(formData.tenderPublicDate).toISOString() : null,
      pre_bid_meeting: formData.preBidMeeting ? new Date(formData.preBidMeeting).toISOString() : null,
      tender_opening_date: formData.tenderOpeningDate ? new Date(formData.tenderOpeningDate).toISOString() : null,
      scheduled_publish_at: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : null,
      required_seller_docs: sellerDocs.length > 0 ? sellerDocs : null,
      embedding: extractedEmbedding,
      items: validItems.length > 0 ? validItems : null,
    };
  };

  const buildTenderFormData = () => {
    const tenderData = buildTenderPayload();
    const validFiles = customFiles.filter((cf) => cf.name.trim() && cf.file);
    const data = new FormData();
    data.append("tender_data", JSON.stringify(tenderData));
    data.append("file_names", JSON.stringify(validFiles.map((cf) => cf.name.trim())));
    validFiles.forEach((cf) => {
      if (cf.file) data.append("files", cf.file);
    });
    return data;
  };

  const handleSaveDraft = async () => {
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError("Title is required to save a draft.");
      return;
    }

    setIsSavingDraft(true);
    try {
      const response = await fetch("/api/tenders/buyer/draft-with-documents", {
        method: "POST",
        body: buildTenderFormData(),
      });

      if (response.ok) {
        const resJson = await response.json().catch(() => null);
        clearFormAndLocalSave();
        if (resJson?.tender_id) {
          router.push(`/view-my-tender/${resJson.tender_id}`);
        } else {
          router.push("/home");
        }
        return;
      }

      setFormError(await parseApiError(response, "Failed to save draft."));
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Error saving draft.");
    } finally {
      setIsSavingDraft(false);
    }
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

    if (tokenBalance < tenderPublishCost) {
      setTokenError(`Insufficient tokens. Publishing this tender requires ${tenderPublishCost} tokens, but your organization only has ${tokenBalance} tokens.`);
      setShowManageTokens(true);
      return;
    }

    const validItems = tenderItems.filter(ti => ti.item_name.trim());
    if (packageType === "PackagedLots" && validItems.length < 2) {
      setFormError("Packaged lots tenders must include at least two items/lots (e.g. Cement and Steel Rod).");
      return;
    }

    const data = buildTenderFormData();
    setIsSubmitting(true);
    setFormError(null);
    try {
        const response = await fetch('/api/tenders/buyer/publish-with-documents', {
            method: 'POST',
            body: data,
        });
        
        if (response.ok) {
            const resJson = await response.json().catch(() => null);
            setCreatedTenderResult(resJson);
            clearFormAndLocalSave();
            await refreshTokenBalance();
            setIsSuccessModalOpen(true);
        } else {
            const errorMsg = await parseApiError(response, "Failed to publish tender.");
            setFormError(errorMsg);
            if (response.status === 400 && errorMsg.toLowerCase().includes('token')) {
                setShowManageTokens(true);
            }
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

  const inputClass = "w-full h-9 px-3 py-1.5 border border-subtle rounded bg-surface text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition text-sm";
  const labelClass = "block text-xs font-medium text-content-primary mb-1";
  const sectionTitleClass = "flex items-center gap-2 pb-2 border-b border-subtle mb-3";

  const publishedTitle =
    (createdTenderResult?.title as string | undefined) || formData.title;
  const publishedNature =
    (createdTenderResult?.procurement_nature as string | undefined) ||
    formData.procurementNature;
  const publishedMethod =
    (createdTenderResult?.procurement_method as string | undefined) ||
    formData.procurementMethod;
  const publishedBudget =
    createdTenderResult?.budget_max != null
      ? String(createdTenderResult.budget_max)
      : formData.budget;
  const publishedCategory =
    (createdTenderResult?.category as string | undefined) || formData.category;

  const hasAlerts = Boolean(
    formError || localFormRestoredMessage || pdfSuccessMessage || pdfJobMessage || tokenError,
  );

  return (
    <main className="h-screen flex flex-col overflow-hidden bg-app">
      {/* Compact sticky top bar */}
      <header className="h-[52px] flex-shrink-0 bg-surface border-b border-subtle flex items-center justify-between gap-3 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1.5 text-content-muted hover:text-content-primary transition-colors cursor-pointer flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium text-xs hidden sm:inline">Back</span>
          </button>
          <div className="h-5 w-px bg-subtle flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-content-primary truncate">Create New Tender</h1>
            <p className="text-[11px] text-content-secondary truncate hidden sm:block">
              Start with a PDF notice, or fill the form manually
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowManageTokens(true)}
          className={`h-9 px-3 rounded text-xs font-semibold flex items-center gap-2 transition cursor-pointer flex-shrink-0 border ${
            tokenBalance < tenderPublishCost
              ? "bg-status-rejected-bg border-red-200 text-status-rejected-text hover:opacity-90"
              : "bg-brand-navy border-brand-navy text-white hover:bg-slate-900"
          }`}
          title="Manage Organization Tokens"
        >
          <svg className={`w-3.5 h-3.5 ${tokenBalance < tenderPublishCost ? "text-status-rejected-text" : "text-amber-300"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="tabular-nums">
            {loadingTokens ? "..." : tokenBalance.toLocaleString()}
          </span>
          <span className={`hidden sm:inline ${tokenBalance < tenderPublishCost ? "opacity-80" : "text-slate-300"}`}>
            · Fee {tenderPublishCost}
          </span>
        </button>
      </header>

      {/* Optional alert strip */}
      {hasAlerts && (
        <div className="flex-shrink-0 border-b border-subtle bg-surface px-4 md:px-6 lg:px-8 py-2 space-y-1.5">
          {formError && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded flex items-start gap-2 animate-fade-in text-red-800 text-xs">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="font-semibold">Validation Error:</strong> {formError}
              </div>
            </div>
          )}

          {localFormRestoredMessage && (
            <div className="px-3 py-2 bg-sky-50 border border-sky-200 rounded flex items-start gap-2 animate-fade-in text-sky-900 text-xs">
              <svg className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-semibold text-sky-950">Saved on this device</p>
                <p className="text-[11px] text-sky-800 mt-0.5">{localFormRestoredMessage}</p>
              </div>
            </div>
          )}

          {pdfSuccessMessage && (
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded flex items-start gap-2 animate-fade-in text-emerald-900 text-xs">
              <div className="p-1 bg-emerald-600 text-white rounded flex-shrink-0">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-emerald-950">PDF import complete</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">{pdfSuccessMessage}</p>
              </div>
            </div>
          )}

          {pdfJobMessage && (
            <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded flex items-start gap-2 animate-fade-in text-slate-800 text-xs">
              <svg className="animate-spin h-4 w-4 text-brand-blue flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="font-semibold text-content-primary">Processing PDF</p>
                <p className="text-[11px] text-slate-600 mt-0.5">{pdfJobMessage}</p>
              </div>
            </div>
          )}

          {tokenError && (
            <div className="px-3 py-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded flex items-center justify-between gap-2">
              <span className="min-w-0">{tokenError}</span>
              <button
                type="button"
                onClick={() => setShowManageTokens(true)}
                className="underline font-bold text-rose-900 hover:text-rose-950 flex-shrink-0"
              >
                Buy Tokens Now
              </button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-y-auto xl:overflow-hidden">
        <div className="flex-1 min-h-0 overflow-visible xl:overflow-hidden px-4 md:px-6 lg:px-8 py-3 flex flex-col gap-3">
          {/* PDF Import — first thing users see */}
          <div className="flex-shrink-0 rounded border-2 border-brand-blue/35 bg-sky-50 shadow-subtle-card overflow-hidden">
            <div className="px-4 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded bg-brand-blue text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-content-primary">Import from PDF notice</h3>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white bg-brand-blue px-1.5 py-0.5 rounded">
                      Start here
                    </span>
                  </div>
                  <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                    Drop a tender notice PDF to auto-fill every field below — fastest path to publish.
                    You can still enter details manually if you prefer.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-2 flex-shrink-0 w-full lg:w-auto lg:min-w-[340px]">
                <label className={`flex-1 flex items-center justify-center gap-2 h-10 px-3 rounded cursor-pointer transition text-xs font-semibold border ${
                  isExtractingPdf || isPublishingPdf
                    ? "bg-sky-100 border-sky-200 text-content-muted cursor-not-allowed"
                    : "bg-brand-blue border-brand-blue text-white hover:bg-blue-700"
                }`}>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    disabled={isExtractingPdf || isSubmitting || isPublishingPdf}
                    onChange={handlePdfFileSelected}
                  />
                  {isExtractingPdf ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span>Fill form from PDF</span>
                    </>
                  )}
                </label>

                <label className={`flex items-center justify-center gap-1.5 h-10 px-3 rounded text-xs font-semibold transition flex-shrink-0 border ${
                  isPublishingPdf
                    ? "bg-slate-200 border-slate-200 text-content-muted cursor-not-allowed"
                    : "bg-white border-brand-blue/40 text-brand-blue hover:bg-sky-100 cursor-pointer"
                }`}>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    disabled={isExtractingPdf || isSubmitting || isPublishingPdf}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDirect1ClickCreate(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  {isPublishingPdf ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span>Publish from PDF</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-visible xl:overflow-hidden grid grid-cols-1 xl:grid-cols-12 gap-3 xl:gap-4 border border-subtle rounded bg-surface">
          {/* LEFT ~7 cols: tender details, packaging, eligibility, description */}
          <div className="xl:col-span-7 xl:overflow-y-auto xl:border-r border-subtle">
            <div className="p-4 space-y-4">
              {/* ── Section 1: Tender Details ───────────── */}
              <div className="space-y-3">
                <div className={sectionTitleClass}>
                  <span className="w-5 h-5 rounded bg-brand-navy text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  <h3 className="text-xs font-semibold text-content-primary uppercase tracking-wide">Tender Details & Classification</h3>
                </div>

                <div>
                  <label htmlFor="title" className={labelClass}>Tender Title <span className="text-red-500">*</span></label>
                  <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} placeholder="Enter tender title" required className={inputClass} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="procurementNature" className={labelClass}>Procurement Nature <span className="text-red-500">*</span></label>
                    <select id="procurementNature" name="procurementNature" value={formData.procurementNature} onChange={handleChange} required className={`${inputClass} appearance-none`}>
                      <option value="Goods">Goods</option>
                      <option value="Works">Works</option>
                      <option value="Services">Services</option>
                      <option value="Consultancy">Consultancy</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="procurementMethod" className={labelClass}>Procurement Method <span className="text-red-500">*</span></label>
                    <select id="procurementMethod" name="procurementMethod" value={formData.procurementMethod} onChange={handleChange} required className={`${inputClass} appearance-none`}>
                      <option value="OTM">Open Tendering Method (OTM)</option>
                      <option value="RFQ">Request for Quotation (RFQ)</option>
                      <option value="RFP">Request for Proposal (RFP)</option>
                      <option value="ReverseAuction">Reverse Auction</option>
                      <option value="Direct">Direct Procurement</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="category" className={labelClass}>Category <span className="text-red-500">*</span></label>
                    <input type="text" id="category" name="category" value={formData.category} onChange={handleChange} placeholder="e.g. Stone & Construction Materials" required className={inputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="budget" className={labelClass}>Budget Ceiling / Estimated Value (BDT)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm font-semibold">৳</span>
                      <input type="number" id="budget" name="budget" value={formData.budget} onChange={handleChange} placeholder="e.g. 3900000" min="0" className={`${inputClass} pl-8`} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="bidBond" className={labelClass}>Bid-Bond Security Amount (BDT)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-sm font-semibold">৳</span>
                      <input type="number" id="bidBond" name="bidBond" value={bidBondAmount} onChange={(e) => setBidBondAmount(e.target.value)} placeholder="e.g. 75000" min="0" className={`${inputClass} pl-8`} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Tender Visibility <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibilityType("Public")}
                        className={`px-3 py-2 rounded border text-left font-semibold text-xs transition-all ${
                          visibilityType === "Public"
                            ? "bg-brand-navy text-white border-brand-navy"
                            : "bg-surface text-content-secondary border-subtle hover:bg-app"
                        }`}
                      >
                        Public Tender
                        <span className="block text-[10px] font-normal opacity-80 mt-0.5">Open to all verified vendors</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibilityType("Exclusive")}
                        className={`px-3 py-2 rounded border text-left font-semibold text-xs transition-all ${
                          visibilityType === "Exclusive"
                            ? "bg-brand-navy text-white border-brand-navy"
                            : "bg-surface text-content-secondary border-subtle hover:bg-app"
                        }`}
                      >
                        Enlisted Only
                        <span className="block text-[10px] font-normal opacity-80 mt-0.5">Restricted to your enlisted vendors</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="deadline" className={labelClass}>Submission Deadline <span className="text-red-500">*</span></label>
                    <input type="date" id="deadline" name="deadline" value={formData.deadline} onChange={handleChange} required className={inputClass} />
                  </div>
                </div>

                {/* ── Packaging Mode & Lot Items Builder (FR-08) ───────────── */}
                <div className="bg-app border border-subtle rounded p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-subtle">
                    <div>
                      <h4 className="text-xs font-semibold text-content-primary">Tender Packaging & Lot Items</h4>
                      <p className="text-[11px] text-content-secondary mt-0.5">
                        Single item or packaged tender with multiple lots.
                      </p>
                    </div>
                    <div className="inline-flex rounded bg-surface border border-subtle p-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setPackageType("SingleItem");
                          if (tenderItems.length > 1) {
                            setTenderItems([tenderItems[0]]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                          packageType === "SingleItem"
                            ? "bg-brand-navy text-white"
                            : "text-content-secondary hover:text-content-primary"
                        }`}
                      >
                        Single Item
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPackageType("PackagedLots");
                          if (tenderItems.length < 2) {
                            handleAddLotItem();
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                          packageType === "PackagedLots"
                            ? "bg-brand-navy text-white"
                            : "text-content-secondary hover:text-content-primary"
                        }`}
                      >
                        Packaged Lots
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {tenderItems.map((item, idx) => (
                      <div key={idx} className="bg-surface p-3 rounded border border-subtle space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-app text-content-primary font-semibold text-[11px] rounded border border-subtle tabular-nums">
                            {item.lot_number || `LOT-${idx + 1}`}
                          </span>
                          {packageType === "PackagedLots" && tenderItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLotItem(idx)}
                              className="text-[11px] text-red-600 hover:text-red-700 font-semibold transition"
                            >
                              Remove Lot
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-2">
                            <label className="block text-content-secondary text-[10px] font-medium uppercase mb-0.5">Item / Lot Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => handleUpdateLotItem(idx, "item_name", e.target.value)}
                              placeholder={idx === 0 ? "e.g. Portland Composite Cement" : "e.g. 60-Grade Deformed Rebar"}
                              className="w-full h-9 px-3 py-1.5 border border-subtle rounded text-sm bg-surface"
                            />
                          </div>
                          <div>
                            <label className="block text-content-secondary text-[10px] font-medium uppercase mb-0.5">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLotItem(idx, "quantity", e.target.value)}
                              className="w-full h-9 px-3 py-1.5 border border-subtle rounded text-sm bg-surface tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-content-secondary text-[10px] font-medium uppercase mb-0.5">Unit of Measure</label>
                            <input
                              type="text"
                              value={item.unit_of_measure}
                              onChange={(e) => handleUpdateLotItem(idx, "unit_of_measure", e.target.value)}
                              placeholder="e.g. Bags, Tons, Units"
                              className="w-full h-9 px-3 py-1.5 border border-subtle rounded text-sm bg-surface"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-content-secondary text-[10px] font-medium uppercase mb-0.5">Estimated Unit Price (BDT, Optional)</label>
                            <input
                              type="number"
                              min="0"
                              value={item.estimated_unit_price}
                              onChange={(e) => handleUpdateLotItem(idx, "estimated_unit_price", e.target.value)}
                              placeholder="e.g. 550"
                              className="w-full h-9 px-3 py-1.5 border border-subtle rounded text-sm bg-surface tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-content-secondary text-[10px] font-medium uppercase mb-0.5">Specifications (Optional)</label>
                            <input
                              type="text"
                              value={item.specifications}
                              onChange={(e) => handleUpdateLotItem(idx, "specifications", e.target.value)}
                              placeholder="e.g. BSTI BDS EN 197-1 certified"
                              className="w-full h-9 px-3 py-1.5 border border-subtle rounded text-sm bg-surface"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {packageType === "PackagedLots" && (
                      <button
                        type="button"
                        onClick={handleAddLotItem}
                        className="w-full py-2 bg-surface hover:bg-app text-content-primary font-semibold text-[11px] rounded transition border border-dashed border-subtle flex items-center justify-center gap-1.5"
                      >
                        + Add Another Lot / Item
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="eligibilityOfTenderer" className={labelClass}>Eligibility of Tenderer</label>
                  <textarea
                    id="eligibilityOfTenderer"
                    name="eligibilityOfTenderer"
                    value={formData.eligibilityOfTenderer}
                    onChange={handleChange}
                    placeholder="Enter specific financial and experience criteria required from vendors..."
                    rows={2}
                    className={`${inputClass} h-auto py-2 resize-none`}
                  />
                </div>

                <div>
                  <label htmlFor="description" className={labelClass}>Detailed Description & Scope of Work <span className="text-red-500">*</span></label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Enter detailed tender requirements, scope of work, and terms..."
                    required
                    rows={3}
                    className={`${inputClass} h-auto py-2 resize-none`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT ~5 cols: key dates, documents */}
          <div className="xl:col-span-5 xl:overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* ── Section 2: Key Dates ───────────────── */}
              <div className="space-y-3 bg-surface border border-subtle rounded p-3">
                <div className={sectionTitleClass}>
                  <span className="w-5 h-5 rounded bg-brand-navy text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  <h3 className="text-xs font-semibold text-content-primary uppercase tracking-wide">Key Timeline Dates</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="tenderPublicDate" className={labelClass}>Publication Date <span className="text-red-500">*</span></label>
                    <input type="date" id="tenderPublicDate" name="tenderPublicDate" value={formData.tenderPublicDate} onChange={handleChange} required className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="preBidMeeting" className={labelClass}>Pre-Bid Meeting Date</label>
                    <input type="date" id="preBidMeeting" name="preBidMeeting" value={formData.preBidMeeting} onChange={handleChange} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="tenderOpeningDate" className={labelClass}>Opening Date <span className="text-red-500">*</span></label>
                    <input type="date" id="tenderOpeningDate" name="tenderOpeningDate" value={formData.tenderOpeningDate} onChange={handleChange} required className={inputClass} />
                  </div>
                </div>
              </div>

              {/* ── Section 3: Documents ────────────────── */}
              <div className="space-y-3 bg-surface border border-subtle rounded p-3">
                <div className={sectionTitleClass}>
                  <span className="w-5 h-5 rounded bg-brand-navy text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  <h3 className="text-xs font-semibold text-content-primary uppercase tracking-wide">Tender Specification Documents</h3>
                </div>

                <div className="bg-app p-3 rounded border border-subtle">
                  <label htmlFor="fileCount" className={labelClass}>
                    Specification Files to Attach
                  </label>
                  <input type="number" id="fileCount" name="fileCount" value={fileCount} onChange={handleFileCountChange} placeholder="e.g. 1" min="0" className={`${inputClass} mb-3`} />

                  {customFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-content-secondary uppercase tracking-wider">
                        Attached Specification Files ({customFiles.length}):
                      </p>
                      {customFiles.map((cf, index) => {
                        const isComplete = cf.name.trim() && cf.file;

                        return (
                          <div
                            key={index}
                            className={`p-3 rounded border transition-all ${
                              isComplete ? "bg-surface border-emerald-300" : "bg-surface border-subtle"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-semibold text-content-primary">Document #{index + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeFileSlot(index)}
                                className="text-[11px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                              >
                                Remove Slot
                              </button>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <label className="block text-[10px] font-medium text-content-secondary mb-0.5">Document Title <span className="text-red-500">*</span></label>
                                <input
                                  type="text"
                                  value={cf.name}
                                  onChange={(e) => updateCustomFile(index, "name", e.target.value)}
                                  placeholder="e.g. Tender Notice Specification"
                                  required
                                  className="w-full h-9 px-3 py-1.5 bg-app border border-subtle rounded text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition text-xs"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-medium text-content-secondary mb-0.5">Upload PDF File <span className="text-red-500">*</span></label>
                                {cf.file ? (
                                  <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded">
                                    <span className="text-[11px] text-emerald-800 font-medium truncate max-w-[180px]">
                                      {cf.file.name} ({formatFileSize(cf.file.size)})
                                    </span>
                                    <label className="cursor-pointer text-[10px] bg-white border border-subtle hover:bg-app text-content-primary px-2 py-1 rounded font-semibold transition">
                                      Change
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            updateCustomFile(index, "file", e.target.files[0]);
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                ) : (
                                  <input
                                    type="file"
                                    onChange={(e) => {
                                      if (e.target.files && e.target.files[0]) {
                                        updateCustomFile(index, "file", e.target.files[0]);
                                      }
                                    }}
                                    required
                                    className="w-full px-2 py-1 text-xs text-content-secondary file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-app file:text-content-primary hover:file:bg-slate-200 transition"
                                  />
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
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <label className="block text-xs font-medium text-content-primary">Mandatory Documents Required from Vendors</label>
                    {sellerDocs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAccessConfig(!showAccessConfig)}
                        className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded border transition cursor-pointer flex-shrink-0 ${
                          showAccessConfig
                            ? "bg-app text-content-primary border-subtle"
                            : "bg-app text-content-muted border-subtle hover:bg-slate-100"
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Access {showAccessConfig ? "" : "(default)"}
                      </button>
                    )}
                  </div>

                  {sellerDocs.length > 0 && (
                    <ul className="mb-2 space-y-1.5">
                      {sellerDocs.map((doc, index) => (
                        <li key={index} className="bg-app rounded border border-subtle overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-3.5 h-3.5 text-brand-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span className="text-xs text-content-primary font-medium truncate">{doc.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSellerDoc(index)}
                              className="text-content-muted hover:text-red-500 transition flex-shrink-0 ml-2 cursor-pointer"
                              aria-label="Remove"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {showAccessConfig && (
                            <div className="px-3 pb-2 pt-1 border-t border-subtle bg-surface">
                              <p className="text-[10px] text-content-muted mb-1.5">Who can view this document:</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {ALL_ROLES.map((role) => (
                                  <label
                                    key={role}
                                    className={`flex items-center gap-1 text-[11px] cursor-pointer select-none ${role === "Owner" ? "opacity-60" : ""}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={role === "Owner" || doc.allowed_roles.includes(role)}
                                      disabled={role === "Owner"}
                                      onChange={() => toggleRole(index, role)}
                                      className="w-3 h-3 rounded border-slate-300 text-brand-blue focus:ring-brand-blue focus:ring-offset-0 disabled:opacity-60"
                                    />
                                    <span className="text-content-secondary font-medium">{ROLE_LABELS[role]}</span>
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
                      placeholder="e.g. Trade License, Tax Certificate"
                      className="flex-1 h-9 px-3 py-1.5 bg-surface border border-subtle rounded text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition text-xs"
                    />
                    <button
                      type="button"
                      onClick={addSellerDoc}
                      className="h-9 px-3 bg-brand-navy hover:bg-slate-900 text-white text-xs font-medium rounded transition flex items-center gap-1 flex-shrink-0 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Sticky bottom action bar */}
        <div className="flex-shrink-0 border-t border-subtle bg-surface px-4 md:px-6 lg:px-8 py-2.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="h-9 px-4 bg-app text-content-primary font-semibold rounded hover:bg-slate-200 transition border border-subtle text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting || isSavingDraft || isExtractingPdf || isPublishingPdf}
            className="h-9 px-4 bg-app text-content-primary font-semibold rounded hover:bg-slate-50 transition border border-subtle text-xs cursor-pointer disabled:opacity-50"
          >
            {isSavingDraft ? "Saving Draft..." : "Save as Draft"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isSavingDraft || isExtractingPdf || isPublishingPdf}
            className="h-9 px-4 bg-brand-navy text-white font-semibold rounded hover:bg-slate-900 transition flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Publishing...
              </>
            ) : (
              <>
                <span>Publish Tender</span>
                <span className="text-[10px] opacity-80 font-normal tabular-nums">({tenderPublishCost}</span>
                <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] opacity-80 font-normal">)</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Manage Tokens Modal */}
      <ManageTokensModal
        isOpen={showManageTokens}
        onClose={() => setShowManageTokens(false)}
        onBalanceUpdate={(newBal) => {
          setTokenBalance(newBal);
          setTokenError(null);
          try {
            localStorage.setItem("org_token_balance", newBal.toString());
          } catch { }
        }}
      />

      {/* Tender Published Successfully Modal */}
      <ModalShell
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        maxWidth="max-w-lg"
      >
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded bg-status-approved-bg text-status-approved-text flex items-center justify-center">
            <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-content-primary mb-1">Tender Published!</h2>
          <p className="text-content-secondary text-sm mb-6">
            Your tender has been published and is now open for vendors to submit proposals.
          </p>

          <div className="bg-app border border-subtle rounded p-5 mb-6 text-left space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-subtle">
              <span className="text-xs text-content-muted font-semibold uppercase">Title</span>
              <span className="text-xs font-bold text-content-primary truncate max-w-[240px]">{publishedTitle}</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-subtle">
              <span className="text-xs text-content-muted font-semibold uppercase">Nature / Method</span>
              <span className="text-xs font-bold text-content-primary">{publishedNature} ({publishedMethod})</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-subtle">
              <span className="text-xs text-content-muted font-semibold uppercase">Budget Ceiling</span>
              <span className="text-base font-bold text-content-primary tabular-nums">৳ {parseFloat(publishedBudget || "0").toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-content-muted font-semibold uppercase">Category</span>
              <span className="badge-status badge-draft capitalize">
                <span className="badge-dot" />
                {publishedCategory || "General"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {createdTenderResult?.tender_id ? (
              <button
                onClick={() => router.push(`/view-my-tender/${createdTenderResult.tender_id}`)}
                className="w-full py-3.5 bg-brand-navy text-white font-bold rounded hover:bg-slate-900 transition shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer"
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
              className="w-full py-3 bg-app hover:bg-slate-200 text-content-primary font-bold rounded transition border border-subtle text-sm cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </ModalShell>
    </main>
  );
}
