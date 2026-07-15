'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SIGNUP_BACKGROUND_IMAGE } from '@/lib/constants';

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

        router.push('/admin-home');
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
    <main
      className="w-full min-h-screen flex items-center justify-center py-20 px-4 relative overflow-x-hidden"
      style={{
        backgroundImage: `url("${SIGNUP_BACKGROUND_IMAGE}")`,
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#374151',
      }}
    >
      <div className="relative z-10 max-w-md mx-auto w-full">
        <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-2xl p-8 md:p-12 border border-white/30">
          {/* Admin Badge */}
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-full p-3 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>
          </div>

          {/* Header */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 text-center">
            Admin Portal
          </h1>
          <p className="text-lg text-gray-700 mb-8 text-center">
            Sign in to the ProcureNext admin dashboard
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Admin Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="admin-email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your admin email"
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-semibold text-gray-800 mb-2"
              >
                Password <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                id="admin-password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-8 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In as Admin'
              )}
            </button>

            {/* Back to Home */}
            <p className="text-center text-gray-700 text-sm mt-6">
              Not an administrator?{' '}
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-gray-800 font-semibold hover:text-gray-900 transition cursor-pointer bg-none border-none p-0"
              >
                Back to Home
              </button>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
