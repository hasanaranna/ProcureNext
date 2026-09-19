'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SignupModal from '@/components/SignupModal';
import ForgotPasswordModal from '@/components/ForgotPasswordModal';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
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
      const res = await fetch('/api/auth/login', {
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
        // Store user context only (tokens are set as HttpOnly cookies by the API proxy)
        localStorage.setItem('user', JSON.stringify(data.user));

        // If account is pending, show message instead of redirecting
        if (data.user.status === 'Pending') {
          setError('Your account is pending admin approval. You will be notified once it is approved.');
          return;
        }

        // Use hard redirect to force RootLayout to re-evaluate cookies
        window.location.href = '/home';
      } else {
        const err = await res.json();
        setError(err.error?.message || 'Login failed. Please check your credentials.');
      }
    } catch {
      setError('Network error. Unable to connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSignupModal = () => {
    setShowSignupModal(true);
  };

  const closeSignupModal = () => {
    setShowSignupModal(false);
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
          <h2 className="text-4xl xl:text-5xl font-semibold text-white leading-tight mb-6">
            Streamline Your <br />
            <span className="text-blue-400">Procurement</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            Access your dashboard to manage tenders, review bids, and connect with vendors — all in one place.
          </p>
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-navy bg-slate-600 flex items-center justify-center text-white text-xs font-bold">
                  {['A', 'B', 'C', '+'][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-400">
              <span className="font-bold text-white">500+</span> organizations trust us
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ───────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-app">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-8 h-8 rounded bg-brand-navy flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-content-primary">ProcureNext</span>
          </div>

          <div className="bg-surface rounded border border-subtle p-8 md:p-10">
            {/* Header */}
            <h1 className="text-2xl font-bold text-content-primary mb-1">Welcome Back</h1>
            <p className="text-content-secondary text-sm mb-8">Sign in to your ProcureNext account</p>

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
                <label htmlFor="email" className="block text-sm font-medium text-content-primary mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className="w-full px-3 py-2 border border-subtle rounded bg-surface text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-content-primary">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-xs font-medium text-brand-blue hover:text-blue-700 transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  id="password"
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
                  'Sign In'
                )}
              </button>

              {/* Sign Up Link */}
              <p className="text-center text-content-secondary text-sm mt-6">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={openSignupModal}
                  className="text-brand-blue font-medium hover:text-blue-700 transition cursor-pointer bg-none border-none p-0"
                >
                  Create one
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Signup Modal */}
      <SignupModal isOpen={showSignupModal} onClose={closeSignupModal} />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </main>
  );
}
