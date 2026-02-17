'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const router = useRouter();
  const [isModalAnimating, setIsModalAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger animation after modal is rendered
      setTimeout(() => setIsModalAnimating(true), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const closeModal = () => {
    setIsModalAnimating(false);
    setTimeout(() => onClose(), 300);
  };

  return (
    <div 
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
        isModalAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={closeModal}
    >
      {/* Modal Content */}
      <div 
        className={`bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative transition-all duration-300 ${
          isModalAnimating 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-10'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl transition-colors"
        >
          ×
        </button>

        {/* Modal Header */}
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">I'm a...</h2>

        {/* Buyer Button */}
        <button
          onClick={() => {
            onClose();
            router.push('/signup-buyer');
          }}
          className="w-full mb-4 px-6 py-4 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 border border-gray-500"
        >
          Buyer / Organization
        </button>

        {/* Seller/Vendor Button */}
        <button
          onClick={() => {
            onClose();
            router.push('/signup-seller');
          }}
          className="w-full px-6 py-4 bg-gradient-to-br from-gray-50 to-gray-200 text-gray-700 font-semibold rounded-lg hover:from-gray-100 hover:to-gray-300 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg hover:scale-105 border-2 border-gray-700"
        >
          Seller / Vendor
        </button>
      </div>
    </div>
  );
}
