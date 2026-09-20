'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrgMember {
  org_user_id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone: string;
  role_in_org: string;
  status: string;
  joined_at: string;
}

const roles = ['Owner', 'ProcurementOfficer', 'Finance', 'Viewer', 'TenderReceiver'];
const roleLabels: Record<string, string> = {
  Owner: 'Owner',
  ProcurementOfficer: 'Procurement Officer',
  Finance: 'Finance',
  Viewer: 'Viewer',
  TenderReceiver: 'Tender Receiver',
};

export default function RoleAssignmentSection() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/members?t=${new Date().getTime()}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      console.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (orgUserId: number, newRole: string) => {
    setUpdatingId(orgUserId);
    try {
      const res = await fetch(`/api/org/members/${orgUserId}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.org_user_id === orgUserId ? { ...m, role_in_org: newRole } : m))
        );
        setSuccessId(orgUserId);
        setTimeout(() => setSuccessId(null), 2000);
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Failed to update role.');
      }
    } catch {
      alert('Network error.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Get the current logged-in user to identify the primary owner
  const currentUser = (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <svg className="animate-spin h-8 w-8 text-brand-blue" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-1">Role Assignment</h3>
        <p className="text-content-secondary text-xs font-medium mb-4">
          Assign roles to your organization members to manage their access and permissions.
        </p>

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-content-muted">
            <svg className="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm font-medium">No members in your organization yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map((member) => {
              const isPrimaryOwner = currentUser && member.user_id === currentUser.user_id;
              const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.full_name || member.email)}&background=${member.role_in_org === 'Owner' ? 'f59e0b' :
                  member.role_in_org === 'ProcurementOfficer' ? '0d9488' :
                    member.role_in_org === 'Finance' ? '10b981' :
                      '6366f1'
                }&color=fff&size=36&bold=true`;

              return (
                <div key={member.org_user_id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 rounded border border-subtle bg-surface hover:bg-app transition-all duration-200 gap-3">
                  <div className="flex items-center gap-3">
                    <img src={avatarUrl} alt={member.full_name || member.email}
                      className="w-8 h-8 rounded flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-content-primary">
                          {member.full_name || 'Unnamed User'}
                        </p>
                        {isPrimaryOwner && (
                          <span className="badge-status badge-pending">
                            <span className="badge-dot" />You
                          </span>
                        )}
                      </div>
                      <p className="text-content-secondary text-xs font-medium mt-0.5">{member.email}</p>
                      <p className="text-content-secondary text-xs font-medium">
                        Joined {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Success indicator */}
                    {successId === member.org_user_id && (
                      <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}

                    {/* Loading indicator */}
                    {updatingId === member.org_user_id && (
                      <svg className="animate-spin w-5 h-5 text-brand-blue" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}

                    {isPrimaryOwner ? (
                      <span className="px-3 py-1.5 rounded text-sm font-medium text-content-secondary bg-app border border-subtle">
                        {roleLabels[member.role_in_org] || member.role_in_org}
                      </span>
                    ) : (
                      <select value={member.role_in_org}
                        onChange={(e) => handleRoleChange(member.org_user_id, e.target.value)}
                        disabled={updatingId === member.org_user_id}
                        className="px-3 py-1.5 rounded border border-subtle text-sm font-medium text-content-primary outline-none cursor-pointer focus:ring-2 focus:ring-brand-blue focus:border-transparent transition disabled:opacity-50 bg-surface">
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role] || role}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
