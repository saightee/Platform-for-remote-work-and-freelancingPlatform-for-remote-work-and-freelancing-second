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
} from '../services/api';
import { JobApplication, JobPost, JobApplicationDetails } from '@types';
import { format } from 'date-fns';
import { FaComments, FaPaperPlane, FaStar, FaUsers } from 'react-icons/fa';
import '../styles/messages.css';

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedSet = useRef<Set<string>>(new Set());
  const joinQueue = useRef<string[]>([]);
  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // хелпер: время последнего сообщения по чату
const getLastTs = (chatId: string) => {
  const list = messages[chatId];
  if (!list || !list.length) return 0;
  return new Date(list[list.length - 1].created_at).getTime();
};



  const currentMessages = useMemo(() => selectedChat ? messages[selectedChat] : [], [selectedChat, messages]);
  const currentTyping = useMemo(() => selectedChat ? isTyping[selectedChat] : false, [selectedChat, isTyping]);

  type Timer = ReturnType<typeof setTimeout>;
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      typingTimeoutRef.current = {};
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        if (currentRole === 'jobseeker') {
          const apps = await getMyApplications();
          // у джобсикера чаты только поAccepted (как раньше)
          setApplications(apps.filter((app) => app.status === 'Accepted'));
        } else if (currentRole === 'employer') {
          const posts = await getMyJobPosts();
          setJobPosts(posts);
          const appsArrays = await Promise.all(posts.map(post => getApplicationsForJobPost(post.id)));
          const appsMap: { [jobPostId: string]: JobApplicationDetails[] } = {};
          // ВАЖНО: берем все отклики (Pending/Accepted/Rejected), чтобы можно было писать Pending
          posts.forEach((post, index) => { appsMap[post.id] = appsArrays[index]; });
          setJobPostApplications(appsMap);

          if (!activeJobId && posts[0]) setActiveJobId(posts[0].id);
          if (preselectApplicationId) setSelectedChat(preselectApplicationId);
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
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

  // socket events (ЛЕНИВО — подписываемся на комнату только при открытии конкретного чата)
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
          [jobApplicationId]: history.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        }));
        const unread = history.filter((msg) => msg.recipient_id === profile.id && !msg.is_read).length;
        setUnreadCounts((prevCounts) => ({
          ...prevCounts,
          [jobApplicationId]: selectedChat === jobApplicationId ? 0 : unread,
        }));
      } else {
        console.warn('Received empty or undefined chat history');
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
      const list: Message[] = Array.isArray(payload) ? payload : (payload?.data || []);
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
      // только догоняем join для тех, кого пытались открыть до коннекта
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

  const handleSelectChat = (jobApplicationId: string) => {
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
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to submit review.');
    }
  };

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

  const getChatPartner = (jobApplicationId: string) => {
    if (currentRole === 'jobseeker') {
      const app = applications.find((a) => a.id === jobApplicationId);
      if (app?.job_post?.employer_id) {
        return app.job_post.employer?.username || 'Unknown';
      }
      return 'Unknown';
    } else if (currentRole === 'employer') {
      const app = Object.values(jobPostApplications).flat().find(a => a.applicationId === jobApplicationId);
      return app?.username || 'Unknown';
    }
    return 'Unknown';
  };

