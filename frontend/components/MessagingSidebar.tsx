'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import OrgManagementModal from '@/components/OrgManagementModal';

// ─── Types ───────────────────────────────────────────────────

interface Participant {
  user_id: number;
  full_name: string;
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
}

// ─── Component ───────────────────────────────────────────────

export default function MessagingSidebar({ isOpen, onClose }: MessagingSidebarProps) {
  // User state
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [orgName, setOrgName] = useState('');

  // Thread list state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  // Search state
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
    if (!isOpen) return;

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
  }, [isOpen]);

  // ─── Scroll to bottom on new messages ────────────────────

  useEffect(() => {
    if (activeThread) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeThread]);

  // ─── API helpers ─────────────────────────────────────────

  const fetchThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const res = await fetch('/api/messages/threads', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setThreads(data);
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  // Fetch threads when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchThreads();
    }
  }, [isOpen, fetchThreads]);

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

  const openThread = async (threadId: number, displayName?: string, otherUserId?: number) => {
    // Find thread in list or create a temporary one
    let thread = threads.find((t) => t.thread_id === threadId);
    if (!thread) {
      thread = {
        thread_id: threadId,
        thread_type: 'IntraCompany',
        group_name: null,
        participants: [
          { user_id: currentUserId || 0, full_name: 'You' },
          { user_id: otherUserId || 0, full_name: displayName || 'User' },
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
    fetchThreads(); // Refresh to update unread counts
  };

  // ─── Helpers ─────────────────────────────────────────────

  const getThreadDisplayName = (thread: Thread): string => {
    if (thread.group_name) return thread.group_name;
    const other = thread.participants.find((p) => p.user_id !== currentUserId);
    return other?.full_name || 'Unknown';
  };

  const getOtherParticipant = (thread: Thread): Participant | undefined => {
    return thread.participants.find((p) => p.user_id !== currentUserId);
  };

  const getAvatarUrl = (name: string, bgColor: string = '6366f1') => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=32`;
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

  const avatarColors = ['6366f1', '3b82f6', 'ec4899', 'f59e0b', '10b981', 'ef4444', '8b5cf6', '14b8a6', 'f97316'];
  const getColorForUser = (userId: number) => avatarColors[userId % avatarColors.length];

  // ─── Render ──────────────────────────────────────────────

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30"
          style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-screen z-40 flex flex-col shadow-2xl transition-all duration-300 overflow-hidden"
        style={{
          width: '60vw',
          backgroundColor: '#ffffff',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        {!activeThread ? (
          /* ─── DM List View ─── */
          <>
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #3a4556 0%, #4a5668 100%)' }}
            >
              <h2 className="text-xl font-bold text-white">{orgName}</h2>
              <div className="flex items-center gap-3">
                {isOwner && (
                  <button
                    onClick={() => setOrgModalOpen(true)}
                    className="px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200"
                    style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#e0e7ff' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')}
                  >
                    Organization Management
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-full transition-colors duration-200 text-gray-300 hover:text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  title="Close sidebar"
                >
                  <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 border-b" style={{ borderColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        handleSearchInput(e.target.value);
                        setShowSearch(true);
                      }}
                      onFocus={() => setShowSearch(true)}
                      placeholder="Search colleagues to message..."
                      className="w-full pl-10 pr-4 py-2 rounded-full border text-sm text-gray-900 outline-none focus:border-indigo-400 transition-colors"
                      style={{ borderColor: '#d1d5db' }}
                    />
                  </div>
                  {showSearch && (
                    <button
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showSearch && searchQuery.trim() && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-60 overflow-y-auto"
                    style={{ borderColor: '#e5e7eb' }}
                  >
                    {isSearching ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">Searching...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">No contacts found</div>
                    ) : (
                      searchResults.map((contact) => (
                        <button
                          key={contact.user_id}
                          onClick={() => handleSelectContact(contact)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          style={{ borderBottom: '1px solid #f3f4f6' }}
                        >
                          <img
                            src={getAvatarUrl(contact.full_name, getColorForUser(contact.user_id))}
                            alt={contact.full_name}
                            className="w-9 h-9 rounded-full flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{contact.full_name}</p>
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0 capitalize">
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
            <div className="flex-1 overflow-y-auto">
              {threadsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#6366f1' }} />
                </div>
              ) : threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-600 mb-1">No conversations yet</h3>
                  <p className="text-sm text-gray-400">
                    Search for a colleague above to start messaging
                  </p>
                </div>
              ) : (
                threads.map((thread) => {
                  const displayName = getThreadDisplayName(thread);
                  const other = getOtherParticipant(thread);
                  const avatarColor = other ? getColorForUser(other.user_id) : '6366f1';

                  return (
                    <div
                      key={thread.thread_id}
                      onClick={() => openThread(thread.thread_id)}
                      className="flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors duration-150"
                      style={{ borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0" style={{ width: '44px', height: '44px' }}>
                        <img
                          src={getAvatarUrl(displayName, avatarColor)}
                          alt={displayName}
                          className="w-11 h-11 rounded-full"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">{displayName}</h3>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {formatTime(thread.last_message_time)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-gray-500 truncate">
                            {thread.last_message_preview || 'No messages yet'}
                          </p>
                          {thread.unread_count > 0 && (
                            <span
                              className="ml-2 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: '#6366f1' }}
                            >
                              {thread.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* ─── Chat View ─── */
          <>
            {/* Chat Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #3a4556 0%, #4a5668 100%)' }}
            >
              <button
                onClick={handleBack}
                className="p-1 rounded-full transition-colors duration-200 text-gray-300 hover:text-white"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                title="Back to conversations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white truncate">
                  {getThreadDisplayName(activeThread)}
                </h2>
                <p className="text-xs text-gray-400">
                  {activeThread.participants
                    .filter((p) => p.user_id !== currentUserId)
                    .map((p) => p.full_name)
                    .join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full transition-colors duration-200 text-gray-300 hover:text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  title="Close sidebar"
                >
                  <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ backgroundColor: '#f3f4f6' }}>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#6366f1' }} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm text-gray-400">
                    Send a message to start the conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_user_id === currentUserId;
                    return (
                      <div
                        key={msg.message_id}
                        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                      >
                        {!isOwn && (
                          <span className="text-xs font-semibold text-gray-500 mb-0.5 ml-1">
                            {msg.sender_name}
                          </span>
                        )}
                        <div
                          className="px-4 py-2.5 rounded-2xl max-w-[70%] shadow-sm"
                          style={{
                            backgroundColor: isOwn ? '#6366f1' : '#ffffff',
                            color: isOwn ? '#ffffff' : '#1f2937',
                            borderBottomRightRadius: isOwn ? '4px' : '16px',
                            borderBottomLeftRadius: isOwn ? '16px' : '4px',
                          }}
                        >
                          <p className="text-sm leading-relaxed">{msg.message_text}</p>
                        </div>
                        <span className="text-xs text-gray-400 mt-0.5 mx-1">
                          {formatTime(msg.sent_at)}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="px-4 py-3 border-t flex items-center gap-3 flex-shrink-0" style={{ borderColor: '#e5e7eb' }}>
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-full border text-sm text-gray-900 outline-none focus:border-indigo-400"
                style={{ borderColor: '#d1d5db' }}
              />
              <button
                onClick={handleSend}
                className="p-2 rounded-full text-white transition-colors duration-200"
                style={{ backgroundColor: messageInput.trim() ? '#6366f1' : '#d1d5db' }}
                disabled={!messageInput.trim()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
