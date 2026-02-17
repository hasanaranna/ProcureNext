'use client';

import { useState } from 'react';
import { SIGNUP_BACKGROUND_IMAGE } from '@/lib/constants';

export default function SignupSellerPage() {
  const [formData, setFormData] = useState({
    organizationName: '',
    name: '',
    contactNo: '',
    email: '',
    organizationAddress: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Submit logic will be added later
    console.log('Form submitted:', formData);
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
        backgroundColor: '#374151', // Fallback grey color for sides
      }}
    >
      <div className="relative z-10 max-w-2xl mx-auto w-full">
        {/* Form Container with Header */}
        <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-2xl p-8 md:p-12 border border-white/30">
          {/* Header */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2 text-center">
            Create Your Vendor Account
          </h1>
          <p className="text-lg text-gray-700 mb-8 text-center">
            Join ProcureNext and grow your business by connecting with buyers
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Name Field */}
            <div>
              <label htmlFor="organizationName" className="block text-sm font-semibold text-gray-800 mb-2">
                Organization Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleChange}
                placeholder="Enter your organization name"
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
                required
              />
            </div>

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
                required
              />
            </div>

            {/* Contact Number Field */}
            <div>
              <label htmlFor="contactNo" className="block text-sm font-semibold text-gray-800 mb-2">
                Contact Number <span className="text-red-600">*</span>
              </label>
              <input
                type="tel"
                id="contactNo"
                name="contactNo"
                value={formData.contactNo}
                onChange={handleChange}
                placeholder="Enter your contact number"
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition backdrop-blur-sm"
                required
              />
            </div>

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

            {/* Organization Address Field */}
            <div>
              <label htmlFor="organizationAddress" className="block text-sm font-semibold text-gray-800 mb-2">
                Organization Address <span className="text-red-600">*</span>
              </label>
              <textarea
                id="organizationAddress"
                name="organizationAddress"
                value={formData.organizationAddress}
                onChange={handleChange}
                placeholder="Enter your organization address"
                rows={4}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg bg-white/90 text-gray-900 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition resize-none backdrop-blur-sm"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 mt-8 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Create Vendor Account
            </button>

            {/* Login Link */}
            <p className="text-center text-gray-700 text-sm mt-6">
              Already have an account?{' '}
              <a href="/login" className="text-gray-800 font-semibold hover:text-gray-900 transition">
                Login here
              </a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
