'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setTokenError('No reset token found. Please use the link sent to your email.');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/auth/password-reset/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          setTokenValid(true);
          setTokenEmail(data.email || '');
        } else {
          setTokenError(data.detail || data.message || 'This password reset link is invalid or has expired.');
        }
      } catch {
        setTokenError('Unable to verify reset link. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError('');

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token || '',
          new_password: password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitSuccess(true);
      } else {
        setSubmitError(data.detail || data.error?.message || 'Failed to reset password.');
      }
    } catch {
      setSubmitError('Network error. Unable to connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-subtle rounded bg-surface text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition";

  // ─── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center bg-app">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-brand-blue mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-content-secondary text-sm font-medium">Validating password reset link...</p>
        </div>
      </main>
    );
  }

  // ─── Token Error / Expired ──────────────────────────────────
  if (tokenError || !tokenValid) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center py-12 px-4 bg-app">
        <div className="max-w-md w-full bg-surface rounded border border-subtle p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-status-rejected-bg border border-red-200 flex items-center justify-center">
            <svg className="w-7 h-7 text-status-rejected-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-content-primary mb-2">Reset Link Expired or Invalid</h2>
          <p className="text-content-secondary mb-6 text-sm leading-relaxed">
            {tokenError || 'This password reset link is invalid or has already been used.'}
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="w-full h-9 bg-brand-navy text-white text-sm font-medium rounded hover:bg-slate-900 transition"
            >
              Go to Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ─── Success State ──────────────────────────────────────────
  if (submitSuccess) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center py-12 px-4 bg-app">
        <div className="max-w-md w-full bg-surface rounded border border-subtle p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-status-approved-bg border border-emerald-200 flex items-center justify-center">
            <svg className="w-7 h-7 text-status-approved-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-content-primary mb-2">Password Reset Successful!</h2>
          <p className="text-content-secondary mb-6 text-sm leading-relaxed">
            Your password has been updated. You can now log in with your new password.
          </p>
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full h-9 bg-brand-navy text-white text-sm font-medium rounded hover:bg-slate-900 transition"
          >
            Sign In Now
          </button>
        </div>
      </main>
    );
  }

  // ─── Reset Form ─────────────────────────────────────────────
  return (
    <main className="w-full min-h-screen flex items-center justify-center py-12 px-4 bg-app">
      <div className="max-w-md mx-auto w-full">
        <div className="bg-surface rounded border border-subtle p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded bg-brand-navy flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-content-primary mb-1">Set New Password</h1>
            <p className="text-content-secondary text-xs md:text-sm">
              for <strong className="text-content-primary">{tokenEmail}</strong>
            </p>
          </div>

          {/* Error Message */}
          {submitError && (
            <div className="mb-6 p-3 bg-status-rejected-bg border border-red-200 rounded text-status-rejected-text text-sm flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="font-bold">Error:</strong> {submitError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-content-primary mb-1.5">
                New Password <span className="text-status-rejected-text">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setSubmitError('');
                  }}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-content-secondary p-1"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-content-primary mb-1.5">
                Confirm New Password <span className="text-status-rejected-text">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setSubmitError('');
                }}
                placeholder="Re-enter your new password"
                required
                minLength={8}
                className={inputClass}
              />
            </div>

            {/* Password Validation Checklist */}
            <div className="p-3 bg-app border border-subtle rounded text-xs space-y-1 text-content-secondary">
              <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-status-approved-text font-medium' : ''}`}>
                <span>{password.length >= 8 ? '✓' : '•'}</span>
                <span>Minimum 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${password && confirmPassword && password === confirmPassword ? 'text-status-approved-text font-medium' : ''}`}>
                <span>{password && confirmPassword && password === confirmPassword ? '✓' : '•'}</span>
                <span>Passwords match</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-9 bg-brand-navy text-white text-sm font-medium rounded hover:bg-slate-900 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Updating Password...</span>
                </>
              ) : (
                'Save New Password'
              )}
            </button>

            <p className="text-center text-content-secondary text-xs md:text-sm">
              Remember your password?{' '}
              <a href="/login" className="text-brand-blue font-medium hover:text-blue-700 transition">
                Login here
              </a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="w-full min-h-screen flex items-center justify-center bg-app">
          <div className="text-center">
            <svg className="animate-spin h-8 w-8 text-brand-blue mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-content-secondary text-sm font-medium">Loading...</p>
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