const getChatList = () => {
  if (currentRole === 'employer') {
    const list = activeJobId ? (jobPostApplications[activeJobId] || []) : [];
    return list
      .map(app => ({
        id: app.applicationId,
        title: jobPosts.find(post => post.id === app.job_post_id)?.title || 'Unknown Job',
        partner: app.username,
        status: app.status,
        unreadCount: unreadCounts[app.applicationId] || 0,
        coverLetter: app.coverLetter,
        userId: app.userId,
      }))
      .sort((a, b) => getLastTs(b.id) - getLastTs(a.id));  // 👈 свежие сверху
  }

  // jobseeker
  return applications
    .map(app => ({
      id: app.id,
      title: app.job_post?.title || 'Unknown Job',
      partner: getChatPartner(app.id),
      unreadCount: unreadCounts[app.id] || 0,
    }))
    .sort((a, b) => getLastTs(b.id) - getLastTs(a.id));    // 👈 свежие сверху
};


  const chatList = getChatList();

  const currentApp = useMemo(() => {
    if (!selectedChat) return null;
    return Object.values(jobPostApplications).flat().find(a => a.applicationId === selectedChat) || null;
  }, [jobPostApplications, selectedChat]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobId || !broadcastText.trim()) return;
    try {
      const res = await broadcastToApplicants(activeJobId, broadcastText.trim());
      alert(`Sent: ${res.sent}`);
      setBroadcastOpen(false);
      setBroadcastText('');
    } catch (err:any) {
      alert(err.response?.data?.message || 'Failed to send broadcast.');
    }
  };

  if (isLoading) return (
    <div>
      <Header />
      <div className="msg-shell">
        <div className="msg-card">
          <h1 className="msg-title"><FaComments />&nbsp;Messages</h1>
          <p className="msg-subtitle">Loading chats…</p>
        </div>
      </div>
    </div>
  );

  if (chatList.length === 0 && !isLoading) return (
    <div>
      <Header />
      <div className="msg-shell">
        <div className="msg-card">
          <h1 className="msg-title"><FaComments />&nbsp;Messages</h1>
          <div className="msg-alert msg-err">There are no available chats.</div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );

  if (!profile || !['jobseeker', 'employer'].includes(currentRole || '')) {
    return (
      <div>
        <Header />
        <div className="msg-shell">
          <div className="msg-card">
            <h1 className="msg-title"><FaComments />&nbsp;Messages</h1>
            <div className="msg-alert msg-err">This page is only available for jobseekers and employers.</div>
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
      <div className="msg-shell">
        <div className="msg-card">
          <div className="msg-headrow">
            <h1 className="msg-title"><FaComments />&nbsp;Messages</h1>
            {socketStatus === 'reconnecting' && (
              <div className="msg-alert msg-err">Reconnecting to chat server…</div>
            )}
            {error && <div className="msg-alert msg-err">{error}</div>}
          </div>

          {/* NEW: Tabs of jobs + broadcast for employers */}
          {currentRole === 'employer' && jobPosts.length > 0 && (
            <div className="msg-jobs">
              <div className="msg-jobs-tabs">
                {jobPosts.map(job => (
                  <button
                    key={job.id}
                    className={`msg-job-tab ${activeJobId === job.id ? 'is-active' : ''}`}
                    onClick={() => setActiveJobId(job.id)}
                    title={job.title}
                  >
                    {job.title}
                  </button>
                ))}
              </div>
              <button
                className="msg-broadcast"
                onClick={() => setBroadcastOpen(true)}
                disabled={!activeJobId}
                title="Send a message to all applicants of this job"
              >
                <FaUsers /> Send message to all applicants
              </button>
            </div>
          )}

          <div className="msg-grid">
            {/* left: chat list */}
            <aside className="msg-list-card">
              <h3 className="msg-list-title">Chats</h3>
              {chatList.length > 0 ? (
                <ul className="msg-list">
                  {chatList.map((chat) => (
                    <li
                      key={chat.id}
                      className={`msg-list-item ${selectedChat === chat.id ? 'is-active' : ''} ${chat.unreadCount > 0 ? 'has-unread' : ''}`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="msg-list-meta">
                        <div className="msg-list-title-row">
                          <strong className="msg-list-job">{chat.title}</strong>
                          {chat.unreadCount > 0 && <span className="msg-unread">{chat.unreadCount}</span>}
                        </div>
                        <div className="msg-list-partner">{chat.partner}</div>
                      </div>

                      {(currentRole === 'employer' || currentRole === 'jobseeker') && (
                        <button
                          className="msg-mini-btn"
                          onClick={(e) => { e.stopPropagation(); setReviewForm({ applicationId: chat.id, rating: 5, comment: '' }); }}
                          title="Leave review"
                        >
                          <FaStar />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="msg-muted">No active chats found.</p>
              )}
            </aside>

            {/* right: chat window */}
            <section className="msg-window-card">

              {/* Broadcast modal */}
              {broadcastOpen && (
                <div className="msg-modal">
                  <div className="msg-modal-content">
                    <button className="msg-modal-close" onClick={() => setBroadcastOpen(false)}>×</button>
                    <form onSubmit={handleBroadcast} className="msg-review-form">
                      <div className="msg-row">
                        <label className="msg-label">Message to all applicants</label>
                        <textarea
                          className="msg-textarea"
                          value={broadcastText}
                          onChange={(e) => setBroadcastText(e.target.value)}
                          rows={4}
                          placeholder="Type your message once — it will be sent to all applicants of this job"
                        />
                      </div>
                      <button type="submit" className="msg-btn"><FaPaperPlane /> Send</button>
                    </form>
                  </div>
                </div>
              )}

              {/* Cover Letter modal */}
              {coverPreview && (
                <div className="msg-modal">
                  <div className="msg-modal-content">
                    <button className="msg-modal-close" onClick={() => setCoverPreview(null)}>×</button>
                    <h4 className="msg-title">Cover Letter</h4>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{coverPreview}</p>
                  </div>
                </div>
              )}

              {selectedChat ? (
                <>
                  <div className="msg-window-head">
                    <h3 className="msg-chat-title">Chat with <span>{getChatPartner(selectedChat)}</span></h3>

                    {/* NEW: quick actions */}
                    {currentApp && (
                      <div className="msg-head-actions">
                        <Link to={`/public-profile/${currentApp.userId}`} className="msg-mini-btn">View Profile</Link>
                        {currentApp.coverLetter && (
                          <button className="msg-mini-btn" onClick={() => setCoverPreview(currentApp.coverLetter!)}>Cover Letter</button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="msg-thread">
                    {(messages[selectedChat] || []).map((msg) => (
                      <div
                        key={msg.id}
                        className={`msg-bubble ${msg.sender_id === profile.id ? 'from-me' : 'from-them'}`}
                      >
                        <div className="msg-bubble-text">{msg.content}</div>
                        <div className="msg-bubble-meta">
                          <span>{format(new Date(msg.created_at), 'PPpp')}</span>
                          <span className={`msg-read ${msg.is_read ? 'is-read' : ''}`}>{msg.is_read ? 'Read' : 'Unread'}</span>
                        </div>
                      </div>
                    ))}
                    {currentTyping && (
                      <div className="msg-typing"> {getChatPartner(selectedChat)} is typing…</div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="msg-composer">
                    <input
                      type="text"
                      className="msg-input"
                      value={newMessage}
                      onChange={handleTyping}
                      placeholder="Type a message…"
                    />
                    <button type="submit" className="msg-send-btn" title="Send">
                      <FaPaperPlane />
                    </button>
                  </form>
                </>
              ) : (
                <p className="msg-muted">Select a chat to start messaging.</p>
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
