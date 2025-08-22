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

/** DEV helpers */
// const isDev = typeof import.meta !== 'undefined' ? import.meta.env.DEV : false;
// const getAsParam = () => {
//   try {
//     return new URLSearchParams(window.location.search).get('as') as
//       | 'jobseeker'
//       | 'employer'
//       | null;
//   } catch {
//     return null;
//   }
// };
// const isDevDemoId = (id?: string) => !!id && id.startsWith('dev-');

const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const preselectJobPostId = location?.state?.jobPostId as string | null;
  const preselectApplicationId = location?.state?.applicationId as string | null;

  const { profile, currentRole, socket, socketStatus, setSocketStatus } =
    useRole();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostApplications, setJobPostApplications] = useState<{
    [jobPostId: string]: JobApplicationDetails[];
  }>({});

  const [activeJobId, setActiveJobId] = useState<string | null>(
    preselectJobPostId || null
  );
  const [selectedChat, setSelectedChat] = useState<string | null>(
    preselectApplicationId || null
  );

  const [messages, setMessages] = useState<{
    [jobApplicationId: string]: Message[];
  }>({});
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<{
    [jobApplicationId: string]: number;
  }>({});
  const [isTyping, setIsTyping] = useState<{
    [jobApplicationId: string]: boolean;
  }>({});
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [reviewForm, setReviewForm] = useState<{
    applicationId: string;
    rating: number;
    comment: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedSet = useRef<Set<string>>(new Set());
  const joinQueue = useRef<string[]>([]);
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  // const devSeededRef = useRef(false);


  const closeAllMenus = useCallback(() => {
  document
    .querySelectorAll<HTMLDetailsElement>('details.ch-dd[open]')
    .forEach(d => d.removeAttribute('open'));
}, []);

useEffect(() => {
  const onDocClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // если клик вне любого details.ch-dd — закрываем все
    if (!target.closest('details.ch-dd')) closeAllMenus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeAllMenus();
  };
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
  return () => {
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
  };
}, [closeAllMenus]);

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
          setApplications(
            apps.filter((a) => ['Pending', 'Accepted'].includes(a.status as any))
          );
        } else if (currentRole === 'employer') {
          const posts = await getMyJobPosts();
          const active = posts.filter(isActiveJob);
          setJobPosts(active);

          const appsArrays = await Promise.all(
            active.map((post) => getApplicationsForJobPost(post.id))
          );
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

  // DEV SEED
  // useEffect(() => {
  //   if (!isDev || devSeededRef.current) return;
  //   const as = getAsParam();
  //   if (!as) return;

  //   const hasAnyChats =
  //     (as === 'jobseeker' && applications.length > 0) ||
  //     (as === 'employer' &&
  //       (jobPosts.length > 0 || Object.keys(jobPostApplications).length > 0));

  //   if (hasAnyChats) return;

  //   const now = Date.now();
  //   if (as === 'jobseeker') {
  //     const demoAppId = 'dev-app-1';
  //     const demoEmployerId = 'dev-employer';
  //     const demo: JobApplication = {
  //       id: demoAppId,
  //       status: 'Pending' as any,
  //       job_post_id: 'dev-job-1' as any,
  //       job_post: {
  //         id: 'dev-job-1' as any,
  //         title: 'Demo Job (Pending)',
  //         employer: { id: demoEmployerId as any, username: 'Demo Employer' } as any,
  //       } as any,
  //     } as any;

  //     setApplications([demo]);
  //     setSelectedChat(demoAppId);

  //     const demoMsgs: Message[] = [
  //       {
  //         id: 'dev-m1',
  //         job_application_id: demoAppId,
  //         sender_id: demoEmployerId,
  //         recipient_id: profile?.id || 'dev-user',
  //         content: 'Hi! This is a demo conversation. (Pending)',
  //         created_at: new Date(now - 8 * 60 * 1000).toISOString(),
  //         is_read: true,
  //       },
  //       {
  //         id: 'dev-m2',
  //         job_application_id: demoAppId,
  //         sender_id: profile?.id || 'dev-user',
  //         recipient_id: demoEmployerId,
  //         content: 'Great, I can see the chat UI 👍',
  //         created_at: new Date(now - 5 * 60 * 1000).toISOString(),
  //         is_read: true,
  //       },
  //     ];
  //     setMessages((p) => ({ ...p, [demoAppId]: demoMsgs }));
  //     setUnreadCounts((p) => ({ ...p, [demoAppId]: 0 }));
  //   }

  //   if (as === 'employer') {
  //     const demoJob: JobPost = {
  //       id: 'dev-job-1' as any,
  //       title: 'Demo Job (Active)',
  //       status: 'Active' as any,
  //     } as any;

  //     const demoApplication: JobApplicationDetails = {
  //       applicationId: 'dev-app-2',
  //       job_post_id: demoJob.id,
  //       username: 'Jane Demo',
  //       userId: 'dev-js-1' as any,
  //       status: 'Pending',
  //       coverLetter: 'Hello! This is a demo cover letter.',
  //       appliedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
  //     } as any;

  //     setJobPosts([demoJob]);
  //     setJobPostApplications({ [demoJob.id]: [demoApplication] });
  //     setActiveJobId(demoJob.id);
  //     setSelectedChat(demoApplication.applicationId);

  //     const demoMsgs: Message[] = [
  //       {
  //         id: 'dev-m3',
  //         job_application_id: demoApplication.applicationId,
  //         sender_id: demoApplication.userId,
  //         recipient_id: profile?.id || 'dev-employer',
  //         content: 'Hi! I am interested in this job.',
  //         created_at: new Date(now - 15 * 60 * 1000).toISOString(),
  //         is_read: true,
  //       },
  //       {
  //         id: 'dev-m4',
  //         job_application_id: demoApplication.applicationId,
  //         sender_id: profile?.id || 'dev-employer',
  //         recipient_id: demoApplication.userId,
  //         content: 'Thanks for reaching out! Let’s chat here.',
  //         created_at: new Date(now - 10 * 60 * 1000).toISOString(),
  //         is_read: true,
  //       },
  //     ];
  //     setMessages((p) => ({ ...p, [demoApplication.applicationId]: demoMsgs }));
  //     setUnreadCounts((p) => ({ ...p, [demoApplication.applicationId]: 0 }));
  //   }

  //   devSeededRef.current = true;
  // }, [applications.length, jobPosts.length, jobPostApplications, profile]);

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

  const unreadKey = useMemo(
    () => `unreads_${profile?.id || 'anon'}`,
    [profile?.id]
  );

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
    if (
      !socket ||
      !profile ||
      !currentRole ||
      !['jobseeker', 'employer'].includes(currentRole)
    ) {
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
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          ),
        }));
        const unread = history.filter(
          (msg) => msg.recipient_id === profile.id && !msg.is_read
        ).length;
        setUnreadCounts((prevCounts) => ({
          ...prevCounts,
          [jobApplicationId]: selectedChat === jobApplicationId ? 0 : unread,
        }));
      }
    });

    socket.on('newMessage', (message: Message) => {
      setMessages((prev) => ({
        ...prev,
        [message.job_application_id]: [
          ...(prev[message.job_application_id] || []),
          message,
        ],
      }));

      const inOpenedChat = selectedChat === message.job_application_id;

      if (inOpenedChat) {
        socket.emit('markMessagesAsRead', {
          jobApplicationId: message.job_application_id,
        });
        scrollToBottom(true);
      } else if (message.recipient_id === profile.id && !message.is_read) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.job_application_id]:
            (prev[message.job_application_id] || 0) + 1,
        }));
      }
    });

    socket.on(
      'typing',
      (data: { userId: string; jobApplicationId: string; isTyping: boolean }) => {
        if (data.userId !== profile.id) {
          setIsTyping((prev) => ({
            ...prev,
            [data.jobApplicationId]: data.isTyping,
          }));
        }
      }
    );

    type MessagesReadPayload = { data: Message[] } | Message[];
    socket.on('messagesRead', (payload: MessagesReadPayload) => {
      const list: Message[] = Array.isArray(payload) ? payload : payload?.data || [];
      if (!list.length) return;

      const jobId = list[0].job_application_id;

      setMessages((prev) => {
        const prevList = prev[jobId] || [];
        const updates = new Map(list.map((m) => [m.id, m]));
        const nextList = prevList.map((m) =>
          updates.has(m.id) ? { ...m, ...updates.get(m.id)! } : m
        );
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
    if (!selectedChat || !newMessage.trim()) return;

    // dev-локал
  //   if (isDev && isDevDemoId(selectedChat)) {
  //     const myId = profile?.id || 'dev-user';
  //     const now = new Date().toISOString();
  //     const msg: Message = {
  //       id: 'dev-' + Math.random().toString(36).slice(2),
  //       job_application_id: selectedChat,
  //       sender_id: myId,
  //       recipient_id: 'dev-other',
  //       content: newMessage.trim(),
  //       created_at: now,
  //       is_read: true,
  //     };
  //     setMessages((p) => ({
  //       ...p,
  //       [selectedChat]: [...(p[selectedChat] || []), msg],
  //     }));
  //     setNewMessage('');
  //     scrollToBottom(true);
  //     return;
  //   }

    if (!socket) return;

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
          title:
            jobPosts.find((p) => p.id === app.job_post_id)?.title ||
            'Unknown Job',
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

  // все чаты — для верхнего пикера
  const allChats = useMemo(() => {
    if (currentRole === 'employer') {
      return Object.values(jobPostApplications)
        .flat()
        .map((app) => ({
          id: app.applicationId,
          label: `${
            jobPosts.find((p) => p.id === app.job_post_id)?.title || 'Job'
          } — ${app.username}`,
          job_post_id: app.job_post_id,
        }))
        .sort((a, b) => getLastTs(b.id) - getLastTs(a.id));
    }
    // jobseeker
    return applications
      .map((app) => ({
        id: app.id,
        label: `${app.job_post?.title || 'Job'} — ${
          app.job_post?.employer?.username || 'Employer'
        }`,
      }))
      .sort((a, b) => getLastTs(b.id) - getLastTs(a.id));
  }, [jobPostApplications, jobPosts, applications, currentRole, messages]);

  const selectedLabel = useMemo(() => {
    const pool =
      currentRole === 'employer'
        ? Object.values(jobPostApplications).flat().map((a) => ({
            id: a.applicationId,
            label: `${
              jobPosts.find((p) => p.id === a.job_post_id)?.title || 'Job'
            } — ${a.username}`,
          }))
        : applications.map((a) => ({
            id: a.id,
            label: `${a.job_post?.title || 'Job'} — ${
              a.job_post?.employer?.username || 'Employer'
            }`,
          }));
    return pool.find((x) => x.id === selectedChat)?.label || 'Chats…';
  }, [currentRole, jobPostApplications, jobPosts, applications, selectedChat]);

  const handleSelectChat = (jobApplicationId: string) => {
    const exists = [...chatList, ...allChats].some((c: any) => c.id === jobApplicationId);
    if (!exists) {
      setSelectedChat(null);
      return;
    }

    setSelectedChat(jobApplicationId);
    setUnreadCounts((prev) => ({ ...prev, [jobApplicationId]: 0 }));

    // dev
    // if (isDev && isDevDemoId(jobApplicationId)) return;

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
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          ),
        }));
        setUnreadCounts((prev) => ({ ...prev, [jobApplicationId]: 0 }));
      })
      .catch(() => setError('Failed to load chat history.'));
  };

  // текущая заявка (для действий работодателя)
  const currentApp = useMemo(() => {
    if (!selectedChat) return null;
    return (
      Object.values(jobPostApplications)
        .flat()
        .find((a) => a.applicationId === selectedChat) || null
    );
  }, [jobPostApplications, selectedChat]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedChat) return;

    const content = e.target.value;
    setNewMessage(content);

    // if (isDev && isDevDemoId(selectedChat)) return;
    if (!socket) return;

    socket.emit('typing', { jobApplicationId: selectedChat, isTyping: true });

    if (typingTimeoutRef.current[selectedChat]) {
      clearTimeout(typingTimeoutRef.current[selectedChat]);
    }

    typingTimeoutRef.current[selectedChat] = setTimeout(() => {
      socket.emit('typing', { jobApplicationId: selectedChat, isTyping: false });
    }, 3000);
  };

  const groupedByJob = useMemo(() => {
  if (currentRole !== 'employer') return [];
  return jobPosts.map(post => {
    const chats = (jobPostApplications[post.id] || [])
      .filter(a => a.status === 'Pending' || a.status === 'Accepted')
      .map(a => ({
        id: a.applicationId,
        partner: a.username,
        unreadCount: unreadCounts[a.applicationId] || 0,
      }))
      .sort((a,b) => getLastTs(b.id) - getLastTs(a.id));
    return { post, chats };
  }).filter(g => g.chats.length > 0);
}, [currentRole, jobPosts, jobPostApplications, unreadCounts, messages]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeJobId || !broadcastText.trim()) return;
    try {
      const res = await broadcastToApplicants(activeJobId, broadcastText.trim());
      alert(`Sent: ${res.sent}`);
      setBroadcastOpen(false);
      setBroadcastText('');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send broadcast.');
    }
  };

  const handleCloseJobNow = async () => {
  if (!activeJobId) return;
  if (!confirm('Close this job post? Applicants will no longer be able to message you.')) return;

  try {
    await closeJobPost(activeJobId);

    // убрать закрытую вакансию из списка активных
    setJobPosts((prev) => prev.filter((p) => p.id !== activeJobId));

    // очистить ее заявки в левой колонке
    setJobPostApplications((prev) => {
      const next = { ...prev };
      delete next[activeJobId];
      return next;
    });

    // если сейчас открыт чат по этой вакансии — сбросим выбор
    if (selectedChat) setSelectedChat(null);
    setActiveJobId(null);

    alert('Job closed successfully.');
  } catch (err: any) {
    alert(err?.response?.data?.message || 'Failed to close job.');
  }
};


  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="ch-shell">
          <div className="ch-card">
            <h1 className="ch-title">
              <FaComments />
              &nbsp;Messages
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
              <FaComments />
              &nbsp;Messages
            </h1>
            <div className="ch-alert ch-alert--err">
              This page is only available for jobseekers and employers.
            </div>
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
              <FaComments />
              &nbsp;Messages
            </h1>
            {socketStatus === 'reconnecting' && (
              <div className="ch-alert ch-alert--err">
                Reconnecting to chat server…
              </div>
            )}
            {error && <div className="ch-alert ch-alert--err">{error}</div>}
          </div>

          {/* Top bar: единый выбор чата */}
    <div
  className="ch-topbar"
  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
