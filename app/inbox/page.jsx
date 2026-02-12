'use client';

import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInbox,
  faMagnifyingGlass,
  faFilter,
  faBolt,
  faClock,
  faEnvelopeOpen,
  faPaperPlane,
  faPhone,
  faUser,
  faRotateRight,
  faMessage,
  faArrowDown,
  faCheckDouble,
} from '@fortawesome/free-solid-svg-icons';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import Badge from '../components/common/Badge.jsx';
import Loader from '../components/common/Loader.jsx';

const RANGE_OPTIONS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

const QUICK_REPLIES = [
  { label: 'Share pricing', text: 'Sure — sharing the pricing details now.' },
  { label: 'Confirm slot', text: 'Great. I can confirm the slot for you.' },
  { label: 'Request details', text: 'Could you share a few more details so I can help better?' },
  { label: 'Payment link', text: 'Here is the payment link. Let me know once completed.' },
];

const normalizeText = (value) => String(value || '').toLowerCase();

const formatTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const getInitials = (name, phone) => {
  const safe = String(name || '').trim();
  if (safe) {
    const parts = safe.split(' ').filter(Boolean);
    const first = parts[0]?.[0] || '';
    const second = parts[1]?.[0] || '';
    return `${first}${second}`.toUpperCase();
  }
  return (phone || '?').slice(-2);
};

