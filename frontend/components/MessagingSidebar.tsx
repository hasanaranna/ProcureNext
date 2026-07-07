'use client';

import { useState, useRef, useEffect } from 'react';
import OrgManagementModal from '@/components/OrgManagementModal';

interface Member {
  name: string;
  avatar: string;
}

interface Conversation {
  id: number;
  name: string;
  members: Member[];
  lastMessage: string;
  time: string;
  unread: number;
}

interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  time: string;
  isOwn: boolean;
}

const dummyConversations: Conversation[] = [
  {
    id: 1,
    name: 'Acme Corp — Office Supplies',
    members: [
      { name: 'Alice Johnson', avatar: 'https://ui-avatars.com/api/?name=Alice+Johnson&background=6366f1&color=fff&size=32' },
      { name: 'Bob Smith', avatar: 'https://ui-avatars.com/api/?name=Bob+Smith&background=3b82f6&color=fff&size=32' },
      { name: 'You', avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff&size=32' },
    ],
    lastMessage: 'Can we finalize the pricing by Friday?',
    time: '2:34 PM',
    unread: 3,
  },
  {
    id: 2,
    name: 'Sarah Lee',
    members: [
      { name: 'Sarah Lee', avatar: 'https://ui-avatars.com/api/?name=Sarah+Lee&background=ec4899&color=fff&size=32' },
      { name: 'You', avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff&size=32' },
    ],
    lastMessage: 'Thanks for the update!',
    time: '1:12 PM',
    unread: 0,
  },
  {
    id: 3,
    name: 'IT Procurement Team',
    members: [
      { name: 'David Park', avatar: 'https://ui-avatars.com/api/?name=David+Park&background=f59e0b&color=fff&size=32' },
      { name: 'Emily Chen', avatar: 'https://ui-avatars.com/api/?name=Emily+Chen&background=10b981&color=fff&size=32' },
      { name: 'Marcus Brown', avatar: 'https://ui-avatars.com/api/?name=Marcus+Brown&background=ef4444&color=fff&size=32' },
      { name: 'You', avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff&size=32' },
    ],
    lastMessage: 'Meeting rescheduled to 3 PM tomorrow',
    time: '11:45 AM',
    unread: 1,
  },
  {
    id: 4,
    name: 'Kevin Nguyen',
    members: [
      { name: 'Kevin Nguyen', avatar: 'https://ui-avatars.com/api/?name=Kevin+Nguyen&background=8b5cf6&color=fff&size=32' },
      { name: 'You', avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff&size=32' },
    ],
    lastMessage: 'I\'ll send over the documents shortly.',
    time: 'Yesterday',
    unread: 0,
  },
  {
    id: 5,
    name: 'Metro Industries — Furniture',
    members: [
      { name: 'Rachel Kim', avatar: 'https://ui-avatars.com/api/?name=Rachel+Kim&background=14b8a6&color=fff&size=32' },
      { name: 'Tom Harris', avatar: 'https://ui-avatars.com/api/?name=Tom+Harris&background=f97316&color=fff&size=32' },
      { name: 'You', avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff&size=32' },
    ],
    lastMessage: 'The delivery date has been confirmed.',
    time: 'Yesterday',
    unread: 0,
  },
];

const dummyChatMessages: ChatMessage[] = [
  { id: 1, sender: 'Alice Johnson', text: 'Hi everyone, I\'ve reviewed the tender requirements for the office supplies.', time: '1:50 PM', isOwn: false },
  { id: 2, sender: 'Bob Smith', text: 'Great, I\'ve prepared a preliminary cost breakdown. Sharing it in a moment.', time: '1:55 PM', isOwn: false },
  { id: 3, sender: 'You', text: 'Thanks Bob. Make sure to include the bulk discount rates we discussed.', time: '2:02 PM', isOwn: true },
  { id: 4, sender: 'Alice Johnson', text: 'Also, the client mentioned they need eco-friendly options. Can we source those?', time: '2:10 PM', isOwn: false },
  { id: 5, sender: 'You', text: 'Yes, I\'ve already reached out to GreenSupply Co. for quotes on recycled paper products.', time: '2:18 PM', isOwn: true },
  { id: 6, sender: 'Bob Smith', text: 'Perfect. I\'ll factor those into the pricing sheet.', time: '2:25 PM', isOwn: false },
  { id: 7, sender: 'Alice Johnson', text: 'Can we finalize the pricing by Friday?', time: '2:34 PM', isOwn: false },
];

interface MessagingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MessagingSidebar({ isOpen, onClose }: MessagingSidebarProps) {
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(dummyChatMessages);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberEmail, setAddMemberEmail] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const userData = JSON.parse(stored);
        if (userData.role_in_org === 'Owner') {
          setIsOwner(true);
        }
      }
    } catch { }
  }, []);

  useEffect(() => {
    if (activeChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChat]);

  const handleSend = () => {
    if (!messageInput.trim()) return;
    setMessages([
      ...messages,
      {
        id: messages.length + 1,
        sender: 'You',
        text: messageInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
      },
    ]);
    setMessageInput('');
  };

  const handleOpenChat = (conv: Conversation) => {
    setActiveChat(conv);
    setGroupName(conv.name);
    setMessages(conv.id === 1 ? dummyChatMessages : [
      { id: 1, sender: conv.members[0].name, text: conv.lastMessage, time: conv.time, isOwn: false },
    ]);
  };

  const handleBack = () => {
    setActiveChat(null);
    setShowAddMember(false);
    setIsRenaming(false);
  };

  const isGroup = activeChat ? activeChat.members.length > 2 : false;

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
        {!activeChat ? (
          /* ─── DM List View ─── */
          <>
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #3a4556 0%, #4a5668 100%)' }}
            >
              <h2 className="text-xl font-bold text-white">TechVision Corp</h2>
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

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {dummyConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleOpenChat(conv)}
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors duration-150"
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Avatars */}
                  <div className="relative flex-shrink-0" style={{ width: '44px', height: '44px' }}>
                    {conv.members.length <= 2 ? (
                      <img
                        src={conv.members[0].avatar}
                        alt={conv.members[0].name}
                        className="w-11 h-11 rounded-full"
                      />
                    ) : (
                      <>
                        <img
                          src={conv.members[0].avatar}
                          alt={conv.members[0].name}
                          className="w-8 h-8 rounded-full absolute top-0 left-0 border-2 border-white"
                        />
                        <img
                          src={conv.members[1].avatar}
                          alt={conv.members[1].name}
                          className="w-8 h-8 rounded-full absolute bottom-0 right-0 border-2 border-white"
                        />
                      </>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{conv.name}</h3>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{conv.time}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                      {conv.unread > 0 && (
                        <span
                          className="ml-2 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: '#6366f1' }}
                        >
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    {conv.members.length > 2 && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {conv.members.filter(m => m.name !== 'You').map(m => m.name.split(' ')[0]).join(', ')} &amp; You
                      </p>
                    )}
                  </div>
                </div>
              ))}
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
                {isRenaming && isGroup ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); setIsRenaming(false); }}
                    className="flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="bg-transparent border-b border-gray-300 text-white text-sm font-bold outline-none w-full"
                    />
                    <button type="submit" className="text-xs text-indigo-300 hover:text-white font-semibold">
                      Save
                    </button>
                    <button type="button" onClick={() => { setGroupName(activeChat.name); setIsRenaming(false); }} className="text-xs text-gray-400 hover:text-white">
                      Cancel
                    </button>
                  </form>
                ) : (
                  <h2 className="text-sm font-bold text-white truncate">{groupName}</h2>
                )}
                <p className="text-xs text-gray-400">
                  {activeChat.members.filter(m => m.name !== 'You').map(m => m.name).join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Add member button */}
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="p-1.5 rounded-full transition-colors duration-200 text-gray-300 hover:text-white"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  title="Add member"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </button>
                {/* Rename group button — only for groups */}
                {isGroup && (
                  <button
                    onClick={() => setIsRenaming(true)}
                    className="p-1.5 rounded-full transition-colors duration-200 text-gray-300 hover:text-white"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                    title="Rename group"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                {/* Close sidebar */}
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

            {/* Add Member Bar */}
            {showAddMember && (
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
                <input
                  autoFocus
                  type="email"
                  value={addMemberEmail}
                  onChange={(e) => setAddMemberEmail(e.target.value)}
                  placeholder="Enter email to add member..."
                  className="flex-1 px-3 py-1.5 rounded-full border text-sm text-gray-900 outline-none focus:border-indigo-400"
                  style={{ borderColor: '#d1d5db' }}
                />
                <button
                  onClick={() => { setAddMemberEmail(''); setShowAddMember(false); }}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: '#6366f1' }}
                >
                  Add
                </button>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ backgroundColor: '#f3f4f6' }}>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
                  >
                    {!msg.isOwn && (
                      <span className="text-xs font-semibold text-gray-500 mb-0.5 ml-1">{msg.sender}</span>
                    )}
                    <div
                      className="px-4 py-2.5 rounded-2xl max-w-[70%] shadow-sm"
                      style={{
                        backgroundColor: msg.isOwn ? '#6366f1' : '#ffffff',
                        color: msg.isOwn ? '#ffffff' : '#1f2937',
                        borderBottomRightRadius: msg.isOwn ? '4px' : '16px',
                        borderBottomLeftRadius: msg.isOwn ? '16px' : '4px',
                      }}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                    </div>
                    <span className="text-xs text-gray-400 mt-0.5 mx-1">{msg.time}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
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
