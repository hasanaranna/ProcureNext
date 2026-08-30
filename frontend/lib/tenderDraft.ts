// Browser-local form persistence only — not a server-side tender draft.
const DRAFT_STORAGE_KEY = "new_tender_draft_v1";

export const LOCAL_FORM_RESTORED_MESSAGE =
  "We restored this form from your last session in this browser. Re-attach document files if you had any.";

export type TenderFormDraft = {
  formData: {
    title: string;
    description: string;
    procurementNature: string;
    procurementMethod: string;
    eligibilityOfTenderer: string;
    category: string;
    budget: string;
    deadline: string;
    tenderPublicDate: string;
    preBidMeeting: string;
    tenderOpeningDate: string;
  };
  sellerDocs: Array<{ name: string; allowed_roles: string[] }>;
  fileCount: number | "";
  customFileNames: string[];
  extractedEmbedding: number[] | null;
  showAccessConfig: boolean;
};

export function loadTenderDraft(): TenderFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TenderFormDraft;
  } catch {
    return null;
  }
}

export function saveTenderDraft(draft: TenderFormDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

export function clearTenderDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export type TenderFormInitialState = {
  formData: TenderFormDraft["formData"];
  sellerDocs: TenderFormDraft["sellerDocs"];
  fileCount: number | "";
  customFiles: Array<{ name: string; file: File | null }>;
  extractedEmbedding: number[] | null;
  showAccessConfig: boolean;
  restoredMessage: string | null;
};

export function loadInitialTenderFormState(
  emptyFormData: TenderFormDraft["formData"],
): TenderFormInitialState {
  const draft = loadTenderDraft();
  if (!draft) {
    return {
      formData: { ...emptyFormData },
      sellerDocs: [],
      fileCount: 1,
      customFiles: [{ name: "", file: null }],
      extractedEmbedding: null,
      showAccessConfig: false,
      restoredMessage: null,
    };
  }

  return {
    formData: draft.formData,
    sellerDocs: draft.sellerDocs,
    fileCount: draft.fileCount,
    customFiles:
      draft.customFileNames.length > 0
        ? draft.customFileNames.map((name) => ({ name, file: null }))
        : [{ name: "", file: null }],
    extractedEmbedding: draft.extractedEmbedding,
    showAccessConfig: draft.showAccessConfig,
    restoredMessage: LOCAL_FORM_RESTORED_MESSAGE,
  };
}