const mergeById = (existing, incoming) => {
  const map = new Map();
  [...existing, ...incoming].forEach((msg) => {
    if (!msg?.id) return;
    map.set(msg.id, msg);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
};

export default function InboxPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    range: '30d',
    sort: 'recent',
  });
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadMap, setThreadMap] = useState({});
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    const handle = setTimeout(() => {
      fetchMessages({ reset: true, nextOffset: 0, searchTerm: search });
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!selectedThread) return;
    const thread = threadMap[selectedThread];
    if (!thread || (!thread.loading && thread.messages.length === 0)) {
      loadThreadMessages(selectedThread, { reset: true });
    }
  }, [selectedThread]);

  const stats = useMemo(() => {
    const now = Date.now();
    const uniqueThreads = new Set(messages.map((msg) => msg.user_id)).size;
    const unreadMessages = messages.filter((msg) => msg.status !== 'read').length;
    const incomingToday = messages.filter(
      (msg) =>
        msg.message_type === 'incoming' &&
        now - new Date(msg.created_at).getTime() <= 24 * 60 * 60 * 1000
    ).length;
    const needsReply = (() => {
      const map = new Map();
      messages.forEach((msg) => {
        const current = map.get(msg.user_id) || { last: null, unread: 0 };
        const msgTime = new Date(msg.created_at).getTime();
        if (!current.last || msgTime > current.last.time) {
          current.last = { time: msgTime, type: msg.message_type };
        }
        if (msg.status !== 'read') current.unread += 1;
        map.set(msg.user_id, current);
      });
      let count = 0;
      map.forEach((value) => {
        if (value.unread > 0 && value.last?.type === 'incoming') count += 1;
      });
      return count;
    })();
    return {
      uniqueThreads,
      unreadMessages,
      incomingToday,
      needsReply,
    };
  }, [messages]);

  const threads = useMemo(() => {
    const now = Date.now();
    const map = new Map();
    messages.forEach((msg) => {
      if (!msg?.user_id) return;
      const time = new Date(msg.created_at).getTime();
      const existing = map.get(msg.user_id) || {
        user_id: msg.user_id,
        user_name: msg.user_name,
        phone: msg.phone,
        lastMessage: msg,
        lastTime: time,
        unreadCount: 0,
        incomingCount: 0,
        messageCount: 0,
      };
      existing.messageCount += 1;
      if (msg.status !== 'read') existing.unreadCount += 1;
      if (msg.message_type === 'incoming') existing.incomingCount += 1;
      if (!existing.lastTime || time > existing.lastTime) {
        existing.lastTime = time;
        existing.lastMessage = msg;
        existing.user_name = msg.user_name;
        existing.phone = msg.phone;
      }
      map.set(msg.user_id, existing);
    });

    let list = Array.from(map.values());

    if (filters.status === 'unread') {
      list = list.filter((thread) => thread.unreadCount > 0);
    } else if (filters.status === 'read') {
      list = list.filter((thread) => thread.unreadCount === 0);
    } else if (filters.status === 'needs_reply') {
      list = list.filter(
        (thread) =>
          thread.unreadCount > 0 && thread.lastMessage?.message_type === 'incoming'
      );
    }

    if (filters.type !== 'all') {
      list = list.filter(
        (thread) => thread.lastMessage?.message_type === filters.type
      );
    }

    const days = RANGE_OPTIONS[filters.range];
    if (days) {
      list = list.filter(
        (thread) => now - thread.lastTime <= days * 24 * 60 * 60 * 1000
      );
    }

    if (search) {
      const term = normalizeText(search);
      list = list.filter((thread) => {
        const haystack = [
          thread.user_name,
          thread.phone,
          thread.lastMessage?.message_text,
        ]
          .filter(Boolean)
          .join(' ');
        return normalizeText(haystack).includes(term);
      });
    }

    if (filters.sort === 'oldest') {
      list.sort((a, b) => a.lastTime - b.lastTime);
    } else if (filters.sort === 'unread') {
      list.sort((a, b) => b.unreadCount - a.unreadCount || b.lastTime - a.lastTime);
    } else {
      list.sort((a, b) => b.lastTime - a.lastTime);
    }

    return list;
  }, [messages, filters, search]);

  useEffect(() => {
    if (threads.length === 0) {
      setSelectedThread(null);
      return;
    }
    const exists = threads.some((thread) => thread.user_id === selectedThread);
    if (!exists) {
      setSelectedThread(threads[0].user_id);
    }
  }, [threads, selectedThread]);

  async function fetchMessages({ reset = false, nextOffset = 0, searchTerm = '' } = {}) {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('offset', String(nextOffset));
      if (searchTerm) params.set('q', searchTerm);
      const response = await fetch(`/api/messages?${params.toString()}`);
      const data = await response.json();
      const list = data.data || [];
      const meta = data.meta || {};
      setHasMore(Boolean(meta.hasMore));
      setOffset(meta.nextOffset ?? nextOffset + list.length);
      if (reset) {
        setMessages(list);
      } else {
        setMessages((prev) => [...prev, ...list]);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      if (reset) {
        setMessages([]);
        setHasMore(false);
        setOffset(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const loadThreadMessages = async (userId, { reset = false } = {}) => {
    if (!userId) return;
    setThreadMap((prev) => ({
      ...prev,
      [userId]: {
        messages: reset ? [] : prev[userId]?.messages || [],
        loading: true,
        hasMore: reset ? false : prev[userId]?.hasMore || false,
        offset: reset ? 0 : prev[userId]?.offset || 0,
        error: '',
      },
    }));

    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('offset', String(reset ? 0 : threadMap[userId]?.offset || 0));
      const response = await fetch(`/api/users/${userId}/messages?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || 'Failed to load messages');
      }
      const list = Array.isArray(data?.data) ? data.data : [];
      setThreadMap((prev) => {
        const existing = reset ? [] : prev[userId]?.messages || [];
        const merged = mergeById(existing, list);
        return {
          ...prev,
          [userId]: {
            messages: merged,
            loading: false,
            hasMore: Boolean(data?.meta?.hasMore),
            offset:
              data?.meta?.nextOffset ??
              (reset ? list.length : (prev[userId]?.offset || 0) + list.length),
            error: '',
          },
        };
      });
    } catch (error) {
      console.error('Failed to load thread messages:', error);
      setThreadMap((prev) => ({
        ...prev,
        [userId]: {
          messages: prev[userId]?.messages || [],
          loading: false,
          hasMore: prev[userId]?.hasMore || false,
          offset: prev[userId]?.offset || 0,
          error: error.message || 'Failed to load messages',
        },
      }));
    }
  };

  const sendMessage = async () => {
    if (!selectedThread || sending) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setSendError('');
    try {
      const response = await fetch(`/api/users/${selectedThread}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || 'Failed to send message');
      }
      const newMessage = {
        ...data.data,
        user_name: activeThreadMeta?.user_name || data.data?.user_name,
        phone: activeThreadMeta?.phone || data.data?.phone,
      };
      setDraft('');
      setThreadMap((prev) => ({
        ...prev,
        [selectedThread]: {
          ...(prev[selectedThread] || { messages: [] }),
          messages: mergeById(prev[selectedThread]?.messages || [], [newMessage]),
        },
      }));
      setMessages((prev) => [newMessage, ...prev]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setSendError(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const activeThreadData = selectedThread ? threadMap[selectedThread] : null;
  const activeMessages = activeThreadData?.messages || [];
  const activeThreadMeta = threads.find((thread) => thread.user_id === selectedThread);
  const isThreadLoading = Boolean(selectedThread) && (!activeThreadData || activeThreadData.loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader size="lg" text="Loading inbox..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff3e6_0%,_#ffffff_45%,_#f3f6ff_100%)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-aa-orange/10 flex items-center justify-center">
                <FontAwesomeIcon icon={faInbox} className="text-aa-orange" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-aa-dark-blue">Inbox</h1>
                <p className="text-sm text-aa-gray">
                  Stay on top of customer messages with quick filters and replies.
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchMessages({ reset: true, nextOffset: 0, searchTerm: search })}
            icon={<FontAwesomeIcon icon={faRotateRight} />}
          >
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6">
          <Card className="border border-white/60 bg-white/80 backdrop-blur">
            <p className="text-xs uppercase text-aa-gray">Conversations</p>
            <p className="text-2xl font-bold text-aa-dark-blue mt-2">{stats.uniqueThreads}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-aa-gray">
              <FontAwesomeIcon icon={faMessage} />
              Total active threads
            </div>
          </Card>
          <Card className="border border-white/60 bg-white/80 backdrop-blur">
            <p className="text-xs uppercase text-aa-gray">Unread</p>
            <p className="text-2xl font-bold text-aa-dark-blue mt-2">{stats.unreadMessages}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-aa-gray">
              <FontAwesomeIcon icon={faEnvelopeOpen} />
              Messages to review
            </div>
          </Card>
          <Card className="border border-white/60 bg-white/80 backdrop-blur">
            <p className="text-xs uppercase text-aa-gray">Needs Reply</p>
            <p className="text-2xl font-bold text-aa-dark-blue mt-2">{stats.needsReply}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-aa-gray">
              <FontAwesomeIcon icon={faBolt} />
              Latest incoming unread
            </div>
          </Card>
          <Card className="border border-white/60 bg-white/80 backdrop-blur">
            <p className="text-xs uppercase text-aa-gray">Incoming Today</p>
            <p className="text-2xl font-bold text-aa-dark-blue mt-2">{stats.incomingToday}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-aa-gray">
              <FontAwesomeIcon icon={faClock} />
              Last 24 hours
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card className="border border-white/60 bg-white/90 backdrop-blur">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="absolute left-3 top-3 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search name, phone, or last message"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-aa-orange"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase text-aa-gray">Status</label>
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, status: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                    <option value="needs_reply">Needs reply</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-aa-gray">Type</label>
                  <select
                    value={filters.type}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, type: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="incoming">Incoming</option>
                    <option value="outgoing">Outgoing</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-aa-gray">Range</label>
                  <select
                    value={filters.range}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, range: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="all">All time</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase text-aa-gray">Sort</label>
                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      setFilters((prev) => ({ ...prev, sort: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="recent">Most recent</option>
                    <option value="oldest">Oldest first</option>
                    <option value="unread">Unread first</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, status: 'all', type: 'all' }))}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-aa-gray hover:border-aa-orange hover:text-aa-orange"
                >
                  Clear filters
                </button>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, status: 'needs_reply' }))}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                >
                  Needs reply
                </button>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, status: 'unread' }))}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                >
                  Unread only
                </button>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, type: 'incoming' }))}
                  className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700"
                >
                  Incoming
                </button>
              </div>
            </Card>

            <Card className="border border-white/60 bg-white/90 backdrop-blur p-0 sm:p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-aa-text-dark">
                  <FontAwesomeIcon icon={faFilter} className="text-aa-orange" />
                  Conversations
                </div>
                <Badge variant="blue">{threads.length}</Badge>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {threads.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-aa-gray">
                    No conversations match your filters.
                  </div>
                ) : (
                  threads.map((thread) => {
                    const isActive = thread.user_id === selectedThread;
                    return (
                      <button
                        key={thread.user_id}
                        onClick={() => setSelectedThread(thread.user_id)}
                        className={`w-full text-left px-4 py-4 border-b border-gray-100 hover:bg-aa-orange/5 transition ${
                          isActive ? 'bg-aa-orange/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-aa-dark-blue/10 text-aa-dark-blue flex items-center justify-center text-sm font-semibold">
                            {getInitials(thread.user_name, thread.phone)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-aa-text-dark truncate">
                                {thread.user_name || 'Unknown'}{' '}
                                <span className="text-xs text-aa-gray">({thread.phone || '—'})</span>
                              </p>
                              <span className="text-xs text-aa-gray">
                                {formatTime(thread.lastMessage?.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-aa-gray truncate mt-1">
                              {thread.lastMessage?.message_text || 'No message preview'}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant={thread.lastMessage?.message_type === 'incoming' ? 'blue' : 'green'}>
                                {thread.lastMessage?.message_type || 'incoming'}
                              </Badge>
                              {thread.unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-aa-orange text-white">
                                  {thread.unreadCount} unread
                                </span>
                              )}
                              <span className="text-xs text-aa-gray">{formatDate(thread.lastMessage?.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              {hasMore && (
                <div className="p-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchMessages({ reset: false, nextOffset: offset, searchTerm: search })}
                    disabled={loadingMore}
                    className="w-full"
                    icon={<FontAwesomeIcon icon={faArrowDown} />}
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <Card className="border border-white/60 bg-white/90 backdrop-blur">
            {!selectedThread ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="h-14 w-14 rounded-2xl bg-aa-orange/10 flex items-center justify-center mb-4">
                  <FontAwesomeIcon icon={faInbox} className="text-aa-orange" />
                </div>
                <h2 className="text-lg font-semibold text-aa-text-dark">Select a conversation</h2>
                <p className="text-sm text-aa-gray mt-2 max-w-md">
                  Choose a thread from the left to view the full conversation and reply.
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-[720px]">
                <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-aa-dark-blue/10 text-aa-dark-blue flex items-center justify-center text-base font-semibold">
                      {getInitials(activeThreadMeta?.user_name, activeThreadMeta?.phone)}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-aa-text-dark">
                        {activeThreadMeta?.user_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-aa-gray">{activeThreadMeta?.phone || 'No phone number'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={activeThreadMeta?.phone ? `tel:${activeThreadMeta.phone}` : undefined}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-aa-gray hover:border-aa-orange hover:text-aa-orange"
                    >
                      <FontAwesomeIcon icon={faPhone} />
                      Call
                    </a>
                    <button
                      onClick={() => {
                        if (!activeThreadMeta?.phone) return;
                        navigator.clipboard?.writeText(activeThreadMeta.phone);
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-aa-gray hover:border-aa-orange hover:text-aa-orange"
                    >
                      <FontAwesomeIcon icon={faUser} />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                  {isThreadLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader size="md" text="Loading conversation..." />
                    </div>
                  ) : activeThreadData?.error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {activeThreadData.error}
                    </div>
                  ) : (
                    <>
                      {activeThreadData?.hasMore && (
                        <div className="flex justify-center">
                          <button
                            onClick={() => loadThreadMessages(selectedThread, { reset: false })}
                            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-aa-gray hover:border-aa-orange hover:text-aa-orange"
                          >
                            Load earlier messages
                          </button>
                        </div>
                      )}
                      {activeMessages.length === 0 ? (
                        <div className="text-center text-sm text-aa-gray py-10">
                          No messages yet. Start the conversation below.
                        </div>
                      ) : (
                        activeMessages.map((msg) => {
                          const isOutgoing = msg.message_type === 'outgoing';
                          return (
                            <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                  isOutgoing
                                    ? 'bg-aa-dark-blue text-white'
                                    : 'bg-white border border-gray-100 text-aa-text-dark'
                                }`}
                              >
                                <p>{msg.message_text}</p>
                                <div className={`mt-2 flex items-center gap-2 text-xs ${isOutgoing ? 'text-white/70' : 'text-aa-gray'}`}>
                                  <span>{formatTime(msg.created_at)}</span>
                                  {msg.status === 'read' && isOutgoing && (
                                    <FontAwesomeIcon icon={faCheckDouble} />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {QUICK_REPLIES.map((reply) => (
                      <button
                        key={reply.label}
                        onClick={() =>
                          setDraft((prev) => (prev ? `${prev}\n${reply.text}` : reply.text))
                        }
                        className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-aa-gray hover:border-aa-orange hover:text-aa-orange"
                      >
                        {reply.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        rows={3}
                        placeholder="Type a reply..."
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-aa-orange"
                      />
                      {sendError && (
                        <p className="mt-2 text-xs text-red-600">{sendError}</p>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      onClick={sendMessage}
                      disabled={sending || !draft.trim()}
                      icon={<FontAwesomeIcon icon={faPaperPlane} />}
                      className="self-end"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
