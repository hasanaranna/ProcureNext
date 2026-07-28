'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SignupModal from '@/components/SignupModal';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showSignupModal, setShowSignupModal] = useState(false);
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-56 h-56 bg-accent-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
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
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight mb-6">
            Streamline Your <br />
            <span className="text-gradient">Procurement</span>
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed max-w-md">
            Access your dashboard to manage tenders, review bids, and connect with vendors — all in one place.
          </p>
          <div className="mt-12 flex items-center gap-4">
            <div className="flex -space-x-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-navy-900 bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-xs font-bold">
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
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">ProcureNext</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border border-slate-200">
            {/* Header */}
            <h1 className="text-3xl font-black text-navy-900 mb-1">Welcome Back</h1>
            <p className="text-slate-500 mb-8">Sign in to your ProcureNext account</p>

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
                <label htmlFor="email" className="block text-sm font-semibold text-navy-900 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-navy-900 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
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
                  'Sign In'
                )}
              </button>

              {/* Sign Up Link */}
              <p className="text-center text-slate-500 text-sm mt-6">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={openSignupModal}
                  className="text-accent-600 font-semibold hover:text-accent-700 transition cursor-pointer bg-none border-none p-0"
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
    </main>
  );
}
