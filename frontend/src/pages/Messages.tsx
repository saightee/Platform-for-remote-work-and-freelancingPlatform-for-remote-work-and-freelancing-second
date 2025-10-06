import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import {
  getMyApplications,
  getMyJobPosts,
  getApplicationsForJobPost,
  getChatHistory,
  createReview,
  closeJobPost,
  updateApplicationStatus,
  broadcastToSelected,      // NEW
  bulkRejectApplications,   // NEW
} from '../services/api';
import { JobApplication, JobPost, JobApplicationDetails } from '@types';
import { format } from 'date-fns';
import { FaComments, FaPaperPlane, FaUsers } from 'react-icons/fa';
import '../styles/jf-chat.css';

type Message = {
  id: string;
  job_application_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
};

type ChatListItem = {
  id: string;
  partner: string;
  status?: 'Pending' | 'Accepted' | 'Rejected' | string;
  unreadCount: number;
  lastAt?: number;
  lastText?: string;
  job_post_id?: string;
  username?: string;
  appliedAt?: string | null;
};

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const preselectJobPostId = location?.state?.jobPostId as string | null;
  const preselectApplicationId = location?.state?.applicationId as string | null;

  const { profile, currentRole, socket, socketStatus, setSocketStatus } = useRole();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostApplications, setJobPostApplications] = useState<Record<string, JobApplicationDetails[]>>({});
  const [activeJobId, setActiveJobId] = useState<string | null>(preselectJobPostId || null);
  const [selectedChat, setSelectedChat] = useState<string | null>(preselectApplicationId || null);

  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);

  // NEW: multi-select + group actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedSet = useRef<Set<string>>(new Set());
  const joinQueue = useRef<string[]>([]);
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const unreadKey = useMemo(() => `unreads_${profile?.id || 'anon'}`, [profile?.id]);
  const lastChatKey = useMemo(() => `lastChat_${profile?.id || 'anon'}`, [profile?.id]);

  const currentMessages = useMemo(() => (selectedChat ? messages[selectedChat] || [] : []), [selectedChat, messages]);
  const currentTyping = useMemo(() => (selectedChat ? !!isTyping[selectedChat] : false), [selectedChat, isTyping]);

  const closeAllMenus = useCallback(() => {
    document.querySelectorAll<HTMLDetailsElement>('details.jf-dd[open]').forEach(d => d.removeAttribute('open'));
  }, []);

  // helpers
  const lastMessageOf = useCallback((chatId: string) => {
    const list = messages[chatId];
    return list?.length ? list[list.length - 1] : null;
  }, [messages]);

  const getUnreadForJob = useCallback((jobId: string) => {
    const apps = jobPostApplications[jobId] || [];
    return apps.reduce((s, a) => s + (unreadCounts[a.applicationId] || 0), 0);
  }, [jobPostApplications, unreadCounts]);

  const isActiveJob = (p: JobPost) => {
    const s = (p.status || '').toLowerCase();
    return !(s.includes('closed') || s.includes('archiv') || s.includes('inactive'));
  };

  // close menus on outside click / esc
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('details.jf-dd')) closeAllMenus();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeAllMenus(); };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [closeAllMenus]);

  // load persisted unreads
  useEffect(() => {
    try {
      const raw = localStorage.getItem(unreadKey);
      setUnreadCounts(raw ? JSON.parse(raw) : {});
    } catch { setUnreadCounts({}); }
  }, [unreadKey]);

  useEffect(() => {
    try {
      localStorage.setItem(unreadKey, JSON.stringify(unreadCounts));
      window.dispatchEvent(new Event('jobforge:unreads-updated'));
    } catch {}
  }, [unreadKey, unreadCounts]);

  // initial data
  const joinAll = useCallback((ids: string[]) => {
    if (!socket) return;
    ids.forEach(id => {
      if (joinedSet.current.has(id)) return;
      if (socket.connected) {
        socket.emit('joinChat', { jobApplicationId: id });
        joinedSet.current.add(id);
      } else {
        joinQueue.current.push(id);
      }
    });
  }, [socket]);

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);

        if (currentRole === 'jobseeker') {
          const apps = await getMyApplications();
          const onlyActive = apps.filter(a => ['Pending', 'Accepted'].includes(a.status as any));
          setApplications(onlyActive);
          joinAll(onlyActive.map(a => a.id));
          // choose last or first
          const saved = localStorage.getItem(lastChatKey);
          if (preselectApplicationId) setSelectedChat(preselectApplicationId);
          else if (saved) setSelectedChat(saved);
          else if (onlyActive[0]) setSelectedChat(onlyActive[0].id);
        }

        if (currentRole === 'employer') {
          const posts = await getMyJobPosts();
          const active = posts.filter(isActiveJob);
          setJobPosts(active);

          const appsArrays = await Promise.all(active.map(p => getApplicationsForJobPost(p.id)));
          const map: Record<string, JobApplicationDetails[]> = {};
          active.forEach((p, i) => { map[p.id] = appsArrays[i]; });
          setJobPostApplications(map);

          joinAll(appsArrays.flat().map(a => a.applicationId));

          if (!activeJobId && active[0]) setActiveJobId(active[0].id);

          const saved = localStorage.getItem(lastChatKey);
          if (preselectApplicationId) setSelectedChat(preselectApplicationId);
          else if (saved) setSelectedChat(saved);
          else if (appsArrays[0]?.[0]) setSelectedChat(appsArrays[0][0].applicationId);
        }
      } catch (e) {
        setError('Failed to load chats.');
      } finally {
        setIsLoading(false);
      }
    };

    if (profile && (currentRole === 'jobseeker' || currentRole === 'employer')) run();
  }, [profile, currentRole, activeJobId, joinAll, preselectApplicationId, lastChatKey]);

  // reset selected chat when switching job
  useEffect(() => { setSelectedChat(prev => prev && activeJobId ? prev : prev); }, [activeJobId]);

  // socket events
  useEffect(() => {
    if (!socket || !profile || !(currentRole === 'jobseeker' || currentRole === 'employer')) {
      setUnreadCounts({}); setIsTyping({}); return;
    }

    socket.on('chatHistory', (history: Message[]) => {
      if (!history?.length) return;
      const jid = history[0].job_application_id;
      setMessages(p => ({ ...p, [jid]: history.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)) }));
      const unread = history.filter(m => m.recipient_id === profile.id && !m.is_read).length;
      setUnreadCounts(p => ({ ...p, [jid]: selectedChat === jid ? 0 : unread }));
    });

    socket.on('newMessage', (m: Message) => {
      setMessages(p => ({ ...p, [m.job_application_id]: [ ...(p[m.job_application_id] || []), m ] }));
      const isOpened = selectedChat === m.job_application_id;
      if (isOpened) {
        socket.emit('markMessagesAsRead', { jobApplicationId: m.job_application_id });
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else if (m.recipient_id === profile.id && !m.is_read) {
        setUnreadCounts(p => ({ ...p, [m.job_application_id]: (p[m.job_application_id] || 0) + 1 }));
      }
    });

    socket.on('typing', (d: { userId: string; jobApplicationId: string; isTyping: boolean }) => {
      if (d.userId !== profile.id) setIsTyping(p => ({ ...p, [d.jobApplicationId]: d.isTyping }));
    });

    socket.on('messagesRead', (payload: { data: Message[] } | Message[]) => {
      const list: Message[] = Array.isArray(payload) ? payload : payload?.data || [];
      if (!list.length) return;
      const jobId = list[0].job_application_id;
      setMessages(prev => {
        const prevList = prev[jobId] || [];
        const map = new Map(list.map(m => [m.id, m]));
        const next = prevList.map(m => map.has(m.id) ? { ...m, ...map.get(m.id)! } : m);
        return { ...prev, [jobId]: next };
      });
      if (selectedChat === jobId) setUnreadCounts(p => ({ ...p, [jobId]: 0 }));
    });

    socket.on('connect_error', (err) => {
      setSocketStatus('reconnecting');
      if (err.message?.includes('401')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    });

    socket.on('connect', () => {
      setError(null);
      joinQueue.current.forEach(id => {
        socket.emit('joinChat', { jobApplicationId: id });
        joinedSet.current.add(id);
      });
      joinQueue.current = [];
    });

    return () => {
      socket.off('chatHistory');
      socket.off('newMessage');
      socket.off('typing');
      socket.off('messagesRead');
      socket.off('connect_error');
      socket.off('connect');
      joinedSet.current.clear();
    };
  }, [socket, profile, currentRole, selectedChat, setSocketStatus]);

  // scroll thread on new messages / selection
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }); }, [selectedChat, currentMessages.length]);

  // select chat
  const handleSelectChat = useCallback((id: string) => {
    setSelectedChat(id);
    localStorage.setItem(lastChatKey, id);
    setUnreadCounts(p => ({ ...p, [id]: 0 }));

    if (socket?.connected) {
      if (!joinedSet.current.has(id)) {
        socket.emit('joinChat', { jobApplicationId: id });
        joinedSet.current.add(id);
      }
      socket.emit('markMessagesAsRead', { jobApplicationId: id });
    } else {
      joinQueue.current.push(id);
      setError('Connecting to chat server...');
    }

    getChatHistory(id, { page: 1, limit: 100 }, currentRole!)
      .then(h => {
        setMessages(prev => ({ ...prev, [id]: h.data.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)) }));
        setUnreadCounts(prev => ({ ...prev, [id]: 0 }));
      })
      .catch(() => setError('Failed to load chat history.'));
  }, [socket, currentRole, lastChatKey]);

  // typing + send
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedChat || !socket) return;
    const v = e.target.value;
    setNewMessage(v);
    socket.emit('typing', { jobApplicationId: selectedChat, isTyping: true });
    if (typingTimeoutRef.current[selectedChat]) clearTimeout(typingTimeoutRef.current[selectedChat]);
    typingTimeoutRef.current[selectedChat] = setTimeout(() => {
      socket.emit('typing', { jobApplicationId: selectedChat, isTyping: false });
    }, 3000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !socket || !newMessage.trim()) return;
    if (typingTimeoutRef.current[selectedChat]) clearTimeout(typingTimeoutRef.current[selectedChat]);
    socket.emit('typing', { jobApplicationId: selectedChat, isTyping: false });
    socket.emit('sendMessage', { jobApplicationId: selectedChat, content: newMessage.trim() });
    setNewMessage('');
  };

  // compose chat list with last message preview/date
  const chatList = useMemo<ChatListItem[]>(() => {
    if (currentRole === 'employer') {
      const list = activeJobId ? (jobPostApplications[activeJobId] || []) : [];
      return list
        .filter(a => a.status === 'Pending' || a.status === 'Accepted')
        .map(a => {
          const last = lastMessageOf(a.applicationId);
          return {
            id: a.applicationId,
            partner: a.username,
            status: a.status,
            unreadCount: unreadCounts[a.applicationId] || 0,
            lastAt: last ? +new Date(last.created_at) : (a.appliedAt ? +new Date(a.appliedAt) : 0),
            lastText: last ? last.content : (a.coverLetter || ''),
            job_post_id: a.job_post_id,
            username: a.username,
            appliedAt: a.appliedAt || null,
          };
        })
        .sort((a, b) => {
          const byAccepted = (b.status === 'Accepted' ? 1 : 0) - (a.status === 'Accepted' ? 1 : 0);
          if (byAccepted) return byAccepted;
          return (b.lastAt || 0) - (a.lastAt || 0);
        });
    }

    return applications
      .map(a => {
        const last = lastMessageOf(a.id);
        return {
          id: a.id,
          partner: a.job_post?.employer?.username || 'Employer',
          status: a.status,
          unreadCount: unreadCounts[a.id] || 0,
          lastAt: last ? +new Date(last.created_at) : 0,
          lastText: last ? last.content : '',
        };
      })
      .sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));
  }, [currentRole, activeJobId, jobPostApplications, applications, lastMessageOf, unreadCounts]);

  // current application (employer)
  const currentApp = useMemo(() => {
    if (!selectedChat) return null;
    return Object.values(jobPostApplications).flat().find(a => a.applicationId === selectedChat) || null;
  }, [jobPostApplications, selectedChat]);

  // actions
  const acceptCurrent = async () => {
    if (!currentApp) return;
    try {
      await updateApplicationStatus(currentApp.applicationId, 'Accepted');
      setJobPostApplications(prev => {
        const arr = prev[currentApp.job_post_id] || [];
        const updated = arr.map(a => a.applicationId === currentApp.applicationId ? { ...a, status: 'Accepted' as any } : a);
        return { ...prev, [currentApp.job_post_id]: updated };
      });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to accept.');
    }
  };

  const rejectCurrent = async () => {
    if (!currentApp) return;
    if (!confirm('Reject this applicant? This will remove the chat.')) return;
    try {
      await updateApplicationStatus(currentApp.applicationId, 'Rejected');
      setJobPostApplications(prev => {
        const arr = prev[currentApp.job_post_id] || [];
        const updated = arr.filter(a => a.applicationId !== currentApp.applicationId);
        return { ...prev, [currentApp.job_post_id]: updated };
      });
      setSelectedChat(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to reject.');
    }
  };

  // bulk actions
  const sendToSelected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobId || !bulkText.trim() || selectedIds.length === 0) return;
    try {
      const { sent } = await broadcastToSelected(activeJobId, { applicationIds: selectedIds, content: bulkText.trim() });
      setBulkModalOpen(false);
      setBulkText('');
      alert(`Sent to ${sent} applicants`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to send.');
    }
  };

  const bulkReject = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Reject ${selectedIds.length} applicants?`)) return;
    try {
      const res = await bulkRejectApplications(selectedIds);
      if (activeJobId) {
        setJobPostApplications(prev => {
          const next = { ...prev };
          next[activeJobId] = (next[activeJobId] || []).filter(a => !res.updatedIds.includes(a.applicationId));
          return next;
        });
      }
      setSelectedIds([]);
      alert(`Rejected ${res.updated} applicants`);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to reject.');
    }
  };

  // UI

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="jf-shell">
          <div className="jf-card">
            <h1 className="jf-title"><FaComments />&nbsp;Messages</h1>
            <p className="jf-muted">Loading chats…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !['jobseeker', 'employer'].includes(currentRole || '')) {
    return (
      <div>
        <Header />
        <div className="jf-shell">
          <div className="jf-card">
            <h1 className="jf-title"><FaComments />&nbsp;Messages</h1>
            <div className="jf-alert jf-alert--err">This page is only available for jobseekers and employers.</div>
          </div>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="jf-shell">
        <div className="jf-card">
          <div className="jf-head">
            <h1 className="jf-title"><FaComments />&nbsp;Messages</h1>
            {socketStatus === 'reconnecting' && <div className="jf-alert jf-alert--err">Reconnecting to chat server…</div>}
            {error && <div className="jf-alert jf-alert--err">{error}</div>}
          </div>

          {/* top bar */}
          <div className="jf-topbar">
            <details className="jf-dd">
              <summary className="one-line">
                {currentRole === 'employer'
                  ? (jobPosts.find(p => p.id === activeJobId)?.title || 'Select job…')
                  : (chatList.find(c => c.id === selectedChat)?.partner || 'Chats…')}
              </summary>
              <div className="jf-dd__menu">
                <ul className="jf-dd__ul">
                  {currentRole === 'employer' ? (
                    jobPosts
                      .slice()
                      .sort((a,b)=> +new Date(b.created_at || 0) - +new Date(a.created_at || 0))
                      .map(post => (
                      <li key={post.id}>
                        <button className="jf-dd__item" onClick={() => { setActiveJobId(post.id); closeAllMenus(); }}>
                          <span className="jf-dd__col">
                            <span>{post.title}</span>
                            <small className="jf-dd__small">{post.created_at ? format(new Date(post.created_at), 'PP') : ''}</small>
                          </span>
                          {getUnreadForJob(post.id) > 0 && <span className="jf-badge">{getUnreadForJob(post.id)}</span>}
                        </button>
                      </li>
                    ))
                  ) : (
                    chatList.map(c => (
                      <li key={c.id}>
                        <button className="jf-dd__item" onClick={() => { handleSelectChat(c.id); closeAllMenus(); }}>
                          <span>{c.partner}</span>
                          {!!unreadCounts[c.id] && <span className="jf-badge">{unreadCounts[c.id]}</span>}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </details>

            {currentRole === 'employer' && activeJobId && (
              <div className="jf-topbar__actions">
                {/* old broadcast all, если нужно сохранить — можно оставить кнопку с другим эндпоинтом */}
                <button className="jf-btn jf-btn--outline" onClick={() => setConfirmCloseOpen(true)}>Close job</button>
              </div>
            )}
          </div>

          <div className="jf-layout">
            {/* SIDEBAR */}
            <aside className="jf-sidebar">
              <div className="jf-sidebar__head">
                <h3 className="jf-sidebar__title">Chats</h3>

                {/* multi-select actions (shown when any selected) */}
                {currentRole === 'employer' && selectedIds.length > 0 && (
                  <div className="jf-selectbar">
                    <button className="jf-btn jf-btn--primary" onClick={() => setBulkModalOpen(true)}>
                      <FaUsers />&nbsp;Message Selected ({selectedIds.length})
                    </button>
                    <button className="jf-btn" onClick={bulkReject}>Reject Selected</button>
                    <button className="jf-btn jf-btn--ghost" onClick={() => setSelectedIds([])}>Clear</button>
                  </div>
                )}
              </div>

              {chatList.length ? (
                <ul className="jf-chatlist">
                  {chatList.map(chat => (
                    <li
                      key={chat.id}
                      className={`jf-chatitem ${selectedChat === chat.id ? 'is-active' : ''} ${chat.unreadCount ? 'has-unread' : ''}`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="jf-chatitem__row" onClick={e => e.stopPropagation()}>
                        {currentRole === 'employer' && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(chat.id)}
                            onChange={(e) => {
                              setSelectedIds(prev => e.target.checked
                                ? Array.from(new Set([...prev, chat.id]))
                                : prev.filter(id => id !== chat.id));
                            }}
                          />
                        )}
                        <div className="jf-chatitem__meta">
                          <div className="jf-chatitem__top">
                            <span className="jf-chatitem__name">{chat.partner}</span>
                            <div className="jf-chatitem__right">
                              {chat.status === 'Accepted' && <span className="jf-chip">Interview</span>}
                              {!!chat.unreadCount && <span className="jf-badge">{chat.unreadCount}</span>}
                            </div>
                          </div>
                          <div className="jf-chatitem__preview">
                            <span className="jf-chatitem__text">{chat.lastText || 'No messages yet'}</span>
                            <span className="jf-chatitem__date">
                              {chat.lastAt ? format(new Date(chat.lastAt), 'MMM d, HH:mm') : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="jf-muted">No chats yet.</p>
              )}
            </aside>

            {/* CHAT WINDOW */}
            <section className="jf-chat">
              {/* Bulk message modal */}
              {bulkModalOpen && (
                <div className="jf-modal">
                  <div className="jf-modal__content">
                    <button className="jf-modal__close" onClick={() => setBulkModalOpen(false)}>×</button>
                    <form onSubmit={sendToSelected} className="jf-form">
                      <label className="jf-label">Message to selected ({selectedIds.length})</label>
                      <textarea className="jf-textarea" rows={4} value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Short update for selected applicants…" />
                      <div className="jf-form__actions">
                        <button className="jf-btn jf-btn--primary" type="submit"><FaPaperPlane />&nbsp;Send</button>
                        <button type="button" className="jf-btn" onClick={() => setBulkModalOpen(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {confirmCloseOpen && (
                <div className="jf-modal">
                  <div className="jf-modal__content">
                    <button className="jf-modal__close" onClick={() => setConfirmCloseOpen(false)}>×</button>
                    <h4 className="jf-h4">Close job</h4>
                    <p>Are you sure you want to close this job post? Applicants will no longer be able to message you.</p>
                    <div className="jf-form__actions">
                      <button
                        className="jf-btn jf-btn--primary"
                        onClick={async () => {
                          if (!activeJobId) return;
                          try {
                            await closeJobPost(activeJobId);
                            setJobPosts(prev => prev.filter(p => p.id !== activeJobId));
                            setJobPostApplications(prev => {
                              const next = { ...prev }; delete next[activeJobId]; return next;
                            });
                            if (selectedChat) setSelectedChat(null);
                            setActiveJobId(null);
                          } catch (e: any) {
                            alert(e?.response?.data?.message || 'Failed to close job.');
                          } finally {
                            setConfirmCloseOpen(false);
                          }
                        }}
                      >
                        Close job
                      </button>
                      <button className="jf-btn" onClick={() => setConfirmCloseOpen(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              {selectedChat ? (
                <>
                  <div className="jf-chat__head">
                    <h3 className="jf-h3">
                      Chat with{' '}
                      {currentRole === 'employer' && currentApp ? (
                        <a
                          className="jf-link"
                          href={`/public-profile/${currentApp.userId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open applicant profile"
                        >
                          {currentApp.username}
                        </a>
                      ) : (
                        <span>{applications.find(a => a.id === selectedChat)?.job_post?.employer?.username || 'Unknown'}</span>
                      )}
                    </h3>

                    {currentRole === 'employer' && currentApp && (
                      <details className="jf-dd jf-dd--right">
                        <summary>Actions…</summary>
                        <div className="jf-dd__menu">
                          <ul className="jf-dd__ul">
                            <li>
                              <button className="jf-dd__item" onClick={() => { navigate(`/public-profile/${currentApp.userId}`); closeAllMenus(); }}>
                                View profile
                              </button>
                            </li>
                            {currentApp.status === 'Pending' && (
                              <>
                                <li><button className="jf-dd__item" onClick={() => { acceptCurrent(); closeAllMenus(); }}>Invite to interview</button></li>
                                <li><button className="jf-dd__item" onClick={() => { rejectCurrent(); closeAllMenus(); }}>Reject</button></li>
                              </>
                            )}
                            <li>
                              <button
                                className="jf-dd__item"
                                onClick={() => {
                                  setReviewForm({ applicationId: currentApp.applicationId, rating: 5, comment: '' });
                                  closeAllMenus();
                                }}
                              >
                                Leave review
                              </button>
                            </li>
                          </ul>
                        </div>
                      </details>
                    )}
                  </div>

                  {/* review modal */}
                  {reviewForm && (
                    <div className="jf-modal">
                      <div className="jf-modal__content">
                        <button className="jf-modal__close" onClick={() => setReviewForm(null)}>×</button>
                        <form
                          className="jf-form"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!reviewForm.comment.trim() || reviewForm.rating < 1 || reviewForm.rating > 5) return;
                            try {
                              await createReview({
                                job_application_id: reviewForm.applicationId,
                                rating: reviewForm.rating,
                                comment: reviewForm.comment.trim(),
                              });
                              alert('Review submitted');
                              setReviewForm(null);
                            } catch (err: any) {
                              alert(err?.response?.data?.message || 'Failed to submit review.');
                            }
                          }}
                        >
                          <label className="jf-label">Rating (1–5)</label>
                          <input className="jf-input" type="number" min={1} max={5}
                                 value={reviewForm.rating}
                                 onChange={(e)=> setReviewForm(f => f ? ({ ...f, rating: +e.target.value }) : f)} />
                          <label className="jf-label">Comment</label>
                          <textarea className="jf-textarea" rows={4}
                                    value={reviewForm.comment}
                                    onChange={(e)=> setReviewForm(f => f ? ({ ...f, comment: e.target.value }) : f)} />
                          <div className="jf-form__actions">
                            <button className="jf-btn jf-btn--primary" type="submit">Submit</button>
                            <button className="jf-btn" type="button" onClick={()=> setReviewForm(null)}>Cancel</button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  <div className="jf-thread">
                    {currentMessages.map(m => (
                      <div key={m.id} className={`jf-bubble ${m.sender_id === profile.id ? 'jf-bubble--me' : 'jf-bubble--them'}`}>
                        <div className="jf-bubble__text">{m.content}</div>
                        <div className="jf-bubble__meta">
                          <span>{format(new Date(m.created_at), 'PPpp')}</span>
                          <span className={`jf-read ${m.is_read ? 'is-read' : ''}`}>{m.is_read ? 'Read' : 'Unread'}</span>
                        </div>
                      </div>
                    ))}
                    {currentTyping && <div className="jf-typing">Typing…</div>}
                    <div ref={messagesEndRef} />
                  </div>

                  <form className="jf-composer" onSubmit={handleSend}>
                    <input
                      className="jf-input"
                      type="text"
                      placeholder="Type a message…"
                      value={newMessage}
                      onChange={handleTyping}
                      autoComplete="off"
                      autoCorrect="on"
                      inputMode="text"
                    />
                    <button className="jf-send" type="submit" title="Send" disabled={!selectedChat}>
                      <FaPaperPlane />
                    </button>
                  </form>
                </>
              ) : (
                <div className="jf-thread">
                  <p className="jf-muted">Select a chat in the list or pick one from “Chats…”.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default Messages;
