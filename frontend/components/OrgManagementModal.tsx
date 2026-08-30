'use client';

import { useState } from 'react';
import ModalShell from '@/components/ModalShell';
import SlidingToggle from '@/components/SlidingToggle';
import InvitationSection from '@/components/InvitationSection';
import RoleAssignmentSection from '@/components/RoleAssignmentSection';

interface OrgManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OrgManagementModal({ isOpen, onClose }: OrgManagementModalProps) {
  const [section, setSection] = useState<'invitations' | 'roles'>('invitations');

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="none" width="80vw" height="80vh">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 md:px-8 py-5 flex-shrink-0 bg-gradient-to-r from-navy-950 to-navy-900">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white">Organization Management</h2>
            <p className="text-slate-400 text-sm mt-0.5">Manage invitations and member roles</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            title="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toggle */}
        <div className="flex justify-center py-4 flex-shrink-0 border-b border-slate-200 bg-white">
          <SlidingToggle
            options={[
              { value: 'invitations', label: 'Invitations' },
              { value: 'roles', label: 'Role Assignment' },
            ]}
            value={section}
            onChange={(v) => setSection(v as 'invitations' | 'roles')}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-white">
          {section === 'invitations' ? (
            <InvitationSection />
          ) : (
            <RoleAssignmentSection />
          )}
        </div>
      </div>
    </ModalShell>
  );
}
