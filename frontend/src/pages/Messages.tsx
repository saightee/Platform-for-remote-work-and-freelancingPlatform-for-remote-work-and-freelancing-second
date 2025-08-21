// src/pages/Messages.tsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  broadcastToApplicants,
  closeJobPost,
  updateApplicationStatus,
} from '../services/api';
import { JobApplication, JobPost, JobApplicationDetails } from '@types';
import { format } from 'date-fns';
import { FaComments, FaPaperPlane, FaUsers } from 'react-icons/fa';
import '../styles/chat-hub.css';

interface Message {
  id: string;
  job_application_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

const Messages: React.FC = () => {
  const location = useLocation() as any;
  const preselectJobPostId = location?.state?.jobPostId as string | null;
  const preselectApplicationId = location?.state?.applicationId as string | null;

  const { profile, currentRole, socket, socketStatus, setSocketStatus } = useRole();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostApplications, setJobPostApplications] = useState<{ [jobPostId: string]: JobApplicationDetails[] }>({});

  const [activeJobId, setActiveJobId] = useState<string | null>(preselectJobPostId || null);
  const [selectedChat, setSelectedChat] = useState<string | null>(preselectApplicationId || null);

  const [messages, setMessages] = useState<{ [jobApplicationId: string]: Message[] }>({});
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<{ [jobApplicationId: string]: number }>({});
  const [isTyping, setIsTyping] = useState<{ [jobApplicationId: string]: boolean }>({});
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedSet = useRef<Set<string>>(new Set());
  const joinQueue = useRef<string[]>([]);
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // helpers
  const getLastTs = (chatId: string) => {
    const list = messages[chatId];
    if (!list || !list.length) return 0;
    return new Date(list[list.length - 1].created_at).getTime();
  };

  const isActiveJob = (p: JobPost) => {
    const s = (p.status || '').toLowerCase();
    return !(s.includes('closed') || s.includes('archiv') || s.includes('inactive'));
  };

  const currentMessages = useMemo(
    () => (selectedChat ? messages[selectedChat] : []),
    [selectedChat, messages]
  );
  const currentTyping = useMemo(
    () => (selectedChat ? isTyping[selectedChat] : false),
    [selectedChat, isTyping]
  );

  useEffect(() => {
    return () => {
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      typingTimeoutRef.current = {};
    };
  }, []);

  // загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        if (currentRole === 'jobseeker') {
  const apps = await getMyApplications();
  setApplications(apps.filter(a => a.status === 'Accepted' || a.status === 'Pending'));

        } else if (currentRole === 'employer') {
          const posts = await getMyJobPosts();
          const active = posts.filter(isActiveJob);
          setJobPosts(active);

          const appsArrays = await Promise.all(active.map((post) => getApplicationsForJobPost(post.id)));
          const appsMap: { [jobPostId: string]: JobApplicationDetails[] } = {};
          active.forEach((post, index) => {
            appsMap[post.id] = appsArrays[index];
          });
          setJobPostApplications(appsMap);

          if (!activeJobId && active[0]) setActiveJobId(active[0].id);
          if (preselectApplicationId) setSelectedChat(preselectApplicationId);
        }
      } catch (e) {
        console.error('Error fetching applications:', e);
        setError('Failed to load applications.');
      } finally {
        setIsLoading(false);
      }
    };

    if (profile && currentRole && ['jobseeker', 'employer'].includes(currentRole)) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, currentRole]);

  // при смене выбранной вакансии — снимаем выделение чата
  useEffect(() => {
    setSelectedChat(null);
  }, [activeJobId]);

  const scrollToBottom = useCallback((smooth: boolean = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

  const unreadKey = useMemo(() => `unreads_${profile?.id || 'anon'}`, [profile?.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(unreadKey);
      if (raw) setUnreadCounts(JSON.parse(raw));
      else setUnreadCounts({});
    } catch {
      setUnreadCounts({});
    }
  }, [unreadKey]);

  useEffect(() => {
    try {
      localStorage.setItem(unreadKey, JSON.stringify(unreadCounts));
      window.dispatchEvent(new Event('jobforge:unreads-updated'));
    } catch {}
  }, [unreadKey, unreadCounts]);

  // socket events
  useEffect(() => {
    if (!socket || !profile || !currentRole || !['jobseeker', 'employer'].includes(currentRole)) {
      setUnreadCounts({});
      setIsTyping({});
      return;
    }

    socket.on('chatHistory', (history: Message[]) => {
      if (history && history.length > 0) {
        const jobApplicationId = history[0].job_application_id;
        setMessages((prev) => ({
          ...prev,
          [jobApplicationId]: history.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        }));
        const unread = history.filter((msg) => msg.recipient_id === profile.id && !msg.is_read).length;
        setUnreadCounts((prevCounts) => ({
          ...prevCounts,
          [jobApplicationId]: selectedChat === jobApplicationId ? 0 : unread,
        }));
      }
    });

    socket.on('newMessage', (message: Message) => {
      setMessages((prev) => ({
        ...prev,
        [message.job_application_id]: [...(prev[message.job_application_id] || []), message],
      }));

      const inOpenedChat = selectedChat === message.job_application_id;

      if (inOpenedChat) {
        socket.emit('markMessagesAsRead', { jobApplicationId: message.job_application_id });
        scrollToBottom(true);
      } else if (message.recipient_id === profile.id && !message.is_read) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.job_application_id]: (prev[message.job_application_id] || 0) + 1,
        }));
      }
    });

    socket.on('typing', (data: { userId: string; jobApplicationId: string; isTyping: boolean }) => {
      if (data.userId !== profile.id) {
        setIsTyping((prev) => ({ ...prev, [data.jobApplicationId]: data.isTyping }));
      }
    });

    type MessagesReadPayload = { data: Message[] } | Message[];
    socket.on('messagesRead', (payload: MessagesReadPayload) => {
      const list: Message[] = Array.isArray(payload) ? payload : payload?.data || [];
      if (!list.length) return;

      const jobId = list[0].job_application_id;

      setMessages((prev) => {
        const prevList = prev[jobId] || [];
        const updates = new Map(list.map((m) => [m.id, m]));
        const nextList = prevList.map((m) => (updates.has(m.id) ? { ...m, ...updates.get(m.id)! } : m));
        return { ...prev, [jobId]: nextList };
      });

      if (selectedChat === jobId) {
        setUnreadCounts((prev) => ({ ...prev, [jobId]: 0 }));
      }
    });

    socket.on('chatInitialized', async (data: { jobApplicationId: string }) => {
      if (socket.connected) {
        socket.emit('joinChat', { jobApplicationId: data.jobApplicationId });
      } else {
        joinQueue.current.push(data.jobApplicationId);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      setSocketStatus('reconnecting');
      if (err.message.includes('401')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    });

    socket.on('connect', () => {
      setError(null);
      joinQueue.current.forEach((id) => {
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
      socket.off('chatInitialized');
      socket.off('connect_error');
      socket.off('connect');
      joinedSet.current.clear();
    };
  }, [profile, currentRole, socket, selectedChat, setSocketStatus, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(false);
  }, [selectedChat, (currentMessages || []).length, scrollToBottom]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !selectedChat || !newMessage.trim()) return;

    if (typingTimeoutRef.current[selectedChat]) {
      clearTimeout(typingTimeoutRef.current[selectedChat]);
    }
    socket.emit('typing', { jobApplicationId: selectedChat, isTyping: false });

    socket.emit('sendMessage', {
      jobApplicationId: selectedChat,
      content: newMessage.trim(),
    });

    setNewMessage('');
  };

  const chatList = useMemo(() => {
    if (currentRole === 'employer') {
      const list = activeJobId ? jobPostApplications[activeJobId] || [] : [];
      return list
        .filter((app) => app.status === 'Pending' || app.status === 'Accepted')
        .map((app) => ({
          id: app.applicationId,
          title: jobPosts.find((p) => p.id === app.job_post_id)?.title || 'Unknown Job',
          partner: app.username,
          status: app.status,
          unreadCount: unreadCounts[app.applicationId] || 0,
          coverLetter: app.coverLetter,
          userId: app.userId,
          job_post_id: app.job_post_id,
        }))
        .sort((a, b) => getLastTs(b.id) - getLastTs(a.id));
    }

    return applications
      .map((app) => ({
        id: app.id,
        title: app.job_post?.title || 'Unknown Job',
        partner: app.job_post?.employer?.username || 'Unknown',
        unreadCount: unreadCounts[app.id] || 0,
      }))
      .sort((a, b) => getLastTs(b.id) - getLastTs(a.id));
  }, [activeJobId, applications, jobPostApplications, jobPosts, unreadCounts, currentRole, messages]);

  const handleSelectChat = (jobApplicationId: string) => {
    const exists = chatList.some((c) => c.id === jobApplicationId);
    if (!exists) {
      setSelectedChat(null);
      return;
    }

    setSelectedChat(jobApplicationId);
    setUnreadCounts((prev) => ({ ...prev, [jobApplicationId]: 0 }));

    if (socket?.connected) {
      if (!joinedSet.current.has(jobApplicationId)) {
        socket.emit('joinChat', { jobApplicationId });
        joinedSet.current.add(jobApplicationId);
      }
      socket.emit('markMessagesAsRead', { jobApplicationId });
    } else {
      joinQueue.current.push(jobApplicationId);
      setError('Connecting to chat server... Please wait.');
    }

    getChatHistory(jobApplicationId, { page: 1, limit: 100 }, currentRole!)
      .then((history) => {
        setMessages((prev) => ({
          ...prev,
          [jobApplicationId]: history.data.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        }));
        setUnreadCounts((prev) => ({ ...prev, [jobApplicationId]: 0 }));
      })
      .catch(() => setError('Failed to load chat history.'));
  };

  // текущая заявка (для быстрых действий)
  const currentApp = useMemo(() => {
    if (!selectedChat) return null;
    return Object.values(jobPostApplications).flat().find((a) => a.applicationId === selectedChat) || null;
  }, [jobPostApplications, selectedChat]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!socket || !selectedChat) return;

    const content = e.target.value;
    setNewMessage(content);

    socket.emit('typing', { jobApplicationId: selectedChat, isTyping: true });

    if (typingTimeoutRef.current[selectedChat]) {
      clearTimeout(typingTimeoutRef.current[selectedChat]);
    }

    typingTimeoutRef.current[selectedChat] = setTimeout(() => {
      socket.emit('typing', { jobApplicationId: selectedChat, isTyping: false });
    }, 3000);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobId || !broadcastText.trim()) return;
    try {
      const res = await broadcastToApplicants(activeJobId, broadcastText.trim());
      alert(`Sent: ${res.sent}`);
      setBroadcastOpen(false);
      setBroadcastText('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send broadcast.');
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm) return;
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      setFormError('Rating must be between 1 and 5.');
      return;
    }
    if (!reviewForm.comment.trim()) {
      setFormError('Comment cannot be empty.');
      return;
    }
    try {
      setFormError(null);
      await createReview({
        job_application_id: reviewForm.applicationId,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });
      alert('Review submitted successfully!');
      setReviewForm(null);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to submit review.');
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="ch-shell">
          <div className="ch-card">
            <h1 className="ch-title">
              <FaComments />&nbsp;Messages
            </h1>
            <p className="ch-subtitle">Loading chats…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !['jobseeker', 'employer'].includes(currentRole || '')) {
    return (
      <div>
        <Header />
        <div className="ch-shell">
          <div className="ch-card">
            <h1 className="ch-title">
              <FaComments />&nbsp;Messages
            </h1>
            <div className="ch-alert ch-alert--err">This page is only available for jobseekers and employers.</div>
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
      <div className="ch-shell">
        <div className="ch-card">
          <div className="ch-headrow">
            <h1 className="ch-title">
              <FaComments />&nbsp;Messages
            </h1>
            {socketStatus === 'reconnecting' && (
              <div className="ch-alert ch-alert--err">Reconnecting to chat server…</div>
            )}
            {error && <div className="ch-alert ch-alert--err">{error}</div>}
          </div>

          {/* Tabs + массовая рассылка + закрыть работу (только активные) */}
          {currentRole === 'employer' && jobPosts.length > 0 && (
            <div className="ch-jobs">
              <div className="ch-jobs__tabs">
                {jobPosts.map((job) => (
                  <button
                    key={job.id}
                    className={`ch-jobs__tab ${activeJobId === job.id ? 'is-active' : ''}`}
                    onClick={() => setActiveJobId(job.id)}
                    title={job.title}
                  >
                    {job.title}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="ch-broadcast"
                  onClick={() => setBroadcastOpen(true)}
                  disabled={!activeJobId}
                  title="Send a message to all applicants of this job"
                >
                  <FaUsers /> Send message to all applicants
                </button>
                <button
                  className="ch-broadcast"
                  onClick={async () => {
                    if (!activeJobId) return;
                    if (!confirm('Close this job? It will stop receiving applications.')) return;
                    try {
                      await closeJobPost(activeJobId);
                      // убрать вакансию из активных
                      setJobPosts((prev) => prev.filter((p) => p.id !== activeJobId));
                      setJobPostApplications((prev) => {
                        const copy = { ...prev };
                        delete copy[activeJobId];
                        return copy;
                      });
                      // выбрать следующую активную
                      const next = jobPosts.filter((p) => p.id !== activeJobId).filter(isActiveJob)[0];
                      setActiveJobId(next?.id || null);
                      setSelectedChat(null);
                    } catch (e: any) {
                      alert(e?.response?.data?.message || 'Failed to close the job.');
                    }
                  }}
                  title="Close this job"
                >
                  Close job
                </button>
              </div>
            </div>
          )}

          <div className="ch-layout">
            {/* список чатов */}
            <aside className="ch-sidebar">
              <h3 className="ch-sidebar__title">Chats</h3>
              {chatList.length > 0 ? (
                <ul className="ch-chatlist">
                  {chatList.map((chat) => (
                    <li
                      key={chat.id}
                      className={`ch-chatlist__item ${selectedChat === chat.id ? 'is-active' : ''} ${
                        chat.unreadCount > 0 ? 'has-unread' : ''
                      }`}
                      onClick={() => handleSelectChat(chat.id)}
                      title={chat.partner}
                    >
                      <div className="ch-chatlist__meta">
                        <div className="ch-chatlist__row">
                          <strong className="ch-chatlist__job">{chat.title}</strong>
                          {chat.unreadCount > 0 && <span className="ch-chatlist__badge">{chat.unreadCount}</span>}
                        </div>
                        <div className="ch-chatlist__partner">{chat.partner}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ch-muted">No chats for this job yet.</p>
              )}
            </aside>

            {/* окно чата */}
            <section className="ch-chat">
              {/* Broadcast modal */}
              {broadcastOpen && (
                <div className="ch-modal">
                  <div className="ch-modal__content">
                    <button className="ch-modal__close" onClick={() => setBroadcastOpen(false)}>
                      ×
                    </button>
                    <form onSubmit={handleBroadcast} className="ch-form">
                      <div className="ch-form__row">
                        <label className="ch-label">Message to all applicants</label>
                        <textarea
                          className="ch-textarea"
                          value={broadcastText}
                          onChange={(e) => setBroadcastText(e.target.value)}
                          rows={4}
                          placeholder="Type your message once — it will be sent to all applicants of this job"
                        />
                      </div>
                      <button type="submit" className="ch-btn">
                        <FaPaperPlane /> Send
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Cover Letter modal */}
              {coverPreview && (
                <div className="ch-modal">
                  <div className="ch-modal__content">
                    <button className="ch-modal__close" onClick={() => setCoverPreview(null)}>
                      ×
                    </button>
                    <h4 className="ch-title" style={{ fontSize: 18, marginBottom: 8 }}>Cover Letter</h4>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{coverPreview}</p>
                  </div>
                </div>
              )}

              {/* Review modal */}
              {reviewForm && (
                <div className="ch-modal">
                  <div className="ch-modal__content">
                    <button className="ch-modal__close" onClick={() => setReviewForm(null)}>
                      ×
                    </button>
                    <form onSubmit={handleCreateReview} className="ch-form">
                      <div className="ch-form__row">
                        <label className="ch-label">Rating (1–5)</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={reviewForm.rating}
                          onChange={(e) =>
                            setReviewForm((f) => (f ? { ...f, rating: Number(e.target.value) } : f))
                          }
                          className="ch-input"
                        />
                      </div>
                      <div className="ch-form__row">
                        <label className="ch-label">Comment</label>
                        <textarea
                          className="ch-textarea"
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm((f) => (f ? { ...f, comment: e.target.value } : f))}
                          rows={4}
                          placeholder="Share your experience working with this person"
                        />
                      </div>
                      {formError && <div className="ch-alert ch-alert--err">{formError}</div>}
                      <button type="submit" className="ch-btn">
                        Submit review
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {selectedChat ? (
                <>
                  <div className="ch-chat__head">
                    <h3 className="ch-chat__title">
                      Chat with{' '}
                      <span>
                        {currentRole === 'employer'
                          ? chatList.find((c) => c.id === selectedChat)?.partner || 'Unknown'
                          : applications.find((a) => a.id === selectedChat)?.job_post?.employer?.username ||
                            'Unknown'}
                      </span>
                    </h3>

                    {/* Quick actions */}
                    {currentApp && (
                      <div className="ch-chat__actions">
                        <Link to={`/public-profile/${currentApp.userId}`} className="ch-miniBtn">
                          View Profile
                        </Link>
                        {currentApp.coverLetter && (
                          <button className="ch-miniBtn" onClick={() => setCoverPreview(currentApp.coverLetter!)}>
                            Cover Letter
                          </button>
                        )}

                        {currentRole === 'employer' && currentApp.status === 'Pending' && (
                          <>
                            <button
                              className="ch-miniBtn"
                              onClick={async () => {
                                try {
                                  await updateApplicationStatus(currentApp.applicationId, 'Accepted');
                                  setJobPostApplications((prev) => {
                                    const arr = prev[currentApp.job_post_id] ?? [];
                                    const updated: JobApplicationDetails[] = arr.map((a) =>
                                      a.applicationId === currentApp.applicationId
                                        ? { ...a, status: 'Accepted' as JobApplicationDetails['status'] }
                                        : a
                                    );
                                    return { ...prev, [currentApp.job_post_id]: updated };
                                  });
                                } catch (e: any) {
                                  alert(e?.response?.data?.message || 'Failed to accept.');
                                }
                              }}
                            >
                              Accept
                            </button>
                            <button
                              className="ch-miniBtn"
                              onClick={async () => {
                                if (!confirm('Reject this applicant? This will remove the chat.')) return;
                                try {
                                  await updateApplicationStatus(currentApp.applicationId, 'Rejected');
                                  // удалить чат из списка и закрыть окно
                                  setJobPostApplications((prev) => {
                                    const arr = prev[currentApp.job_post_id] ?? [];
                                    const updated: JobApplicationDetails[] = arr
                                      .map((a) =>
                                        a.applicationId === currentApp.applicationId
                                          ? { ...a, status: 'Rejected' as JobApplicationDetails['status'] }
                                          : a
                                      )
                                      .filter((a) => a.status !== 'Rejected');
                                    return { ...prev, [currentApp.job_post_id]: updated };
                                  });
                                  setSelectedChat(null);
                                } catch (e: any) {
                                  alert(e?.response?.data?.message || 'Failed to reject.');
                                }
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        <button
                          className="ch-miniBtn"
                          onClick={() =>
                            setReviewForm({ applicationId: currentApp.applicationId, rating: 5, comment: '' })
                          }
                        >
                          Leave review
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="ch-thread">
                    {(messages[selectedChat] || []).map((msg) => (
                      <div
                        key={msg.id}
                        className={`ch-bubble ${msg.sender_id === profile.id ? 'ch-bubble--me' : 'ch-bubble--them'}`}
                      >
                        <div className="ch-bubble__text">{msg.content}</div>
                        <div className="ch-bubble__meta">
                          <span>{format(new Date(msg.created_at), 'PPpp')}</span>
                          <span className={`ch-read ${msg.is_read ? 'is-read' : ''}`}>
                            {msg.is_read ? 'Read' : 'Unread'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {currentTyping && <div className="ch-typing">Typing…</div>}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className={`ch-composer ${!selectedChat ? 'is-disabled' : ''}`}>
                    <input
                      type="text"
                      className="ch-input"
                      value={newMessage}
                      onChange={handleTyping}
                      placeholder={selectedChat ? 'Type a message…' : 'No chat selected'}
                      disabled={!selectedChat}
                    />
                    <button type="submit" className="ch-send" title="Send" disabled={!selectedChat}>
                      <FaPaperPlane />
                    </button>
                  </form>
                </>
              ) : (
                <div className="ch-thread">
                  <p className="ch-muted">Select a chat in the list or wait for new applicants.</p>
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
