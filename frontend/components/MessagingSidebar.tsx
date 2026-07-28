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
                    const other = getOtherParticipant(thread);
                    const avatarColor = other ? getColorForUser(other.user_id) : '0d9488';

                    return (
                      <div key={thread.thread_id} onClick={() => openThread(thread.thread_id)}
                        className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all duration-200 hover:bg-slate-50 group">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <img src={getAvatarUrl(displayName, avatarColor)} alt={displayName}
                            className="w-12 h-12 rounded-2xl shadow-sm group-hover:scale-105 transition-transform" />
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
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0 bg-white border-b border-slate-200 shadow-sm z-10">
              <button onClick={handleBack}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 bg-slate-100 hover:bg-slate-200 text-slate-600"
                title="Back to conversations">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <img src={getAvatarUrl(getThreadDisplayName(activeThread), getOtherParticipant(activeThread) ? getColorForUser(getOtherParticipant(activeThread)!.user_id) : '0d9488')} 
                alt="Avatar" className="w-9 h-9 rounded-xl shadow-sm hidden sm:block" />

              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-navy-900 truncate">
                  {getThreadDisplayName(activeThread)}
                </h2>
                <p className="text-xs text-slate-500 truncate font-medium">
                  {activeThread.participants.filter((p) => p.user_id !== currentUserId).map((p) => p.full_name).join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
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
                        <div className={`px-4 py-2.5 max-w-[80%] shadow-sm ${
                            isOwn 
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
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md flex-shrink-0 ${
                  messageInput.trim() 
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
