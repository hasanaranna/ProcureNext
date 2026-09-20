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
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex flex-col max-h-[min(560px,85vh)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 flex-shrink-0 bg-surface border-b border-subtle">
          <div>
            <h2 className="text-sm font-semibold text-content-primary">Organization Management</h2>
            <p className="text-content-secondary text-xs font-medium mt-0.5">Manage invitations and member roles</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded bg-transparent hover:bg-app text-content-secondary hover:text-content-primary flex items-center justify-center transition"
            title="Close">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toggle */}
        <div className="flex justify-center py-2.5 flex-shrink-0 border-b border-subtle bg-app">
          <SlidingToggle
            options={[
              { value: 'invitations', label: 'Invitations' },
              { value: 'roles', label: 'Role Assignment' },
            ]}
            value={section}
            onChange={(v) => setSection(v as 'invitations' | 'roles')}
          />
        </div>

        {/* Content — scrolls only when needed */}
        <div className="overflow-y-auto min-h-0 bg-surface">
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
