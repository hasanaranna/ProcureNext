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
    if (!email.trim()) return;
    setError('');

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
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex flex-shrink-0 border-b border-slate-200">
        <button onClick={() => setActiveTab('invite')}
          className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 border-b-[3px] ${
            activeTab === 'invite'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}>
          Invite
        </button>
        <button onClick={() => setActiveTab('sent')}
          className={`flex-1 py-3 text-sm font-semibold transition-all duration-200 border-b-[3px] ${
            activeTab === 'sent'
              ? 'border-navy-900 text-navy-900'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}>
          Sent Invitations
          {pendingInvitations.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-navy-900">
              {pendingInvitations.length}
            </span>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {activeTab === 'invite' ? (
          <div className="max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-navy-900 mb-1">Send an Invitation</h3>
            <p className="text-slate-500 text-sm mb-6">
              Enter the email address of the employee you&apos;d like to invite to your organization.
              An invitation link will be generated for you to share.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-semibold text-navy-900 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input id="invite-email" type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="colleague@company.com" required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-navy-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition" />
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit"
                className="w-full py-3 rounded-xl text-white font-bold transition-all duration-300 bg-gradient-to-r from-navy-900 to-navy-800 hover:from-navy-800 hover:to-navy-700 shadow-lg hover:shadow-xl">
                Send Invitation
              </button>

              {submitted && (
                <div className="flex flex-col gap-3 px-4 py-4 rounded-xl text-sm bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 font-semibold text-emerald-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Invitation link sent to email and generated below!
                  </div>
                  {invitationToken && (
                    <div className="flex items-center gap-2">
                      <input type="text" readOnly
                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signup-user?token=${invitationToken}`}
                        className="flex-1 px-3 py-2 rounded-lg text-xs text-slate-700 border border-slate-200 bg-white"
                        onFocus={(e) => e.currentTarget.select()} />
                      <button type="button"
                        onClick={() => {
                          const link = `${window.location.origin}/signup-user?token=${invitationToken}`;
                          navigator.clipboard.writeText(link).then(() => {
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          });
                        }}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex-shrink-0 ${
                          linkCopied
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100'
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
            <h3 className="text-lg font-bold text-navy-900 mb-1">Sent Invitations</h3>
            <p className="text-slate-500 text-sm mb-6">
              {loading ? 'Loading...' : invitations.length === 0 ? 'No invitations sent yet.' : `${invitations.length} invitation${invitations.length > 1 ? 's' : ''} total (${pendingInvitations.length} pending)`}
            </p>

            {loading ? (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-accent-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : invitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">No invitations sent yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {invitations.map((inv) => (
                  <div key={inv.invitation_id}
                    className={`flex items-center justify-between px-5 py-4 rounded-xl border transition-all duration-200 ${
                      inv.status === 'Pending'
                        ? 'bg-white border-slate-200 hover:shadow-md'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm ${
                        inv.status === 'Pending' ? 'bg-gradient-to-br from-accent-500 to-accent-600' : 'bg-slate-400'
                      }`}>
                        {inv.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy-900">{inv.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-slate-400">
                            Sent on {new Date(inv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                            inv.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            inv.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inv.status === 'Pending' && (
                        <>
                          <button onClick={() => handleCopyLink(inv)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                              copiedId === inv.invitation_id
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100'
                            }`}>
                            {copiedId === inv.invitation_id ? 'Copied!' : 'Copy Link'}
                          </button>
                          <button onClick={() => handleCancel(inv.invitation_id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all duration-200">
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
