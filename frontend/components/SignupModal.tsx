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
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded bg-transparent text-content-muted hover:bg-slate-100 hover:text-content-primary transition-all duration-200 z-10"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="p-8">
        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 mx-auto mb-3 rounded bg-brand-navy flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-content-primary">I&apos;m registering as...</h2>
          <p className="text-content-secondary text-xs font-medium mt-1">Choose your account type to get started</p>
        </div>

        {/* Owner / Master Account Button */}
        <button
          onClick={() => {
            onClose();
            router.push('/signup-master');
          }}
          className="w-full mb-4 px-4 py-3 bg-brand-navy text-white font-medium rounded hover:bg-slate-900 transition-all duration-200 cursor-pointer flex items-center gap-3"
        >
          <span className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-sm flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </span>
          <div className="text-left">
            <span className="block font-medium text-sm">Owner (Master Account)</span>
            <span className="block text-xs text-slate-300 font-normal mt-0.5">Register your organization</span>
          </div>
        </button>

        {/* Normal User / Employee Info */}
        <div className="w-full px-4 py-4 rounded border border-dashed border-subtle bg-app text-center">
          <div className="flex items-center gap-3 mb-3 justify-center">
            <span className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-content-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </span>
            <p className="text-content-primary text-sm font-medium">Employee (Normal User)</p>
          </div>
          <p className="text-content-secondary text-xs leading-relaxed">
            Employees can only register using an <strong className="text-content-primary">invitation link</strong> sent by their company owner.
          </p>
          <p className="text-content-muted text-xs mt-3">
            Ask your organization&apos;s owner to send you an invitation from their Organization Management panel.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
