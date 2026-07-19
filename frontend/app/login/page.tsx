'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SIGNUP_BACKGROUND_IMAGE } from '@/lib/constants';
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
          {/* Header */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 text-center">
            Welcome Back
          </h1>
          <p className="text-lg text-gray-700 mb-8 text-center">
            Login to your ProcureNext account
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
              <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                Email Address <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-2">
                Password <span className="text-red-600">*</span>
              </label>
              <input
                type="password"
                id="password"
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
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>

            {/* Sign Up Link */}
            <p className="text-center text-gray-700 text-sm mt-6">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={openSignupModal}
                className="text-gray-800 font-semibold hover:text-gray-900 transition cursor-pointer bg-none border-none p-0"
              >
                Sign up here
              </button>
            </p>
          </form>
        </div>
      </div>

      {/* Signup Modal */}
      <SignupModal isOpen={showSignupModal} onClose={closeSignupModal} />
    </main>
  );
}
