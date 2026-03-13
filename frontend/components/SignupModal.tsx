'use client';

import { useRouter } from 'next/navigation';
import ModalShell from '@/components/ModalShell';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SignupModal({ isOpen, onClose }: SignupModalProps) {
  const router = useRouter();

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl transition-colors"
      >
        ×
      </button>

      <div className="p-8">
        {/* Modal Header */}
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">I'm registering as...</h2>

        {/* Owner / Master Account Button */}
        <button
          onClick={() => {
            onClose();
            router.push('/signup-master');
          }}
          className="w-full mb-4 px-6 py-4 bg-gradient-to-br from-gray-600 to-gray-800 text-white font-semibold rounded-lg hover:from-gray-700 hover:to-gray-900 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 border border-gray-500"
        >
          Owner (Master Account)
        </button>

        {/* Normal User Button */}
        <button
          onClick={() => {
            onClose();
            router.push('/signup-user');
          }}
          className="w-full px-6 py-4 bg-gradient-to-br from-gray-50 to-gray-200 text-gray-700 font-semibold rounded-lg hover:from-gray-100 hover:to-gray-300 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg hover:scale-105 border-2 border-gray-700"
        >
          Normal User
        </button>
      </div>
    </ModalShell>
  );
}
