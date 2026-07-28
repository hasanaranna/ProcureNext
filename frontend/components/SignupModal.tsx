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
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all duration-200 z-10"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="p-8">
        {/* Modal Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-navy-900">I&apos;m registering as...</h2>
          <p className="text-sm text-slate-500 mt-1">Choose your account type to get started</p>
        </div>

        {/* Owner / Master Account Button */}
        <button
          onClick={() => {
            onClose();
            router.push('/signup-master');
          }}
          className="w-full mb-4 px-6 py-4 bg-gradient-to-r from-navy-900 to-navy-800 text-white font-semibold rounded-xl hover:from-navy-800 hover:to-navy-700 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center gap-3"
        >
          <span className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg flex-shrink-0">🏢</span>
          <div className="text-left">
            <span className="block font-bold">Owner (Master Account)</span>
            <span className="block text-xs text-slate-300 font-normal mt-0.5">Register your organization</span>
          </div>
        </button>

        {/* Normal User / Employee Info */}
        <div className="w-full px-6 py-5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
          <div className="flex items-center gap-3 mb-3 justify-center">
            <span className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-lg flex-shrink-0">👤</span>
            <p className="text-slate-700 font-semibold">Employee (Normal User)</p>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            Employees can only register using an <strong className="text-slate-700">invitation link</strong> sent by their company owner.
          </p>
          <p className="text-slate-400 text-xs mt-3">
            Ask your organization&apos;s owner to send you an invitation from their Organization Management panel.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
