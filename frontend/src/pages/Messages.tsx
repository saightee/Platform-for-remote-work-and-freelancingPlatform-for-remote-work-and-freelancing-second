import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { useRole } from '../context/RoleContext';
import { getMyApplications, getMyJobPosts, getApplicationsForJobPost, getChatHistory, createReview } from '../services/api';
import { JobApplication, JobPost, JobApplicationDetails } from '@types';
import { format } from 'date-fns';
import { FaComments, FaPaperPlane, FaStar } from 'react-icons/fa';
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
  const { profile, currentRole, socket, socketStatus, setSocketStatus } = useRole();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostApplications, setJobPostApplications] = useState<{ [jobPostId: string]: JobApplicationDetails[] }>({});
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ [jobApplicationId: string]: Message[] }>({});
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<{ [jobApplicationId: string]: number }>({});
  const [isTyping, setIsTyping] = useState<{ [jobApplicationId: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedSet = useRef<Set<string>>(new Set());
  const joinQueue = useRef<string[]>([]);
  const [reviewForm, setReviewForm] = useState<{ applicationId: string; rating: number; comment: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const currentMessages = useMemo(() => selectedChat ? messages[selectedChat] : [], [selectedChat, messages]);
  const currentTyping = useMemo(() => selectedChat ? isTyping[selectedChat] : false, [selectedChat, isTyping]);

  type Timer = ReturnType<typeof setTimeout>;
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const joinChats = () => {
    let ids: string[] = [];
    if (currentRole === 'jobseeker') {
      ids = applications.map(a => a.id);
    } else if (currentRole === 'employer') {
      ids = Object.values(jobPostApplications).flat().map(a => a.applicationId);
    }

    ids.forEach(id => {
      if (joinedSet.current.has(id)) return;
      if (socket?.connected) {
        socket.emit('joinChat', { jobApplicationId: id });
        joinedSet.current.add(id);
      } else {
        joinQueue.current.push(id);
      }
    });
  };

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
          setApplications(apps.filter((app) => app.status === 'Accepted'));
        } else if (currentRole === 'employer') {
          const posts = await getMyJobPosts();
          setJobPosts(posts);
          const appsArrays = await Promise.all(posts.map(post => getApplicationsForJobPost(post.id)));
          const appsMap: { [jobPostId: string]: JobApplicationDetails[] } = {};
          posts.forEach((post, index) => {
            appsMap[post.id] = appsArrays[index].filter((app) => app.status === 'Accepted');
          });
          setJobPostApplications(appsMap);
        }
      } catch (error) {
        console.error('Error fetching applications:', error);
        setError('Failed to load applications.');
      } finally {
        setIsLoading(false);
      }
    };

    if (profile && currentRole && ['jobseeker', 'employer'].includes(currentRole) && socket) {
      fetchData();
    }
  }, [profile, currentRole, socket]);

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
      try {
        if (currentRole === 'jobseeker') {
          const apps = await getMyApplications();
          setApplications(apps.filter(app => app.status === 'Accepted'));
        } else if (currentRole === 'employer') {
          const posts = await getMyJobPosts();
          const appsArrays = await Promise.all(posts.map(post => getApplicationsForJobPost(post.id)));
          const appsMap: { [jobPostId: string]: JobApplicationDetails[] } = {};
          posts.forEach((post, index) => { appsMap[post.id] = appsArrays[index].filter(app => app.status === 'Accepted'); });
          setJobPostApplications(appsMap);
        }
      } catch (err) {
        console.error('Error refreshing applications after chat initialization:', err);
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
      joinChats();
      joinQueue.current.forEach(id => {
        socket.emit('joinChat', { jobApplicationId: id });
        joinedSet.current.add(id);
      });
      joinQueue.current = [];
    });

    joinChats();

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
  }, [profile, currentRole, socket, applications, jobPostApplications, selectedChat]);

  const scrollToBottom = useCallback((smooth: boolean = false) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

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
    if (currentRole === 'jobseeker') {
      return applications.map((app) => ({
        id: app.id,
        title: app.job_post?.title || 'Unknown Job',
        partner: getChatPartner(app.id),
        unreadCount: unreadCounts[app.id] || 0,
      }));
    } else if (currentRole === 'employer') {
      return Object.values(jobPostApplications).flat().map(app => ({
        id: app.applicationId,
        title: jobPosts.find(post => post.id === app.job_post_id)?.title || 'Unknown Job',
        partner: app.username,
        unreadCount: unreadCounts[app.applicationId] || 0
      }));
    }
    return [];
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

  if (getChatList().length === 0 && !isLoading) return (
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

          <div className="msg-grid">
            {/* left: chat list */}
            <aside className="msg-list-card">
              <h3 className="msg-list-title">Chats</h3>
              {getChatList().length > 0 ? (
                <ul className="msg-list">
                  {getChatList().map((chat) => (
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
              {reviewForm && (
                <div className="msg-modal">
                  <div className="msg-modal-content">
                    <button className="msg-modal-close" onClick={() => setReviewForm(null)}>×</button>
                    <form onSubmit={handleCreateReview} className="msg-review-form">
                      {formError && <div className="msg-alert msg-err">{formError}</div>}

                      <div className="msg-row">
                        <label className="msg-label">Rating</label>
                        <div className="msg-stars">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`msg-star ${reviewForm.rating >= star ? 'is-filled' : ''}`}
                              onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="msg-row">
                        <label className="msg-label">Comment</label>
                        <textarea
                          className="msg-textarea"
                          value={reviewForm.comment}
                          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                          rows={4}
                          placeholder="Share your feedback"
                        />
                      </div>

                      <button type="submit" className="msg-btn">Submit review</button>
                    </form>
                  </div>
                </div>
              )}

              {selectedChat ? (
                <>
                  <div className="msg-window-head">
                    <h3 className="msg-chat-title">Chat with <span>{getChatPartner(selectedChat)}</span></h3>
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
                    {isTyping[selectedChat] && (
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
