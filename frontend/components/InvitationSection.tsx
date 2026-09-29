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
  const [sending, setSending] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/invitations?t=${new Date().getTime()}`, {
        credentials: 'include',
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
    // Guard against double-clicks firing duplicate invitations/emails
    if (!email.trim() || sending) return;
    setError('');
    setSending(true);

    try {
      const res = await fetch('/api/org/invitations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim()
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
        setError(err.detail || err.error?.message || 'Failed to send invitation.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (invitationId: number) => {
    try {
      const res = await fetch(`/api/org/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setInvitations((prev) => prev.filter((inv) => inv.invitation_id !== invitationId));
      } else {
        const err = await res.json();
        alert(err.detail || err.error?.message || 'Failed to cancel invitation.');
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
    <div className="flex flex-col">
      {/* Sub-tabs */}
      <div className="flex flex-shrink-0 border-b border-subtle">
        <button onClick={() => setActiveTab('invite')}
          className={`flex-1 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 ${
            activeTab === 'invite'
              ? 'border-brand-navy text-content-primary'
              : 'border-transparent text-content-muted hover:text-content-secondary'
          }`}>
          Invite
        </button>
        <button onClick={() => setActiveTab('sent')}
          className={`flex-1 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 ${
            activeTab === 'sent'
              ? 'border-brand-navy text-content-primary'
              : 'border-transparent text-content-muted hover:text-content-secondary'
          }`}>
          Sent Invitations
          {pendingInvitations.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white bg-brand-navy">
              {pendingInvitations.length}
            </span>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {activeTab === 'invite' ? (
          <div>
            <h3 className="text-sm font-semibold text-content-primary mb-1">Send an Invitation</h3>
            <p className="text-content-secondary text-xs font-medium mb-4">
              Enter the email address of the employee you&apos;d like to invite to your organization.
              An invitation link will be generated for you to share.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label htmlFor="invite-email" className="block text-xs font-medium text-content-secondary mb-1.5">
                  Email Address <span className="text-status-rejected-text">*</span>
                </label>
                <input id="invite-email" type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="colleague@company.com" required
                  className="w-full px-3 py-2 rounded border border-subtle text-content-primary placeholder-content-muted text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition" />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium bg-status-rejected-bg text-status-rejected-text border border-subtle">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={sending || !email.trim()}
                className="w-full bg-brand-navy text-white hover:bg-slate-900 text-sm font-medium h-9 px-3.5 rounded transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-navy">
                {sending ? 'Sending...' : 'Send Invitation'}
              </button>

              {submitted && (
                <div className="flex flex-col gap-3 px-3 py-3 rounded text-sm bg-status-approved-bg border border-subtle">
                  <div className="flex items-center gap-2 font-semibold text-status-approved-text">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Invitation link sent to email and generated below!
                  </div>
                  {invitationToken && (
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup-user?token=${invitationToken}`}
                        className="flex-1 px-3 py-1.5 rounded text-xs text-content-secondary border border-subtle bg-surface"
                        onFocus={(e) => e.currentTarget.select()} />
                      <button type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/signup-user?token=${invitationToken}`;
                          navigator.clipboard.writeText(link).then(() => {
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          });
                        }}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                          linkCopied
                            ? 'bg-status-approved-bg text-status-approved-text border border-subtle'
                            : 'bg-brand-navy text-white hover:bg-slate-900'
                        }`}>
                        {linkCopied ? (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
                        ) : (
                          <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Copy Link</>
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
            <h3 className="text-sm font-semibold text-content-primary mb-1">Sent Invitations</h3>
            <p className="text-content-secondary text-xs font-medium mb-4">
              {loading ? 'Loading...' : invitations.length === 0 ? 'No invitations sent yet.' : `${invitations.length} invitation${invitations.length > 1 ? 's' : ''} total (${pendingInvitations.length} pending)`}
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-content-muted">
                <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">No invitations sent yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {invitations.map((inv) => (
                  <div key={inv.invitation_id}
                    className={`flex items-center justify-between px-4 py-3 rounded border transition-all duration-200 ${
                      inv.status === 'Pending'
                        ? 'bg-surface border-subtle'
                        : 'bg-app border-subtle opacity-60'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${
                        inv.status === 'Pending' ? 'bg-brand-navy' : 'bg-content-muted'
                      }`}>
                        {inv.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-content-primary">{inv.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-content-secondary text-xs font-medium">
                            Sent on {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <span className={`badge-status ${
                            inv.status === 'Pending' ? 'badge-pending' :
                            inv.status === 'Accepted' ? 'badge-approved' :
                            'badge-rejected'
                          }`}>
                            <span className="badge-dot" />
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inv.status === 'Pending' && (
                        <>
                          <button onClick={() => handleCopyLink(inv)}
                            className={`px-2.5 py-1 rounded text-xs font-medium transition-all duration-200 ${
                              copiedId === inv.invitation_id
                                ? 'bg-status-approved-bg text-status-approved-text border border-subtle'
                                : 'bg-brand-navy text-white hover:bg-slate-900'
                            }`}>
                            {copiedId === inv.invitation_id ? 'Copied!' : 'Copy Link'}
                          </button>
                          <button onClick={() => handleCancel(inv.invitation_id)}
                            className="px-2.5 py-1 rounded text-xs font-medium bg-status-rejected-bg text-status-rejected-text border border-subtle hover:opacity-80 transition-all duration-200">
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
