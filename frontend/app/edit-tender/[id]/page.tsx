"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { parseApiError } from "@/lib/tenderPdf";

function formatDateForInput(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

export default function EditTenderPage() {
  const router = useRouter();
  const params = useParams();
  const tenderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    deadline: "",
    tenderPublicDate: "",
    preBidMeeting: "",
    tenderOpeningDate: "",
    eligibilityOfTenderer: "",
    category: "construction",
    procurementNature: "Goods",
    procurementMethod: "OTM",
  });

  useEffect(() => {
    const loadTender = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tenders/${tenderId}/detail`);
        if (!res.ok) throw new Error("Failed to load tender.");
        const data = await res.json();

        if (!["Draft", "Published"].includes(data.status)) {
          throw new Error(`Cannot edit a tender with status '${data.status}'.`);
        }
        if (data.status === "Published" && (data.bid_count ?? 0) > 0) {
          throw new Error("Cannot edit a published tender that already has bids.");
        }

        setStatus(data.status);
        setFormData({
          title: data.title || "",
          description: data.description || "",
          budget: data.budget_max != null ? String(data.budget_max) : "",
          deadline: formatDateForInput(data.submission_deadline),
          tenderPublicDate: formatDateForInput(data.tender_public_date),
          preBidMeeting: formatDateForInput(data.pre_bid_meeting),
          tenderOpeningDate: formatDateForInput(data.tender_opening_date),
          eligibilityOfTenderer: data.eligibility_of_tenderer || "",
          category: data.category_name || "construction",
          procurementNature: data.procurement_nature || "Goods",
          procurementMethod: data.procurement_method || "OTM",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tender.");
      } finally {
        setLoading(false);
      }
    };

    if (tenderId) loadTender();
  }, [tenderId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        procurement_nature: formData.procurementNature,
        procurement_method: formData.procurementMethod,
        eligibility_of_tenderer: formData.eligibilityOfTenderer || null,
        budget_max: parseFloat(formData.budget) || null,
        category: formData.category || null,
        submission_deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
        tender_public_date: formData.tenderPublicDate
          ? new Date(formData.tenderPublicDate).toISOString()
          : null,
        pre_bid_meeting: formData.preBidMeeting
          ? new Date(formData.preBidMeeting).toISOString()
          : null,
        tender_opening_date: formData.tenderOpeningDate
          ? new Date(formData.tenderOpeningDate).toISOString()
          : null,
      };

      const res = await fetch(`/api/tenders/${tenderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await parseApiError(res, "Failed to update tender."));
      }

      router.push(`/view-my-tender/${tenderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tender.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-subtle rounded bg-white text-content-primary placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue";

  if (loading) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center bg-app text-content-muted">
        Loading tender...
      </main>
    );
  }

  if (error && !formData.title) {
    return (
      <main className="w-full min-h-screen flex flex-col items-center justify-center gap-4 bg-app px-4">
        <p className="text-status-rejected-text">{error}</p>
        <button
          onClick={() => router.push(`/view-my-tender/${tenderId}`)}
          className="bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded"
        >
          Back to Tender
        </button>
      </main>
    );
  }

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-app">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push(`/view-my-tender/${tenderId}`)}
          className="mb-6 text-content-muted hover:text-content-primary text-sm"
        >
          ← Back to Tender
        </button>

        <div className="bg-surface rounded border border-subtle p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-content-primary">Edit Tender</h1>
            <p className="text-sm text-content-secondary mt-1">Status: {status}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded bg-status-rejected-bg border border-subtle text-status-rejected-text text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1">Title</label>
              <input name="title" value={formData.title} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-primary mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                required
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">Budget (max)</label>
                <input name="budget" value={formData.budget} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">Submission deadline</label>
                <input type="date" name="deadline" value={formData.deadline} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">Procurement nature</label>
                <select name="procurementNature" value={formData.procurementNature} onChange={handleChange} className={inputClass}>
                  <option value="Goods">Goods</option>
                  <option value="Works">Works</option>
                  <option value="Services">Services</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-content-primary mb-1">Procurement method</label>
                <input name="procurementMethod" value={formData.procurementMethod} onChange={handleChange} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push(`/view-my-tender/${tenderId}`)}
                className="flex-1 rounded border border-subtle text-content-primary bg-app hover:bg-subtle text-sm font-medium h-9 px-3.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
