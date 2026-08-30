export type TenderPdfJobResponse = {
  task_id: string;
  status: string;
  message?: string;
};

export type TenderPdfJobStatus = {
  task_id: string;
  status: "processing" | "completed" | "failed" | string;
  result?: Record<string, unknown> | null;
  error?: string | null;
};

export async function parseApiError(
  response: Response,
  fallback: string,
): Promise<string> {
  const payload = await response.json().catch(() => null);
  if (!payload) return fallback;

  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.detail)) {
    return payload.detail
      .map((item: { msg?: string }) => item?.msg)
      .filter(Boolean)
      .join(", ");
  }
  if (payload.error?.message) return payload.error.message;
  if (typeof payload.error === "string") return payload.error;

  return fallback;
}

export async function pollTenderPdfJob(
  taskId: string,
  options?: { intervalMs?: number; maxAttempts?: number },
): Promise<Record<string, unknown>> {
  const intervalMs = options?.intervalMs ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 60;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(
      `/api/tenders/buyer/create-from-pdf/jobs/${taskId}`,
    );

    if (!response.ok) {
      throw new Error(
        await parseApiError(response, "Failed to check PDF processing status."),
      );
    }

    const data = (await response.json()) as TenderPdfJobStatus;

    if (data.status === "completed" && data.result) {
      return data.result;
    }

    if (data.status === "failed") {
      throw new Error(data.error || "Tender PDF processing failed.");
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    "Tender PDF processing timed out. The job may still be running — check your tenders list shortly.",
  );
}
