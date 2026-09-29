'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAdminUser } from '@/lib/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Store admin display data in sessionStorage only.
        // Actual auth tokens (admin_access_token / admin_refresh_token) are
        // now set as HttpOnly cookies by the API proxy — the middleware reads
        // these to gate /admin-home without ever touching client storage.
        setAdminUser(data.user ?? {});

        // Use hard redirect to force middleware to re-evaluate the new cookie
        window.location.href = '/admin-home';
      } else {
        // FastAPI errors arrive as { detail }, proxy errors as { error: { message } }
        const err = await res.json().catch(() => ({}));
        setError(
          (typeof err.detail === 'string' ? err.detail : undefined) ||
            err.error?.message ||
            'Login failed. Please check your credentials or verify you have admin privileges.'
        );
      }
    } catch {
      setError('Network error. Unable to connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="w-full min-h-screen flex overflow-x-hidden">
      {/* ── Left Branding Panel (desktop only) ──────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-navy relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-9 h-9 rounded bg-white/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">ProcureNext</span>
          </div>
          <div className="w-14 h-14 rounded bg-white/10 flex items-center justify-center mb-8">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h2 className="text-4xl xl:text-5xl font-semibold text-white leading-tight mb-6">
            Admin <br />
            <span className="text-blue-400">Control Center</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            Manage platform operations, verify organizations, and configure system settings from a secure admin dashboard.
          </p>
          <div className="mt-10 flex items-center gap-3 p-4 rounded bg-white/5 border border-white/10 max-w-sm">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-slate-400">Secured access — admin credentials required</p>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ───────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-app">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-12 h-12 rounded bg-brand-navy flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-content-primary">ProcureNext Admin</span>
          </div>

          <div className="bg-surface rounded border border-subtle p-8 md:p-10">
            {/* Admin Badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className="badge-status badge-draft text-[10px] font-semibold">
                <span className="badge-dot"></span>
                ADMIN PORTAL
              </span>
            </div>

            {/* Header */}
            <h1 className="text-2xl font-bold text-content-primary mb-1">Admin Sign In</h1>
            <p className="text-content-secondary text-sm mb-8">Access the ProcureNext admin dashboard</p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-status-rejected-bg border border-red-200 rounded text-status-rejected-text text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="admin-email" className="block text-sm font-medium text-content-primary mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  id="admin-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@procurenext.com"
                  className="w-full px-3 py-2 border border-subtle rounded bg-surface text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-content-primary mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  id="admin-password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-subtle rounded bg-surface text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-9 mt-2 bg-brand-navy text-white text-sm font-medium rounded hover:bg-slate-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In as Admin'
                )}
              </button>

              {/* Back to Home */}
              <p className="text-center text-content-secondary text-sm mt-6">
                Not an administrator?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="text-brand-blue font-medium hover:text-blue-700 transition cursor-pointer bg-none border-none p-0"
                >
                  Back to Home
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
