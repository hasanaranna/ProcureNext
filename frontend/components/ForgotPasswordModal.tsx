'use client';

import { useState } from 'react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.detail || data.error?.message || 'Failed to send reset link. Please try again.');
      }
    } catch {
      setError('Network error. Unable to connect to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
      <div
        className="w-full max-w-md bg-surface rounded shadow-xl border border-subtle overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-surface p-6 text-center border-b border-subtle">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-content-muted hover:text-content-primary p-1 rounded transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="w-10 h-10 mx-auto mb-3 rounded bg-brand-navy flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-content-primary">Forgot Password?</h2>
          <p className="text-content-secondary text-xs font-medium mt-1">
            We will send a secure password reset link to your email.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          {success ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 mx-auto mb-4 rounded bg-status-approved-bg border border-subtle flex items-center justify-center text-status-approved-text">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-content-primary mb-2">Check Your Email</h3>
              <p className="text-sm text-content-secondary leading-relaxed mb-4">
                If an account exists for <strong className="text-content-primary">{email}</strong>, a password reset link has been sent to your inbox.
              </p>
              <div className="p-3 bg-status-pending-bg border border-subtle rounded text-xs text-status-pending-text mb-6 flex items-center gap-2 text-left">
                <svg className="w-4 h-4 flex-shrink-0 text-status-pending-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>This reset link will expire in <strong>30 minutes</strong>.</span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-full bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-status-rejected-bg border border-subtle rounded text-status-rejected-text text-xs flex items-start gap-2.5">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="reset-email" className="block text-xs font-medium text-content-secondary mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  id="reset-email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your registered email"
                  required
                  className="w-full px-3 py-2 border border-subtle rounded bg-surface text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Sending link...</span>
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-content-muted mt-2">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-brand-blue font-medium hover:text-brand-navy transition"
                >
                  Log in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
