'use client';

import { useState } from 'react';
import ModalShell from '@/components/ModalShell';

interface SentInvitation {
  email: string;
  sentAt: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const dummyInvitations: SentInvitation[] = [
  { email: 'alice.johnson@example.com', sentAt: 'March 10, 2026' },
  { email: 'robert.khan@techcorp.io', sentAt: 'March 9, 2026' },
  { email: 'sara.ahmed@buildright.com', sentAt: 'March 7, 2026' },
  { email: 'mike.torres@globalco.net', sentAt: 'March 5, 2026' },
];

export default function InviteModal({ isOpen, onClose }: InviteModalProps) {
  const [activeTab, setActiveTab] = useState<'invite' | 'sent'>('invite');
  const [email, setEmail] = useState('');
  const [invitations, setInvitations] = useState<SentInvitation[]>(dummyInvitations);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInvitations((prev) => [
      { email: email.trim(), sentAt: 'March 12, 2026' },
      ...prev,
    ]);
    setEmail('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleCancel = (targetEmail: string) => {
    setInvitations((prev) => prev.filter((inv) => inv.email !== targetEmail));
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="none" width="80vw" height="80vh">
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-5 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #3a4556 0%, #4a5668 100%)' }}
      >
        <div>
          <h2 className="text-2xl font-bold text-white">Invite Employees</h2>
          <p className="text-gray-300 text-sm mt-0.5">Manage your team invitations</p>
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

      {/* Tab Bar */}
      <div className="flex flex-shrink-0 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('invite')}
          className="flex-1 py-4 text-sm font-semibold transition-colors duration-200"
          style={{
            borderBottom: activeTab === 'invite' ? '3px solid #4a5668' : '3px solid transparent',
            color: activeTab === 'invite' ? '#3a4556' : '#6b7280',
          }}
        >
          ✉️ Invite
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className="flex-1 py-4 text-sm font-semibold transition-colors duration-200"
          style={{
            borderBottom: activeTab === 'sent' ? '3px solid #4a5668' : '3px solid transparent',
            color: activeTab === 'sent' ? '#3a4556' : '#6b7280',
          }}
        >
          📬 Sent Invitations
          {invitations.length > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: '#4a5668' }}
            >
              {invitations.length}
            </span>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'invite' ? (
          <div className="max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Send an Invitation</h3>
            <p className="text-gray-500 text-sm mb-6">
              Enter the email address of the employee you'd like to invite to your organization.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 text-gray-900 placeholder-gray-400 focus:outline-none transition"
                  style={{ borderColor: '#d1d5db' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#4a5668')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-white font-semibold transition-opacity duration-200 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #4a5668 0%, #3a4556 100%)' }}
              >
                Send Invitation
              </button>

              {submitted && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Invitation sent successfully!
                </div>
              )}
            </form>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Sent Invitations</h3>
            <p className="text-gray-500 text-sm mb-6">
              {invitations.length === 0
                ? 'No pending invitations.'
                : `${invitations.length} pending invitation${invitations.length > 1 ? 's' : ''}`}
            </p>

            {invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">No invitations sent yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {invitations.map((inv) => (
                  <div
                    key={inv.email}
                    className="flex items-center justify-between px-5 py-4 rounded-xl border"
                    style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: '#4a5668' }}
                      >
                        {inv.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{inv.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Sent on {inv.sentAt}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancel(inv.email)}
                      className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:opacity-80"
                      style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                    >
                      Cancel Invitation
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
