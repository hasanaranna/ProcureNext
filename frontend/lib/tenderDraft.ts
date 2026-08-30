const DRAFT_STORAGE_KEY = "new_tender_draft_v1";

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
