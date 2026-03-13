'use client';

import { useState } from 'react';

interface OrgMember {
  id: number;
  name: string;
  email: string;
  avatar: string;
  role: string;
}

const roles = [
  'Admin',
  'Procurement Manager',
  'Finance Officer',
  'Tender Reviewer',
  'Viewer',
];

const dummyMembers: OrgMember[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice.johnson@example.com', avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=6366f1&color=fff&size=36', role: 'Admin' },
  { id: 2, name: 'Bob Smith', email: 'bob.smith@techcorp.io', avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=3b82f6&color=fff&size=36', role: 'Procurement Manager' },
  { id: 3, name: 'Sara Ahmed', email: 'sara.ahmed@buildright.com', avatar: 'https://ui-avatars.com/api/?name=Sara+Ahmed&background=10b981&color=fff&size=36', role: 'Finance Officer' },
  { id: 4, name: 'David Park', email: 'david.park@globalco.net', avatar: 'https://ui-avatars.com/api/?name=David+Park&background=f59e0b&color=fff&size=36', role: 'Tender Reviewer' },
  { id: 5, name: 'Emily Chen', email: 'emily.chen@acmecorp.com', avatar: 'https://ui-avatars.com/api/?name=Emily+Chen&background=ec4899&color=fff&size=36', role: 'Viewer' },
  { id: 6, name: 'Marcus Brown', email: 'marcus.brown@metro.io', avatar: 'https://ui-avatars.com/api/?name=Marcus+Brown&background=ef4444&color=fff&size=36', role: 'Procurement Manager' },
];

export default function RoleAssignmentSection() {
  const [members, setMembers] = useState<OrgMember[]>(dummyMembers);

  const handleRoleChange = (memberId: number, newRole: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-8">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Role Assignment</h3>
        <p className="text-gray-500 text-sm mb-6">
          Assign roles to your organization members to manage their access and permissions.
        </p>

        <div className="flex flex-col gap-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-5 py-4 rounded-xl border"
              style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}
            >
              <div className="flex items-center gap-3">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-9 h-9 rounded-full flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{member.email}</p>
                </div>
              </div>

              <select
                value={member.role}
                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-700 outline-none cursor-pointer transition"
                style={{ borderColor: '#d1d5db', backgroundColor: '#ffffff' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4a5668')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
