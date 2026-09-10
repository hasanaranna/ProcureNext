'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import OrgManagementModal from '@/components/OrgManagementModal';

// ─── Types ───────────────────────────────────────────────────

interface Participant {
  user_id: number;
  full_name: string;
  is_admin: boolean;
}

interface Thread {
  thread_id: number;
  thread_type: string;
  group_name: string | null;
  participants: Participant[];
  last_message_preview: string | null;
  last_message_time: string | null;
  unread_count: number;
}

interface ChatMessage {
  message_id: number;
  thread_id: number;
  sender_user_id: number;
  sender_name: string;
  message_text: string;
  sent_at: string;
}

interface ContactResult {
  user_id: number;
  full_name: string;
  email: string;
  role_in_org: string;
}

interface MessagingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

// ─── Component ───────────────────────────────────────────────

export default function MessagingSidebar({ isOpen, onClose, onUnreadCountChange }: MessagingSidebarProps) {
  // User state
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [orgName, setOrgName] = useState('');

  // Thread list state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  // Search state (DM)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContactResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Chat view state
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');

  // WebSocket
  const wsRef = useRef<WebSocket | null>(null);

  // Org management modal
  const [orgModalOpen, setOrgModalOpen] = useState(false);

  // Scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ─── Group creation state (from DM chat header ＋ icon) ─────
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<ContactResult[]>([]);
  const [isGroupSearching, setIsGroupSearching] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<ContactResult[]>([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const groupSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Group management state (from inside a group chat) ──────
  const [showMembersOverlay, setShowMembersOverlay] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMemberQuery, setAddMemberQuery] = useState('');
  const [addMemberResults, setAddMemberResults] = useState<ContactResult[]>([]);
  const [isAddMemberSearching, setIsAddMemberSearching] = useState(false);
  const [selectedAddMembers, setSelectedAddMembers] = useState<ContactResult[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const addMemberDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Rename state ─────────────────────────────────────────
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  // ─── Leave / Transfer admin state ─────────────────────────
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showTransferAdmin, setShowTransferAdmin] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<number | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // ─── Helpers ─────────────────────────────────────────────

  const isGroupThread = (thread: Thread) => thread.group_name !== null;

  const isGroupAdmin = (thread: Thread) =>
    thread.participants.find((p) => p.user_id === currentUserId)?.is_admin === true;

  // ─── Load user data ──────────────────────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const userData = JSON.parse(stored);
        setCurrentUserId(userData.user_id);
        setIsOwner(userData.role_in_org === 'Owner');
        setOrgName(userData.organization_name || 'Organization');
      }
    } catch { }
  }, []);

  // ─── WebSocket setup ─────────────────────────────────────

  useEffect(() => {

    // Get token via server-side endpoint (httpOnly cookies aren't readable by JS)
    const getTokenAndConnect = async () => {
      try {
        const res = await fetch('/api/auth/ws-token', { credentials: 'include' });
        if (!res.ok) return;
        const { token } = await res.json();
        if (!token) return;

        // Connect WebSocket directly to FastAPI backend
        const wsUrl = `ws://localhost:8000/ws/messages?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WS] Connected');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_message') {
              const newMsg: ChatMessage = data.message;
              // If we're viewing this thread, append the message
              setActiveThread((current) => {
                if (current && current.thread_id === newMsg.thread_id) {
                  setMessages((prev) => {
                    // Avoid duplicates
                    if (prev.some((m) => m.message_id === newMsg.message_id)) return prev;
                    return [...prev, newMsg];
                  });
                }
                return current;
              });
              // Refresh thread list to update previews
              fetchThreads();
            } else if (data.type === 'group_updated') {
              // Refresh thread list to pick up participant/name changes
              fetchThreads();
              // If we're inside the affected group, handle live updates
              setActiveThread((current) => {
                if (current && current.thread_id === data.thread_id) {
                  // Evict from view if we were removed
                  if (
                    data.action === 'member_removed' &&
                    data.removed_user_id === currentUserId
                  ) {
                    setMessages([]);
                    return null;
                  }
                  // For rename: update group_name locally
                  if (data.action === 'renamed' && data.group_name) {
                    return { ...current, group_name: data.group_name };
                  }
                }
                return current;
              });
            }
          } catch { }
        };

        ws.onclose = () => {
          console.log('[WS] Disconnected');
        };

        wsRef.current = ws;
      } catch { }
    };

    getTokenAndConnect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ─── Scroll to bottom on new messages ────────────────────

  useEffect(() => {
    if (activeThread) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeThread]);

  // ─── API helpers ─────────────────────────────────────────

  const fetchThreads = useCallback(async (): Promise<Thread[]> => {
    setThreadsLoading(true);
    try {
      const res = await fetch('/api/messages/threads', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
        // Keep activeThread participant list in sync
        setActiveThread((current) => {
          if (!current) return null;
          const updated = data.find((t: Thread) => t.thread_id === current.thread_id);
          return updated ? { ...current, ...updated } : current;
        });
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setThreadsLoading(false);
    }
    return [];
  }, []);

  // Fetch threads on mount (so unread badge works even when panel is closed)
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Report total unread count to parent
  useEffect(() => {
    const total = threads.reduce((sum, t) => sum + t.unread_count, 0);
    onUnreadCountChange?.(total);
  }, [threads, onUnreadCountChange]);

  const searchContacts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/messages/contacts/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Failed to search contacts:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      searchContacts(value);
    }, 300);
  };

  const handleSelectContact = async (contact: ContactResult) => {
    try {
      const res = await fetch('/api/messages/threads/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ participant_user_id: contact.user_id }),
      });
      if (res.ok) {
        const data = await res.json();
        // Reset search
        setSearchQuery('');
        setSearchResults([]);
        setShowSearch(false);
        // Refresh threads and open the new/existing thread
        await fetchThreads();
        openThread(data.thread_id, contact.full_name, contact.user_id);
      }
    } catch (err) {
      console.error('Failed to create DM thread:', err);
    }
  };

  const openThread = async (threadId: number, displayName?: string, otherUserId?: number, freshThreads?: Thread[]) => {
    // Find thread in the fresh data (if provided) or the current state
    const searchList = freshThreads ?? threads;
    let thread = searchList.find((t) => t.thread_id === threadId);
    if (!thread) {
      thread = {
        thread_id: threadId,
        thread_type: 'IntraCompany',
        group_name: null,
        participants: [
          { user_id: currentUserId || 0, full_name: 'You', is_admin: false },
          { user_id: otherUserId || 0, full_name: displayName || 'User', is_admin: false },
        ],
        last_message_preview: null,
        last_message_time: null,
        unread_count: 0,
      };
    }
    setActiveThread(thread);
    setMessagesLoading(true);

    try {
      const res = await fetch(`/api/messages/threads/${threadId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }

    // Mark as read
    try {
      await fetch(`/api/messages/threads/${threadId}/read`, {
        method: 'PUT',
        credentials: 'include',
      });
    } catch { }
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !activeThread) return;
    const text = messageInput.trim();
    setMessageInput('');

    try {
      const res = await fetch(`/api/messages/threads/${activeThread.thread_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message_text: text }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.message_id === msg.message_id)) return prev;
          return [...prev, msg];
        });
        // Refresh thread list to update last message preview
        fetchThreads();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleBack = () => {
    setActiveThread(null);
    setMessages([]);
    setShowGroupCreate(false);
    setShowMembersOverlay(false);
    setShowAddMembers(false);
    setIsRenaming(false);
    setShowLeaveConfirm(false);
    setShowTransferAdmin(false);
    fetchThreads(); // Refresh to update unread counts
  };

  // ─── Group creation ───────────────────────────────────────

  const searchGroupContacts = async (query: string) => {
    if (!query.trim()) { setGroupSearchResults([]); return; }
    setIsGroupSearching(true);
    try {
      const res = await fetch(`/api/messages/contacts/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      if (res.ok) setGroupSearchResults(await res.json());
    } catch { }
    finally { setIsGroupSearching(false); }
  };

  const handleGroupSearchInput = (value: string) => {
    setGroupSearchQuery(value);
    if (groupSearchDebounceRef.current) clearTimeout(groupSearchDebounceRef.current);
    if (!value.trim()) { setGroupSearchResults([]); return; }
    groupSearchDebounceRef.current = setTimeout(() => searchGroupContacts(value), 300);
  };

  const toggleGroupMember = (contact: ContactResult) => {
    setSelectedGroupMembers((prev) => {
      if (prev.some((m) => m.user_id === contact.user_id)) {
        return prev.filter((m) => m.user_id !== contact.user_id);
      }
      return [...prev, contact];
    });
  };

  const handleCreateGroup = async () => {
    if (!activeThread || !groupNameInput.trim() || selectedGroupMembers.length === 0) return;
    setIsCreatingGroup(true);
    try {
      // The other person in the current DM is auto-included
      const dmOther = activeThread.participants.find((p) => p.user_id !== currentUserId);
      const allParticipantIds = [
        ...(dmOther ? [dmOther.user_id] : []),
        ...selectedGroupMembers.map((m) => m.user_id),
      ];
      const uniqueIds = [...new Set(allParticipantIds)];

      const res = await fetch('/api/messages/threads/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          participant_user_ids: uniqueIds,
          group_name: groupNameInput.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowGroupCreate(false);
        setGroupNameInput('');
        setSelectedGroupMembers([]);
        setGroupSearchQuery('');
        setGroupSearchResults([]);
        const freshThreads = await fetchThreads();
        openThread(data.thread_id, undefined, undefined, freshThreads);
      }
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // ─── Rename group ─────────────────────────────────────────

  const handleRenameSubmit = async () => {
    if (!activeThread || !renameInput.trim()) return;
    try {
      const res = await fetch(`/api/messages/threads/${activeThread.thread_id}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ group_name: renameInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveThread((t) => t ? { ...t, group_name: data.group_name } : t);
        setIsRenaming(false);
      }
    } catch (err) {
      console.error('Failed to rename group:', err);
    }
  };

  // ─── Add members to group ────────────────────────────────

  const searchAddMemberContacts = async (query: string) => {
    if (!query.trim()) { setAddMemberResults([]); return; }
    setIsAddMemberSearching(true);
    try {
      const res = await fetch(`/api/messages/contacts/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data: ContactResult[] = await res.json();
        // Exclude users already in the group
        const existingIds = new Set(activeThread?.participants.map((p) => p.user_id) ?? []);
        setAddMemberResults(data.filter((c) => !existingIds.has(c.user_id)));
      }
    } catch { }
    finally { setIsAddMemberSearching(false); }
  };

  const handleAddMemberSearchInput = (value: string) => {
    setAddMemberQuery(value);
    if (addMemberDebounceRef.current) clearTimeout(addMemberDebounceRef.current);
    if (!value.trim()) { setAddMemberResults([]); return; }
    addMemberDebounceRef.current = setTimeout(() => searchAddMemberContacts(value), 300);
  };

  const toggleAddMember = (contact: ContactResult) => {
    setSelectedAddMembers((prev) =>
      prev.some((m) => m.user_id === contact.user_id)
        ? prev.filter((m) => m.user_id !== contact.user_id)
        : [...prev, contact]
    );
  };

  const handleAddMembers = async () => {
    if (!activeThread || selectedAddMembers.length === 0) return;
    setIsAddingMembers(true);
    try {
      const res = await fetch(`/api/messages/threads/${activeThread.thread_id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_ids: selectedAddMembers.map((m) => m.user_id) }),
      });
      if (res.ok) {
        setShowAddMembers(false);
        setSelectedAddMembers([]);
        setAddMemberQuery('');
        setAddMemberResults([]);
        await fetchThreads();
      }
    } catch (err) {
      console.error('Failed to add members:', err);
    } finally {
      setIsAddingMembers(false);
    }
  };

  // ─── Remove member ────────────────────────────────────────

  const handleRemoveMember = async (targetUserId: number) => {
    if (!activeThread) return;
    try {
      const res = await fetch(`/api/messages/threads/${activeThread.thread_id}/members/${targetUserId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        await fetchThreads();
        setShowMembersOverlay(false);
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  // ─── Transfer admin ───────────────────────────────────────

  const handleTransferAdmin = async () => {
    if (!activeThread || !transferTargetId) return;
    setIsTransferring(true);
    try {
      const res = await fetch(`/api/messages/threads/${activeThread.thread_id}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ new_admin_user_id: transferTargetId }),
      });
      if (res.ok) {
        setShowTransferAdmin(false);
        setTransferTargetId(null);
        await fetchThreads();
      }
    } catch (err) {
      console.error('Failed to transfer admin:', err);
    } finally {
      setIsTransferring(false);
    }
  };

  // ─── Leave group ──────────────────────────────────────────

  const handleLeaveGroup = async () => {
    if (!activeThread) return;
    setIsLeaving(true);
    try {
      const res = await fetch(`/api/messages/threads/${activeThread.thread_id}/leave`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setShowLeaveConfirm(false);
        setActiveThread(null);
        setMessages([]);
        await fetchThreads();
      } else {
        const err = await res.json();
        // Backend returns 400 if admin must transfer first
        alert(err.detail || 'Could not leave group.');
        setShowLeaveConfirm(false);
      }
    } catch (err) {
      console.error('Failed to leave group:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  // ─── Display helpers ─────────────────────────────────────

  const getThreadDisplayName = (thread: Thread): string => {
    if (thread.group_name) return thread.group_name;
    const other = thread.participants.find((p) => p.user_id !== currentUserId);
    return other?.full_name || 'Unknown';
  };

  const getOtherParticipant = (thread: Thread): Participant | undefined => {
    return thread.participants.find((p) => p.user_id !== currentUserId);
  };

  const getAvatarUrl = (name: string, bgColor: string = '0d9488') => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=40&bold=true`;
  };

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return '';
    // PostgreSQL TIMESTAMP has no timezone suffix — append Z so JS treats it as UTC,
    // then toLocaleTimeString converts to the browser's local timezone automatically.
    const normalized = /[Z+\-]\d{0,2}:?\d{0,2}$/.test(isoString) ? isoString : isoString + 'Z';
    const date = new Date(normalized);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const avatarColors = ['0d9488', '0f766e', 'f59e0b', '3b82f6', '6366f1', '8b5cf6', 'ec4899'];
  const getColorForUser = (userId: number) => avatarColors[userId % avatarColors.length];

  // ─── Shared sub-component: Contact picker row ─────────────

  const ContactPickerRow = ({
    contact,
    isSelected,
    onToggle,
    isLocked = false,
  }: {
    contact: ContactResult;
    isSelected: boolean;
    onToggle: () => void;
    isLocked?: boolean;
  }) => (
    <button
      onClick={isLocked ? undefined : onToggle}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 last:border-0 ${isLocked ? 'opacity-60 cursor-default' : 'hover:bg-slate-50 cursor-pointer'}`}
    >
      <img
        src={getAvatarUrl(contact.full_name, getColorForUser(contact.user_id))}
        alt={contact.full_name}
        className="w-9 h-9 rounded-xl flex-shrink-0 shadow-sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-navy-900 truncate">{contact.full_name}</p>
        <p className="text-xs text-slate-500 truncate">{contact.email}</p>
      </div>
      <span className="text-xs font-bold text-accent-600 bg-accent-50 px-2 py-1 rounded-full flex-shrink-0 border border-accent-100 mr-2">
        {isLocked ? 'Auto-added' : contact.role_in_org}
      </span>
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${isSelected ? 'bg-accent-500 border-accent-500' : 'border-slate-300 bg-white'}`}>
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </button>
  );

  // ─── Render ──────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-navy-950/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-screen z-40 flex flex-col shadow-2xl transition-all duration-300 overflow-hidden bg-slate-50"
        style={{
          width: 'min(90vw, 400px)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {!activeThread ? (
          /* ─── DM List View ─── */
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0 bg-gradient-to-r from-navy-950 to-navy-900 shadow-md z-10">
              <div>
                <h2 className="text-lg font-black text-white">{orgName}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Team Messages</p>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && (
                  <button onClick={() => setOrgModalOpen(true)}
                    className="p-2 rounded-full transition-all duration-200 bg-white/10 hover:bg-white/20 text-white"
                    title="Organization Management">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </button>
                )}
                <button onClick={onClose}
                  className="p-2 rounded-full transition-all duration-200 bg-white/10 hover:bg-white/20 text-white"
                  title="Close sidebar">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-5 py-4 border-b border-slate-200 bg-white shadow-sm z-0">
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" value={searchQuery}
                      onChange={(e) => { handleSearchInput(e.target.value); setShowSearch(true); }}
                      onFocus={() => setShowSearch(true)}
                      placeholder="Search colleagues to message..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-navy-900 bg-slate-50 outline-none focus:bg-white focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all"
                    />
                  </div>
                  {showSearch && (
                    <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
                      className="text-xs text-slate-500 hover:text-navy-900 font-bold transition-colors">
                      Cancel
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showSearch && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-64 overflow-y-auto">
                    {isSearching ? (
                      <div className="px-4 py-4 text-sm text-slate-400 text-center flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75"></path></svg>
                        Searching...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-slate-400 text-center">No contacts found</div>
                    ) : (
                      searchResults.map((contact) => (
                        <button key={contact.user_id} onClick={() => handleSelectContact(contact)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                          <img src={getAvatarUrl(contact.full_name, getColorForUser(contact.user_id))} alt={contact.full_name}
                            className="w-10 h-10 rounded-xl flex-shrink-0 shadow-sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-navy-900 truncate">{contact.full_name}</p>
                            <p className="text-xs text-slate-500 truncate">{contact.email}</p>
                          </div>
                          <span className="text-xs font-bold text-accent-600 bg-accent-50 px-2 py-1 rounded-full flex-shrink-0 capitalize border border-accent-100">
                            {contact.role_in_org}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto bg-white">
              {threadsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
                </div>
              ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <svg className="w-16 h-16 text-slate-300 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-lg font-bold text-slate-400 mb-1">No conversations yet</h3>
                  <p className="text-sm text-slate-400">Search for a colleague above to start messaging</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {threads.map((thread) => {
                    const displayName = getThreadDisplayName(thread);
                    const isGroup = isGroupThread(thread);
                    const other = getOtherParticipant(thread);
                    const avatarColor = other ? getColorForUser(other.user_id) : '0d9488';

                    return (
                      <div key={thread.thread_id} onClick={() => openThread(thread.thread_id)}
                        className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all duration-200 hover:bg-slate-50 group">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {isGroup ? (
                            /* Group icon */
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                          ) : (
                            <img src={getAvatarUrl(displayName, avatarColor)} alt={displayName}
                              className="w-12 h-12 rounded-2xl shadow-sm group-hover:scale-105 transition-transform" />
                          )}
                          {thread.unread_count > 0 && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent-500 rounded-full border-2 border-white animate-pulse" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className={`text-sm truncate ${thread.unread_count > 0 ? 'font-black text-navy-900' : 'font-bold text-slate-700'}`}>
                              {displayName}
                            </h3>
                            <span className="text-xs text-slate-400 flex-shrink-0 ml-2 font-medium">
                              {formatTime(thread.last_message_time)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className={`text-xs truncate ${thread.unread_count > 0 ? 'font-semibold text-navy-800' : 'text-slate-500'}`}>
                              {isGroup && (
                                <span className="text-indigo-500 font-bold mr-1">
                                  {thread.participants.length} members ·
                                </span>
                              )}
                              {thread.last_message_preview || 'No messages yet'}
                            </p>
                            {thread.unread_count > 0 && (
                              <span className="ml-2 flex-shrink-0 px-2 py-0.5 rounded-full bg-accent-500 text-white text-[10px] font-bold">
                                {thread.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ─── Chat View ─── */
          <>
            {/* ── Group creation overlay (shown over DM chat) ── */}
            {showGroupCreate && (
              <div className="absolute inset-0 z-50 bg-white flex flex-col">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600">
                  <button onClick={() => { setShowGroupCreate(false); setGroupNameInput(''); setSelectedGroupMembers([]); setGroupSearchQuery(''); setGroupSearchResults([]); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-white">New Group Chat</h3>
                    <p className="text-xs text-white/70">
                      {activeThread.participants.find((p) => p.user_id !== currentUserId)?.full_name} is auto-included
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  {/* Group name input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Group Name</label>
                    <input
                      type="text"
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      placeholder="e.g. Project Alpha, Finance Team..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-navy-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Auto-added member chip */}
                  {(() => {
                    const dmOther = activeThread.participants.find((p) => p.user_id !== currentUserId);
                    return dmOther ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Auto-included</label>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                            <img src={getAvatarUrl(dmOther.full_name, getColorForUser(dmOther.user_id))} className="w-4 h-4 rounded-full" alt="" />
                            {dmOther.full_name}
                          </span>
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Selected additional members */}
                  {selectedGroupMembers.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Also adding</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedGroupMembers.map((m) => (
                          <span key={m.user_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-100 text-accent-700 rounded-full text-xs font-bold">
                            <img src={getAvatarUrl(m.full_name, getColorForUser(m.user_id))} className="w-4 h-4 rounded-full" alt="" />
                            {m.full_name}
                            <button onClick={() => toggleGroupMember(m)} className="hover:text-red-500 transition-colors ml-0.5">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Search more colleagues */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Add more colleagues</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={groupSearchQuery}
                        onChange={(e) => handleGroupSearchInput(e.target.value)}
                        placeholder="Search colleagues..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 focus:bg-white transition-all"
                      />
                    </div>

                    {groupSearchQuery.trim() && (
                      <div className="mt-2 bg-white rounded-xl border border-slate-200 shadow-sm max-h-48 overflow-y-auto">
                        {isGroupSearching ? (
                          <p className="text-xs text-slate-400 text-center py-4">Searching...</p>
                        ) : groupSearchResults.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No results</p>
                        ) : (
                          groupSearchResults
                            .filter((c) => {
                              // Exclude the DM partner (already auto-included)
                              const dmOtherId = activeThread.participants.find((p) => p.user_id !== currentUserId)?.user_id;
                              return c.user_id !== dmOtherId;
                            })
                            .map((contact) => (
                              <ContactPickerRow
                                key={contact.user_id}
                                contact={contact}
                                isSelected={selectedGroupMembers.some((m) => m.user_id === contact.user_id)}
                                onToggle={() => toggleGroupMember(contact)}
                              />
                            ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Create button */}
                <div className="p-4 border-t border-slate-200 bg-white">
                  <button
                    onClick={handleCreateGroup}
                    disabled={!groupNameInput.trim() || selectedGroupMembers.length === 0 || isCreatingGroup}
                    className={`w-full py-3 rounded-2xl text-sm font-bold transition-all duration-200 shadow-md ${groupNameInput.trim() && selectedGroupMembers.length > 0 && !isCreatingGroup
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                  >
                    {isCreatingGroup ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Add Members overlay (shown over group chat) ── */}
            {showAddMembers && (
              <div className="absolute inset-0 z-50 bg-white flex flex-col">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600">
                  <button onClick={() => { setShowAddMembers(false); setSelectedAddMembers([]); setAddMemberQuery(''); setAddMemberResults([]); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-white">Add Members</h3>
                    <p className="text-xs text-white/70">{activeThread.group_name}</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  {selectedAddMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedAddMembers.map((m) => (
                        <span key={m.user_id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-100 text-accent-700 rounded-full text-xs font-bold">
                          <img src={getAvatarUrl(m.full_name, getColorForUser(m.user_id))} className="w-4 h-4 rounded-full" alt="" />
                          {m.full_name}
                          <button onClick={() => toggleAddMember(m)} className="hover:text-red-500 transition-colors ml-0.5">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={addMemberQuery}
                      onChange={(e) => handleAddMemberSearchInput(e.target.value)}
                      placeholder="Search colleagues to add..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50 focus:bg-white transition-all"
                    />
                  </div>
                  {addMemberQuery.trim() && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-h-64 overflow-y-auto">
                      {isAddMemberSearching ? (
                        <p className="text-xs text-slate-400 text-center py-4">Searching...</p>
                      ) : addMemberResults.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No results (or all colleagues already in group)</p>
                      ) : (
                        addMemberResults.map((contact) => (
                          <ContactPickerRow
                            key={contact.user_id}
                            contact={contact}
                            isSelected={selectedAddMembers.some((m) => m.user_id === contact.user_id)}
                            onToggle={() => toggleAddMember(contact)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-white">
                  <button
                    onClick={handleAddMembers}
                    disabled={selectedAddMembers.length === 0 || isAddingMembers}
                    className={`w-full py-3 rounded-2xl text-sm font-bold transition-all duration-200 shadow-md ${selectedAddMembers.length > 0 && !isAddingMembers
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                  >
                    {isAddingMembers ? 'Adding...' : `Add ${selectedAddMembers.length > 0 ? selectedAddMembers.length : ''} Member${selectedAddMembers.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}

            {/* ── Members overlay (click "N members") ── */}
            {showMembersOverlay && activeThread && (
              <div className="absolute inset-0 z-50 bg-white flex flex-col">
                <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600">
                  <button onClick={() => setShowMembersOverlay(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <h3 className="text-sm font-black text-white">{activeThread.participants.length} Members</h3>
                    <p className="text-xs text-white/70">{activeThread.group_name}</p>
                  </div>
                </div>

                {/* Transfer admin sub-panel */}
                {showTransferAdmin && (
                  <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
                    <p className="text-xs font-bold text-amber-700 mb-2">Select new admin before leaving:</p>
                    <div className="flex flex-col gap-1">
                      {activeThread.participants
                        .filter((p) => p.user_id !== currentUserId)
                        .map((p) => (
                          <button
                            key={p.user_id}
                            onClick={() => setTransferTargetId(p.user_id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${transferTargetId === p.user_id ? 'bg-amber-200 text-amber-900 font-bold' : 'hover:bg-amber-100 text-amber-800'}`}
                          >
                            <img src={getAvatarUrl(p.full_name, getColorForUser(p.user_id))} className="w-6 h-6 rounded-lg" alt="" />
                            {p.full_name}
                          </button>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleTransferAdmin}
                        disabled={!transferTargetId || isTransferring}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white disabled:opacity-50"
                      >
                        {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                      </button>
                      <button
                        onClick={() => { setShowTransferAdmin(false); setTransferTargetId(null); }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-200 text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {activeThread.participants.map((p) => {
                    const isSelf = p.user_id === currentUserId;
                    const amAdmin = isGroupAdmin(activeThread);
                    return (
                      <div key={p.user_id} className="flex items-center gap-3 px-4 py-3">
                        <img src={getAvatarUrl(p.full_name, getColorForUser(p.user_id))} alt={p.full_name} className="w-10 h-10 rounded-xl shadow-sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-navy-900 truncate">
                            {p.full_name}
                            {isSelf && <span className="text-slate-400 font-normal"> (you)</span>}
                          </p>
                          {p.is_admin && (
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wide">Admin</span>
                          )}
                        </div>
                        {/* Admin can remove non-self members */}
                        {amAdmin && !isSelf && (
                          <button
                            onClick={() => handleRemoveMember(p.user_id)}
                            className="text-xs font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Admin transfer button at bottom */}
                {isGroupAdmin(activeThread) && !showTransferAdmin && (
                  <div className="p-4 border-t border-slate-200 bg-white">
                    <button
                      onClick={() => setShowTransferAdmin(true)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
                    >
                      Transfer Admin Role
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Leave Confirmation Modal ── */}
            {showLeaveConfirm && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-xs w-full">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <h3 className="text-base font-black text-navy-900 text-center mb-1">Leave Group?</h3>
                  <p className="text-sm text-slate-500 text-center mb-5">
                    You won&apos;t be able to read new messages unless you&apos;re added back.
                    {isGroupAdmin(activeThread) && activeThread.participants.length > 1 && (
                      <span className="block mt-2 text-amber-600 font-semibold">
                        You&apos;re the admin — transfer admin rights before leaving.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLeaveConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLeaveGroup}
                      disabled={isLeaving}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      {isLeaving ? 'Leaving...' : 'Leave'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Chat Header (DM or Group) ── */}
            <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-10">
              <button onClick={handleBack}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-slate-100 hover:bg-slate-200 text-slate-600"
                title="Back to conversations">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {isGroupThread(activeThread) ? (
                /* Group avatar */
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm hidden sm:flex flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              ) : (
                <img src={getAvatarUrl(getThreadDisplayName(activeThread), getOtherParticipant(activeThread) ? getColorForUser(getOtherParticipant(activeThread)!.user_id) : '0d9488')}
                  alt="Avatar" className="w-9 h-9 rounded-xl shadow-sm hidden sm:block" />
              )}

              <div className="flex-1 min-w-0">
                {/* Rename inline for group admin */}
                {isGroupThread(activeThread) && isRenaming ? (
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setIsRenaming(false); }}
                    autoFocus
                    className="text-sm font-bold text-navy-900 border-b-2 border-indigo-500 outline-none bg-transparent w-full"
                  />
                ) : (
                  <h2 className="text-sm font-bold text-navy-900 truncate flex items-center gap-1.5">
                    {getThreadDisplayName(activeThread)}
                    {isGroupThread(activeThread) && isGroupAdmin(activeThread) && (
                      <button
                        onClick={() => { setRenameInput(activeThread.group_name || ''); setIsRenaming(true); }}
                        className="text-slate-400 hover:text-indigo-500 transition-colors flex-shrink-0"
                        title="Rename group"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </h2>
                )}
                {isGroupThread(activeThread) ? (
                  <button
                    onClick={() => setShowMembersOverlay(true)}
                    className="text-xs text-indigo-500 font-semibold hover:text-indigo-700 transition-colors truncate text-left"
                  >
                    {activeThread.participants.length} members
                  </button>
                ) : (
                  <p className="text-xs text-slate-500 truncate font-medium">
                    {activeThread.participants.filter((p) => p.user_id !== currentUserId).map((p) => p.full_name).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* ＋ icon: DM → create group; Group (admin) → add member */}
                {isGroupThread(activeThread) ? (
                  isGroupAdmin(activeThread) && (
                    <button
                      onClick={() => { setShowAddMembers(true); setSelectedAddMembers([]); setAddMemberQuery(''); setAddMemberResults([]); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700"
                      title="Add member"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => { setShowGroupCreate(true); setGroupNameInput(''); setSelectedGroupMembers([]); setGroupSearchQuery(''); setGroupSearchResults([]); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700"
                    title="Create group chat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </button>
                )}

                {/* Leave button (group chats only) */}
                {isGroupThread(activeThread) && (
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 text-red-400 hover:bg-red-50 hover:text-red-600"
                    title="Leave group"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                )}

                <button onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  title="Close sidebar">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 bg-slate-50">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center h-full">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <svg className="w-8 h-8 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-navy-900 mb-1">Start a conversation</p>
                  <p className="text-xs text-slate-500">Say hello to {getThreadDisplayName(activeThread)}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isOwn = msg.sender_user_id === currentUserId;
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const isConsecutive = prevMsg && prevMsg.sender_user_id === msg.sender_user_id;
                    const showTime = !prevMsg || new Date(msg.sent_at).getTime() - new Date(prevMsg.sent_at).getTime() > 5 * 60000;

                    return (
                      <div key={msg.message_id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${isConsecutive && !showTime ? 'mt-1' : 'mt-4'}`}>
                        {showTime && (
                          <div className="w-full text-center my-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full">{formatTime(msg.sent_at)}</span>
                          </div>
                        )}
                        {!isOwn && !isConsecutive && (
                          <span className="text-xs font-bold text-slate-500 mb-1 ml-2">
                            {msg.sender_name}
                          </span>
                        )}
                        <div className={`px-4 py-2.5 max-w-[80%] shadow-sm ${isOwn
                            ? 'bg-gradient-to-br from-accent-500 to-accent-600 text-white rounded-2xl rounded-tr-sm'
                            : 'bg-white text-navy-900 rounded-2xl rounded-tl-sm border border-slate-100'
                          }`}>
                          <p className="text-sm leading-relaxed">{msg.message_text}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="px-4 sm:px-5 py-4 bg-white border-t border-slate-200 flex items-center gap-3 flex-shrink-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type a message..."
                className="flex-1 px-5 py-3 rounded-2xl border border-slate-300 text-sm text-navy-900 outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 bg-slate-50 focus:bg-white transition-all shadow-inner" />
              <button onClick={handleSend} disabled={!messageInput.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md flex-shrink-0 ${messageInput.trim()
                    ? 'bg-gradient-to-br from-accent-500 to-accent-600 text-white hover:shadow-lg hover:scale-105'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}>
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      <OrgManagementModal isOpen={orgModalOpen} onClose={() => setOrgModalOpen(false)} />
    </>
  );
}