>
  <details className="ch-dd">
    <summary>{selectedLabel}</summary>
    <div className="ch-dd__menu">
      <ul className="ch-dd__ul">
  {currentRole === 'employer' ? (
    groupedByJob.map(g => (
      <li key={g.post.id} style={{ padding: '4px 2px' }}>
        <details className="ch-dd-sub">
          <summary>{g.post.title}</summary>
          <ul className="ch-dd__ul">
            {g.chats.map(c => (
              <li key={c.id}>
                <button
                  className="ch-dd__item"
                  onClick={() => {
                    setActiveJobId(g.post.id);
                    handleSelectChat(c.id);
                    closeAllMenus();
                  }}
                >
                  <span>{c.partner}</span>
                  {!!c.unreadCount && <span className="ch-dd__badge">{c.unreadCount}</span>}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </li>
    ))
  ) : (
    allChats.map((c: any) => (
      <li key={c.id}>
        <button
          className="ch-dd__item"
          onClick={() => { handleSelectChat(c.id); closeAllMenus(); }}
        >
          <span>{c.label}</span>
          {!!unreadCounts[c.id] && <span className="ch-dd__badge">{unreadCounts[c.id]}</span>}
        </button>
      </li>
    ))
  )}
</ul>
    </div>
  </details>
   {currentRole === 'employer' && activeJobId && (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        className="ch-btn"
        onClick={() => setBroadcastOpen(true)}
        title="Send a message to all applicants of this job"
      >
        <FaUsers />&nbsp;Message to all applicants
      </button>

      <button
        className="ch-btn"
        onClick={handleCloseJobNow}
        title="Close this job"
      >
        Close job
      </button>
    </div>
  )}

  
          </div>

          <div className="ch-layout">
            {/* список чатов */}
            <aside className="ch-sidebar">
              <h3 className="ch-sidebar__title">Chats</h3>
              {chatList.length > 0 ? (
                <ul className="ch-chatlist">
                  {chatList.map((chat) => (
                    <li
                      key={chat.id}
                      className={`ch-chatlist__item ${
                        selectedChat === chat.id ? 'is-active' : ''
                      } ${chat.unreadCount > 0 ? 'has-unread' : ''}`}
                      onClick={() => handleSelectChat(chat.id)}
                      title={chat.partner}
                    >
                      <div className="ch-chatlist__meta">
                        <div className="ch-chatlist__row">
                          <strong className="ch-chatlist__job">{chat.title}</strong>
                          {chat.unreadCount > 0 && (
                            <span className="ch-chatlist__badge">
                              {chat.unreadCount}
                            </span>
                          )}
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
                    <button
                      className="ch-modal__close"
                      onClick={() => setBroadcastOpen(false)}
                    >
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
                    <button
                      className="ch-modal__close"
                      onClick={() => setCoverPreview(null)}
                    >
                      ×
                    </button>
                    <h4 className="ch-title" style={{ fontSize: 18, marginBottom: 8 }}>
                      Cover Letter
                    </h4>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{coverPreview}</p>
                  </div>
                </div>
              )}

              {/* Review modal */}
              {reviewForm && (
                <div className="ch-modal">
                  <div className="ch-modal__content">
                    <button
                      className="ch-modal__close"
                      onClick={() => setReviewForm(null)}
                    >
                      ×
                    </button>
                    <form
                      onSubmit={async (e) => {
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
                          setFormError(
                            err?.response?.data?.message || 'Failed to submit review.'
                          );
                        }
                      }}
                      className="ch-form"
                    >
                      <div className="ch-form__row">
                        <label className="ch-label">Rating (1–5)</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={reviewForm.rating}
                          onChange={(e) =>
                            setReviewForm((f) =>
                              f ? { ...f, rating: Number(e.target.value) } : f
                            )
                          }
                          className="ch-input"
                        />
                      </div>
                      <div className="ch-form__row">
                        <label className="ch-label">Comment</label>
                        <textarea
                          className="ch-textarea"
                          value={reviewForm.comment}
                          onChange={(e) =>
                            setReviewForm((f) =>
                              f ? { ...f, comment: e.target.value } : f
                            )
                          }
                          rows={4}
                          placeholder="Share your experience working with this person"
                        />
                      </div>
                      {formError && (
                        <div className="ch-alert ch-alert--err">{formError}</div>
                      )}
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
                          ? chatList.find((c) => c.id === selectedChat)?.partner ||
                            'Unknown'
                          : applications.find((a) => a.id === selectedChat)?.job_post
                              ?.employer?.username || 'Unknown'}
                      </span>
                    </h3>

                   {currentRole === 'employer' && currentApp && (
  <div className="ch-actions">
    <details className="ch-dd ch-dd--right">
      <summary>Actions…</summary>
      <div className="ch-dd__menu">
        <ul className="ch-dd__ul">
          {/* View profile */}
          <li>
            <button
              className="ch-dd__item"
              onClick={() => {
                navigate(`/public-profile/${currentApp.userId}`);
                closeAllMenus();        // ← закрыть меню после перехода
              }}
            >
              View profile
            </button>
          </li>

          {/* Cover letter (если есть) */}
          {currentApp.coverLetter && (
            <li>
              <button
                className="ch-dd__item"
                onClick={() => {
                  setCoverPreview(currentApp.coverLetter!);
                  closeAllMenus();      // ← закрыть меню после открытия модалки
                }}
              >
                Cover letter
              </button>
            </li>
          )}

          {/* Accept / Reject только для Pending */}
          {currentApp.status === 'Pending' && (
            <>
              <li>
                <button
                  className="ch-dd__item"
                  onClick={async () => {
                    try {
                      await updateApplicationStatus(
                        currentApp.applicationId,
                        'Accepted'
                      );

                      setJobPostApplications(prev => {
                        const arr = prev[currentApp.job_post_id] ?? [];
                        const updated = arr.map(a =>
                          a.applicationId === currentApp.applicationId
                            ? { ...a, status: 'Accepted' as any }
                            : a
                        );
                        return { ...prev, [currentApp.job_post_id]: updated };
                      });
                    } catch (e: any) {
                      alert(e?.response?.data?.message || 'Failed to accept.');
                    } finally {
                      closeAllMenus();   // ← закрыть меню в любом случае
                    }
                  }}
                >
                  Accept
                </button>
              </li>

              <li>
                <button
                  className="ch-dd__item"
                  onClick={async () => {
                    if (!confirm('Reject this applicant? This will remove the chat.')) return;
                    try {
                      await updateApplicationStatus(
                        currentApp.applicationId,
                        'Rejected'
                      );

                      setJobPostApplications(prev => {
                        const arr = prev[currentApp.job_post_id] ?? [];
                        const updated = arr
                          .map(a =>
                            a.applicationId === currentApp.applicationId
                              ? { ...a, status: 'Rejected' as any }
                              : a
                          )
                          .filter(a => a.status !== 'Rejected');
                        return { ...prev, [currentApp.job_post_id]: updated };
                      });

                      setSelectedChat(null);
                    } catch (e: any) {
                      alert(e?.response?.data?.message || 'Failed to reject.');
                    } finally {
                      closeAllMenus();   // ← закрыть меню в любом случае
                    }
                  }}
                >
                  Reject
                </button>
              </li>
            </>
          )}

          {/* Leave review */}
          <li>
            <button
              className="ch-dd__item"
              onClick={() => {
                setReviewForm({
                  applicationId: currentApp.applicationId,
                  rating: 5,
                  comment: '',
                });
                closeAllMenus();         // ← закрыть меню после открытия формы
              }}
            >
              Leave review
            </button>
          </li>
        </ul>
      </div>
    </details>
  </div>
)}
                  </div>

                  <div className="ch-thread">
                    {(messages[selectedChat] || []).map((msg) => (
                      <div
                        key={msg.id}
                        className={`ch-bubble ${
                          msg.sender_id === profile.id
                            ? 'ch-bubble--me'
                            : 'ch-bubble--them'
                        }`}
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

                  <form
                    onSubmit={handleSendMessage}
                    className={`ch-composer ${!selectedChat ? 'is-disabled' : ''}`}
                  >
                    <input
                      type="text"
                      className="ch-input"
                      value={newMessage}
                      onChange={handleTyping}
                      placeholder={selectedChat ? 'Type a message…' : 'No chat selected'}
                      disabled={!selectedChat}
                    />
                    <button
                      type="submit"
                      className="ch-send"
                      title="Send"
                      disabled={!selectedChat}
                    >
                      <FaPaperPlane />
                    </button>
                  </form>
                </>
              ) : (
                <div className="ch-thread">
                  <p className="ch-muted">
                    Select a chat in the list or pick one from “Chats…”.
                  </p>
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
