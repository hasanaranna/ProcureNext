'use client';

import { useState, useEffect, useCallback } from 'react';

interface SentInvitation {
  invitation_id: number;
  email: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
}

//organization id, invited_by id (user id) lagbe when sending invitation. for now dummy vals.

export default function InvitationSection() {
  const [activeTab, setActiveTab] = useState<'invite' | 'sent'>('invite');
  const [email, setEmail] = useState('');
  const [invitations, setInvitations] = useState<SentInvitation[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch('/api/org/invitations', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch {
      console.error('Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');

    try {
      const res = await fetch('/api/org/invitations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: email.trim(), 
                               organization_id: 1, // Replace with actual organization ID
                               invited_by: 1  // Replace with actual user ID
                            }),
      });

      if (res.ok) {
        const data = await res.json();
        const token = data.invitation?.token;
        setEmail('');
        setSubmitted(true);
        setInvitationToken(token || null);
        setLinkCopied(false);
        fetchInvitations(); // Refresh the list
      } else {
        const err = await res.json();
        setError(err.error?.message || 'Failed to send invitation.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
  };

  const handleCancel = async (invitationId: number) => {
    try {
      const res = await fetch(`/api/org/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        setInvitations((prev) => prev.filter((inv) => inv.invitation_id !== invitationId));
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Failed to cancel invitation.');
      }
    } catch {
      alert('Network error.');
    }
  };

  const handleCopyLink = (invitation: SentInvitation) => {
    const link = `${window.location.origin}/signup-user?token=${invitation.token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(invitation.invitation_id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const pendingInvitations = invitations.filter((inv) => inv.status === 'Pending');

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex flex-shrink-0 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('invite')}
          className="flex-1 py-3 text-sm font-semibold transition-colors duration-200"
          style={{
            borderBottom: activeTab === 'invite' ? '3px solid #4a5668' : '3px solid transparent',
            color: activeTab === 'invite' ? '#3a4556' : '#6b7280',
          }}
        >
          ✉️ Invite
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className="flex-1 py-3 text-sm font-semibold transition-colors duration-200"
          style={{
            borderBottom: activeTab === 'sent' ? '3px solid #4a5668' : '3px solid transparent',
            color: activeTab === 'sent' ? '#3a4556' : '#6b7280',
          }}
        >
          📬 Sent Invitations
          {pendingInvitations.length > 0 && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: '#4a5668' }}
            >
              {pendingInvitations.length}
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
              Enter the email address of the employee you&apos;d like to invite to your organization.
              An invitation link will be generated for you to share.
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
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="colleague@company.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border-2 text-gray-900 placeholder-gray-400 focus:outline-none transition"
                  style={{ borderColor: '#d1d5db' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#4a5668')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
                />
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-white font-semibold transition-opacity duration-200 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #4a5668 0%, #3a4556 100%)' }}
              >
                Send Invitation
              </button>

              {submitted && (
                <div
                  className="flex flex-col gap-3 px-4 py-4 rounded-xl text-sm"
                  style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}
                >
                  <div className="flex items-center gap-2 font-medium" style={{ color: '#15803d' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Invitation sent successfully!
                  </div>
                  {invitationToken && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup-user?token=${invitationToken}`}
                        className="flex-1 px-3 py-2 rounded-lg text-xs text-gray-700 border"
                        style={{ backgroundColor: '#fff', borderColor: '#d1d5db' }}
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/signup-user?token=${invitationToken}`;
                          navigator.clipboard.writeText(link).then(() => {
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          });
                        }}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 hover:opacity-80 flex-shrink-0"
                        style={{
                          backgroundColor: linkCopied ? '#d1fae5' : '#e0e7ff',
                          color: linkCopied ? '#065f46' : '#3730a3',
                          border: `1px solid ${linkCopied ? '#86efac' : '#c7d2fe'}`,
                        }}
                      >
                        {linkCopied ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Sent Invitations</h3>
            <p className="text-gray-500 text-sm mb-6">
              {loading
                ? 'Loading...'
                : invitations.length === 0
                  ? 'No invitations sent yet.'
                  : `${invitations.length} invitation${invitations.length > 1 ? 's' : ''} total (${pendingInvitations.length} pending)`}
            </p>

            {loading ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : invitations.length === 0 ? (
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
                    key={inv.invitation_id}
                    className="flex items-center justify-between px-5 py-4 rounded-xl border"
                    style={{
                      backgroundColor: inv.status === 'Pending' ? '#f9fafb' : '#f3f4f6',
                      borderColor: '#e5e7eb',
                      opacity: inv.status === 'Pending' ? 1 : 0.7,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: inv.status === 'Pending' ? '#4a5668' : '#9ca3af' }}
                      >
                        {inv.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{inv.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">
                            Sent on {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor:
                                inv.status === 'Pending' ? '#fef3c7' :
                                inv.status === 'Accepted' ? '#d1fae5' :
                                '#fee2e2',
                              color:
                                inv.status === 'Pending' ? '#92400e' :
                                inv.status === 'Accepted' ? '#065f46' :
                                '#b91c1c',
                            }}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inv.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleCopyLink(inv)}
                            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:opacity-80"
                            style={{
                              backgroundColor: copiedId === inv.invitation_id ? '#d1fae5' : '#e0e7ff',
                              color: copiedId === inv.invitation_id ? '#065f46' : '#3730a3',
                              border: `1px solid ${copiedId === inv.invitation_id ? '#86efac' : '#c7d2fe'}`,
                            }}
                          >
                            {copiedId === inv.invitation_id ? '✓ Copied!' : '🔗 Copy Link'}
                          </button>
                          <button
                            onClick={() => handleCancel(inv.invitation_id)}
                            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:opacity-80"
                            style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
