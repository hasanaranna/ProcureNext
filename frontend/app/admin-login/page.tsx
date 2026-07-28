'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        // Store tokens and user context
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Use hard redirect to force RootLayout to re-evaluate cookies
        window.location.href = '/admin-home';
      } else {
        const err = await res.json();
        setError(
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-accent-500/8 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/3 w-56 h-56 bg-accent-400/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">ProcureNext</span>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-2xl mb-8">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6">
            Admin <br />
            <span className="text-gradient">Control Center</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            Manage platform operations, verify organizations, and configure system settings from a secure admin dashboard.
          </p>
          <div className="mt-10 flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 max-w-sm">
            <svg className="w-5 h-5 text-accent-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm text-slate-400">Secured access — admin credentials required</p>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ───────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-navy-900">ProcureNext Admin</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-slate-200">
            {/* Admin Badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className="px-3 py-1 bg-accent-50 text-accent-700 text-xs font-bold rounded-full border border-accent-200">
                ADMIN PORTAL
              </span>
            </div>

            {/* Header */}
            <h1 className="text-3xl font-black text-navy-900 mb-1">Admin Sign In</h1>
            <p className="text-slate-500 mb-8">Access the ProcureNext admin dashboard</p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start gap-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="admin-email" className="block text-sm font-semibold text-navy-900 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  id="admin-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@procurenext.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="admin-password" className="block text-sm font-semibold text-navy-900 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="admin-password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-bold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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
              <p className="text-center text-slate-500 text-sm mt-6">
                Not an administrator?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="text-accent-600 font-semibold hover:text-accent-700 transition cursor-pointer bg-none border-none p-0"
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
