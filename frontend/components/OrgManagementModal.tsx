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
        <div
          className="flex items-center justify-between px-8 py-5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3a4556 0%, #4a5668 100%)' }}
        >
          <div>
            <h2 className="text-2xl font-bold text-white">Organization Management</h2>
            <p className="text-gray-300 text-sm mt-0.5">Manage invitations and member roles</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors duration-200 text-gray-300 hover:text-white"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toggle */}
        <div className="flex justify-center py-4 flex-shrink-0 border-b" style={{ borderColor: '#e5e7eb' }}>
          <SlidingToggle
            options={[
              { value: 'invitations', label: '📨 Invitations' },
              { value: 'roles', label: '🔑 Role Assignment' },
            ]}
            value={section}
            onChange={(v) => setSection(v as 'invitations' | 'roles')}
            background="linear-gradient(135deg, #3a4556 0%, #4a5668 100%)"
            boxShadow="none"
            activeTextColor="#1f2937"
            inactiveTextColor="#d1d5db"
            paddingX="px-6"
            paddingY="py-2"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
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
