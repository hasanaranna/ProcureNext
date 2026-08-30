"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (formData.currentPassword === formData.newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: formData.currentPassword,
          new_password: formData.newPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const detail = err?.detail;
        setError(
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", ")
              : "Failed to update password.",
        );
        return;
      }

      setSuccess("Password updated successfully.");
      setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent";

  return (
    <main className="w-full min-h-screen py-10 px-4 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800">
      <div className="max-w-md mx-auto animate-fade-in">
        <button
          onClick={() => router.push("/home")}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium text-sm">Back to Dashboard</span>
        </button>

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8">
          <h1 className="text-2xl font-black text-navy-900 mb-1">Change Password</h1>
          <p className="text-sm text-slate-500 mb-6">
            Update your account password. You will stay signed in after saving.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-semibold text-navy-900 mb-1">
                Current password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                value={formData.currentPassword}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-navy-900 mb-1">
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={formData.newPassword}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-navy-900 mb-1">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={formData.confirmPassword}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-navy-900 text-white font-bold hover:bg-navy-800 disabled:opacity-50 transition"
            >
              {submitting ? "Saving..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
