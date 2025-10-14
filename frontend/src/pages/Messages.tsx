import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
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
  broadcastToSelected,
  bulkRejectApplications,
} from '../services/api';
import { JobApplication, JobPost, JobApplicationDetails } from '@types';
import { format } from 'date-fns';
import { FaComments, FaPaperPlane, FaUsers } from 'react-icons/fa';
import '../styles/chat-hub.css';
import { toast } from '../utils/toast';

interface Message {
  id: string;
  job_application_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

type ChatListItem = {
  id: string;
  title: string;
  partner: string;
  unreadCount: number;
  status?: 'Pending' | 'Accepted' | 'Rejected' | string;
  coverLetter?: string | null;
  userId?: string;
  job_post_id?: string;
  appliedAt?: string; 
  lastMessage?: string;
  lastActivity?: number; 
};



const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const preselectJobPostId = location?.state?.jobPostId as string | null;
  const preselectApplicationId = location?.state?.applicationId as string | null;

const {
  profile,
  currentRole,
  socket,
  socketStatus,
  setSocketStatus,
  getLastFromCache,
  setLastInCache,
} = useRole() as any;


  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostApplications, setJobPostApplications] = useState<{
    [jobPostId: string]: JobApplicationDetails[];
  }>({});

const [activeJobId, setActiveJobId] = useState<string | null>(
  preselectJobPostId || localStorage.getItem('lastActiveJobId') || null
);
const [selectedChat, setSelectedChat] = useState<string | null>(
  preselectApplicationId || localStorage.getItem('lastSelectedChat') || null
);

// ==== BEGIN: helper & comparator ====

// Стабильная сортировка по lastActivity ↓, затем appliedAt ↓, затем id ↑
const byLastActivityDesc = (a: any, b: any) => {
  if ((b.lastActivity ?? 0) !== (a.lastActivity ?? 0)) {
    return (b.lastActivity ?? 0) - (a.lastActivity ?? 0);
  }
  const a2 = a.appliedAt ? new Date(a.appliedAt as any).getTime() : 0;
  const b2 = b.appliedAt ? new Date(b.appliedAt as any).getTime() : 0;
  if (b2 !== a2) return b2 - a2;
  return String(a.id || '').localeCompare(String(b.id || ''));
};

const preloadLast = async (ids: string[]) => {
  for (const id of ids) {
    if (!messages[id]?.length) {
      const cached = getLastFromCache?.(id);
      if (cached) {
        setMessages((prev: any) => ({
          ...prev,
          [id]: [
            {
              id: `cached-${id}`,
              content: cached.text,
              created_at: new Date(cached.ts).toISOString(),
            },
          ],
        }));
      }
    }

    try {
      const hist = await getChatHistory(id, { page: 1, limit: 1 }, currentRole!);
      const arr = hist?.data || [];
      if (arr.length) {
        setMessages((prev: any) => ({ ...prev, [id]: arr }));
      const m = arr[0];
        setLastInCache?.(id, m.content, new Date(m.created_at).getTime());
      }
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        // просто пропускаем этот чат (не триггерим глобальный логаут)
        continue;
      }
      // остальные ошибки можно молча игнорировать
    }
  }
};





useEffect(() => {
  if (activeJobId) localStorage.setItem('lastActiveJobId', activeJobId);
}, [activeJobId]);

useEffect(() => {
  if (selectedChat) localStorage.setItem('lastSelectedChat', selectedChat);
}, [selectedChat]);

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const toggleSelect = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const clearSelection = () => setSelectedIds(new Set());

// МОДАЛКА ДЛЯ "MESSAGE SELECTED"
const [selModalOpen, setSelModalOpen] = useState(false);
const [selText, setSelText] = useState('');
//   const [appDetails, setAppDetails] = useState<{
//   fullName?: string | null;
//   referredBy?: string | null;
//   coverLetter?: string | null;
// } | null>(null);

const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
const [multiMode, setMultiMode] = useState(false);

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
// --- helpers for timestamps & picking latest application (jobseeker) ---
const ts = (d?: any) => (d ? new Date(d as any).getTime() : 0);

const pickLatestJobseekerApplicationId = (apps: JobApplication[]): string | null => {
  if (!apps || !apps.length) return null;
  // берём самую «свежую» по updated_at -> created_at
  const sorted = [...apps].sort(
    (a, b) =>
      ts((b as any).updated_at || (b as any).created_at) -
      ts((a as any).updated_at || (a as any).created_at)
  );
  return sorted[0]?.id || null;
};


  const closeAllMenus = useCallback(() => {
  document
    .querySelectorAll<HTMLDetailsElement>('details.ch-dd[open]')
    .forEach(d => d.removeAttribute('open'));
}, []);

const joinAllMyChats = useCallback((ids: string[]) => {
  if (!socket) return;
  ids.forEach((id) => {
    if (joinedSet.current.has(id)) return;
    if (socket.connected) {
      socket.emit('joinChat', { jobApplicationId: id });
      joinedSet.current.add(id);
    } else {
      joinQueue.current.push(id);
    }
  });
}, [socket]);

const getUnreadForJob = useCallback((jobId: string) => {
  const apps = jobPostApplications[jobId] || [];
  return apps.reduce((sum, a) => sum + (unreadCounts[a.applicationId] || 0), 0);
}, [jobPostApplications, unreadCounts]);


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
  const all = await getMyApplications();
  const filtered = all.filter(a => ['Pending','Accepted'].includes(a.status as any));
  setApplications(filtered);

  // подписываемся на все чаты (для превью/истории)
joinAllMyChats(filtered.map(a => a.id));
await preloadLast(filtered.map(a => a.id));
  // авто-выбор: 1) если пришли с preselect — он, 2) иначе из localStorage,
  // 3) иначе самая свежая заявка (last)
  if (preselectApplicationId && filtered.some(a => a.id === preselectApplicationId)) {
    setSelectedChat(preselectApplicationId);
  } else {
    const ls = localStorage.getItem('lastSelectedChat');
    if (ls && filtered.some(a => a.id === ls)) {
      setSelectedChat(ls);
    } else {
      const latestId = pickLatestJobseekerApplicationId(filtered);
      if (latestId) setSelectedChat(latestId);
    }
  }
}
 else if (currentRole === 'employer') {
  const posts = await getMyJobPosts();
  const active = posts.filter(isActiveJob);
  setJobPosts(active);

const arrays = await Promise.all(active.map(p => getApplicationsForJobPost(p.id)));
const map: Record<string, JobApplicationDetails[]> = {};
active.forEach((p, i) => { map[p.id] = arrays[i]; });
setJobPostApplications(map);

// ✅ Берём только Pending/Accepted, иначе бэк даёт 401
const allowed = arrays
  .flat()
  .filter(a => a.status === 'Pending' || a.status === 'Accepted');

const allIds = allowed.map(a => a.applicationId);
joinAllMyChats(allIds);
await preloadLast(allIds);


  if (!activeJobId && active[0]) setActiveJobId(active[0].id);
  if (!selectedChat) {
    const first = preselectApplicationId ?? arrays.flat()[0]?.applicationId;
    if (first) setSelectedChat(first);
  }
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
    setMultiMode(false);
  clearSelection();
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
  (currentRole !== 'jobseeker' && currentRole !== 'employer')
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

socket.on('connect_error', (err: any) => {
  setSocketStatus('reconnecting');
  if (typeof err?.message === 'string' && err.message.includes('401')) {
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
if (!socket || !socket.connected) {
  setError('Connecting to chat server… Try again in a moment.');
  return;
}

    if (typingTimeoutRef.current[selectedChat]) {
      clearTimeout(typingTimeoutRef.current[selectedChat]);
    }
    socket.emit('typing', { jobApplicationId: selectedChat, isTyping: false });

socket.emit('sendMessage', { jobApplicationId: selectedChat, content: newMessage.trim() });

    setNewMessage('');
  };

const chatList = useMemo<ChatListItem[]>(() => {
  if (currentRole === 'employer') {
    // важно: явно типизируем список, чтобы не терять поля applicationId/appliedAt
    const list: JobApplicationDetails[] = activeJobId
      ? (jobPostApplications[activeJobId] || [])
      : [];

return list
  .filter(app => app.status === 'Pending' || app.status === 'Accepted')
  .map((app): ChatListItem => {
    const msgs = messages[app.applicationId] || [];
    const lastMsg = msgs.length ? msgs[msgs.length - 1] : undefined;
const appliedTs = app.appliedAt ? new Date(app.appliedAt as any).getTime() : 0;
const lastTs = lastMsg ? new Date(lastMsg.created_at).getTime() : appliedTs;
    return {
      id: app.applicationId,
      title: jobPosts.find(p => p.id === app.job_post_id)?.title || 'Unknown Job',
      partner: app.username,
      status: app.status,
      unreadCount: unreadCounts[app.applicationId] ?? 0,
      coverLetter: app.coverLetter ?? null,
      userId: app.userId,
      job_post_id: app.job_post_id,
      appliedAt: app.appliedAt,
  lastMessage: lastMsg?.content || '',
  lastActivity: lastTs,
    };
  })
  // ВСЕГДА СОРТИРУЕМ ПО ПОСЛЕДНЕЙ АКТИВНОСТИ — БЕЗ «СКАЧКОВ» ПРИ ПРОСТОМ ВЫБОРЕ
  .sort(byLastActivityDesc);


  }

  // jobseeker
// jobseeker
let source = applications;
if (currentRole === 'jobseeker' && selectedChat) {
  source = applications.filter(a => a.id === selectedChat);
}

return source
  .map((app): ChatListItem => {
    const msgs = messages[app.id] || [];
    const lastMsg = msgs.length ? msgs[msgs.length - 1] : undefined;
    const lastTs =
      lastMsg ? ts(lastMsg.created_at)
              : ts((app as any).updated_at || (app as any).created_at);

    return {
      id: app.id,
      title: app.job_post?.title || 'Unknown Job',
      partner: app.job_post?.employer?.username || 'Unknown',
      unreadCount: unreadCounts[app.id] ?? 0,
      status: app.status,
      lastMessage: lastMsg?.content || '',
      lastActivity: lastTs,
      appliedAt: (app as any).created_at,
    };
  })
  // единая сортировка по последней активности, чтобы превью не «скакали»
  .sort(byLastActivityDesc);



}, [
  activeJobId,
  jobPostApplications,
  unreadCounts,
  jobPosts,
  applications,
  currentRole,
  messages,
]);


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
      if (currentRole === 'employer') {
    // показываем title выбранной вакансии (activeJobId)
    return jobPosts.find(p => p.id === activeJobId)?.title || 'Chats…';
  }
   const pool = applications.map((a) => ({
    id: a.id,
    label: `${a.job_post?.title || 'Job'} — ${
      a.job_post?.employer?.username || 'Employer'
    }`,
  }));
  return pool.find((x) => x.id === selectedChat)?.label || 'Chats…';
}, [currentRole, jobPosts, activeJobId, applications, selectedChat]);

  const handleSelectChat = async (jobApplicationId: string) => {
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

const fetchHistory = async () => {
  const history = await getChatHistory(jobApplicationId, { page: 1, limit: 100 }, currentRole!);
  setMessages(prev => ({
    ...prev,
    [jobApplicationId]: history.data.sort(
      (a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ),
  }));
  setUnreadCounts(prev => ({ ...prev, [jobApplicationId]: 0 }));
};

try {
  await fetchHistory();
} catch (err: any) {
  const msg: string = err?.response?.data?.message || err?.message || '';
  if (/not initialized/i.test(msg) || /инициал/i.test(msg)) {
    setError('Initializing chat…');
    const onInit = (d: { jobApplicationId: string }) => {
      if (d.jobApplicationId === jobApplicationId) {
        socket?.off('chatInitialized', onInit);
        socket?.emit('joinChat', { jobApplicationId });
        fetchHistory().finally(() => setError(null));
      }
    };
    socket?.on('chatInitialized', onInit);
    // если бэк поддерживает явный init — пробуем
    socket?.emit('initChat', { jobApplicationId });
  } else {
    setError('Failed to load chat history.');
  }
}

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

  useEffect(() => {
  const mark = () => {
    if (!selectedChat || !socket?.connected) return;
    socket.emit('markMessagesAsRead', { jobApplicationId: selectedChat });
    setUnreadCounts(prev => ({ ...prev, [selectedChat]: 0 }));
  };

  const onFocus = () => mark();
  const onVisible = () => { if (document.visibilityState === 'visible') mark(); };

  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisible);
  };
}, [selectedChat, socket]);


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
      toast.success(`Sent to ${res.sent} applicants.`);
      setBroadcastOpen(false);
      setBroadcastText('');
    } catch (err: any) {
     toast.error(err?.response?.data?.message || 'Failed to send broadcast.');

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
    setMultiMode(false);
clearSelection();



    toast.success('Job closed successfully.');
  } catch (err: any) {
    toast.error(err?.response?.data?.message || 'Failed to close job.');
  }
};

useEffect(() => {
  // сообщаем RoleContext, какой чат сейчас открыт (или null)
  const ev = new CustomEvent<string | null>('jobforge:selected-chat-changed', {
    detail: selectedChat ?? null,
  });
  window.dispatchEvent(ev);

  return () => {
    // при размонтировании сбрасываем
    const clearEv = new CustomEvent<string | null>('jobforge:selected-chat-changed', {
      detail: null,
    });
    window.dispatchEvent(clearEv);
  };
}, [selectedChat]);



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
    <summary title={selectedLabel} className="one-line">{selectedLabel}</summary>
    <div className="ch-dd__menu">
     <ul className="ch-dd__ul">
{currentRole === 'employer' ? (
  [...jobPosts]
    .sort((a, b) => {
      const atA = a.created_at ? new Date(a.created_at as any).getTime() : 0;
      const atB = b.created_at ? new Date(b.created_at as any).getTime() : 0;
      return atB - atA;
    })
    .map((post) => (
      <li key={post.id}>
        <button
          className="ch-dd__item"
          onClick={() => { setActiveJobId(post.id); closeAllMenus(); }}
        >
          <span>
            {post.title}
            <small style={{ display: 'block', fontWeight: 400, fontSize: 11, opacity: 0.75 }}>
              {post.created_at ? format(new Date(post.created_at as any), 'PP') : ''}
            </small>
          </span>
          {getUnreadForJob(post.id) > 0 && (
            <span className="ch-dd__badge">{getUnreadForJob(post.id)}</span>
          )}
        </button>
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
  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
    {!multiMode ? (
      <>
        <button className="ch-btn" onClick={() => setBroadcastOpen(true)}>
          <FaUsers />&nbsp;Message to all applicants
        </button>
        <button className="ch-btn" onClick={() => setConfirmCloseOpen(true)}>
          Close job
        </button>
        {chatList.length > 0 && (
          <button className="ch-btn" onClick={() => { setMultiMode(true); clearSelection(); }}>
            Select candidates
          </button>
        )}
      </>
    ) : (
      <>
        {selectedIds.size > 0 && (
          <>
            <button className="ch-btn" onClick={() => setSelModalOpen(true)}>
              Message Selected ({selectedIds.size})
            </button>
            <button
              className="ch-btn"
              onClick={async () => {
                if (!activeJobId) return;
                const ids = Array.from(selectedIds);
                if (!ids.length) return;
                if (!confirm(`Reject ${ids.length} selected applicant(s)? This will remove their chats.`)) return;
                try {
                  const res = await bulkRejectApplications(ids);
                  setJobPostApplications(prev => {
                    const copy = { ...prev };
                    Object.keys(copy).forEach(jobId => {
                      copy[jobId] = (copy[jobId] || []).filter(a => !ids.includes(a.applicationId));
                    });
                    return copy;
                  });
                  clearSelection();
                  setMultiMode(false);
                  toast.success(`Rejected ${res.updated} applicants.`);
                } catch (err: any) {
                  toast.error(err?.response?.data?.message || 'Failed to bulk reject.');
                }
              }}
            >
              Reject Selected ({selectedIds.size})
            </button>
          </>
        )}
        <button className="ch-btn" onClick={() => { setMultiMode(false); clearSelection(); }}>
          Cancel
        </button>
      </>
    )}
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
  className={`ch-chatlist__item ${selectedChat === chat.id ? 'is-active' : ''}
    ${chat.unreadCount > 0 ? 'has-unread' : ''}
    ${chat.status === 'Accepted' ? 'is-accepted' : ''}`}
  onClick={() => handleSelectChat(chat.id)}
  title={chat.partner}
>
  {/* ЧЕКБОКС ВЫБОРА — НЕ МЕШАЕТ ОТКРЫТИЮ ЧАТА */}
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
{currentRole === 'employer' && multiMode && (
  <input
    type="checkbox"
    checked={selectedIds.has(chat.id)}
    onChange={(e) => { e.stopPropagation(); toggleSelect(chat.id); }}
    onClick={(e) => e.stopPropagation()}
    style={{ marginTop: 2 }}
  />
)}


    <div className="ch-chatlist__meta" style={{ flex: 1 }}>
      <div className="ch-chatlist__row">
        <span className="ch-chatlist__partner">{chat.partner}</span>
        <div
          className="ch-chatlist__right"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
        >
          {chat.status === 'Accepted' && <span className="ch-chip">Interview</span>}
          {chat.unreadCount > 0 && (
            <span className="ch-chatlist__badge">{chat.unreadCount}</span>
          )}
        </div>
      </div>

    <div className="ch-chatlist__applied" title="Last activity">
  {chat.lastActivity
    ? format(new Date(chat.lastActivity), 'PPpp')
    : (chat.appliedAt ? `Applied: ${format(new Date(chat.appliedAt), 'PPpp')}` : '')
  }
</div>
{chat.lastMessage && (
  <div className="ch-chatlist__last one-line" title={chat.lastMessage}>
    {chat.lastMessage}
  </div>
)}

    </div>
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

{selModalOpen && (
  <div className="ch-modal">
    <div className="ch-modal__content">
      <button
        className="ch-modal__close"
        onClick={() => setSelModalOpen(false)}
      >
        ×
      </button>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!activeJobId) return;
          const ids = Array.from(selectedIds);
          if (!ids.length) return;
          const text = selText.trim();
          if (!text) return;
          try {
            const res = await broadcastToSelected(activeJobId, {
              applicationIds: ids,
              content: text,
            });
           toast.success(`Sent to ${res.sent} applicants.`);
setSelText('');
setSelModalOpen(false);
setMultiMode(false);     // ← выходим из режима
clearSelection();        // ← сбрасываем чекбоксы

          } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to send to selected.');
          }
        }}
        className="ch-form"
      >
        <div className="ch-form__row">
          <label className="ch-label">Message to selected applicants</label>
          <textarea
            className="ch-textarea"
            value={selText}
            onChange={(e) => setSelText(e.target.value)}
            rows={4}
            placeholder="Type your message — it will be sent only to selected applicants"
          />
        </div>
        <button type="submit" className="ch-btn">
          <FaPaperPlane /> Send to selected ({selectedIds.size})
        </button>
      </form>
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
                          toast.success('Review submitted successfully!');
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
  {currentRole === 'employer' && currentApp ? (
<a
  href={`/public-profile/${currentApp.userId}`}
  className="ch-link"
  title="Open applicant profile"
  target="_blank"
  rel="noopener noreferrer"
>
  {currentApp.username}
</a>
  ) : (
    <span>
      {applications.find((a) => a.id === selectedChat)?.job_post?.employer?.username || 'Unknown'}
    </span>
  )}
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
                closeAllMenus();
              }}
            >
              View profile
            </button>
          </li>

          {/* View details */}
          {/* <li>
            <button
              className="ch-dd__item"
              onClick={() => {
                const d = (currentApp as any).details || {};
                setAppDetails({
                  fullName: d.fullName ?? (currentApp as any).fullName ?? null,
                  referredBy: d.referredBy ?? (currentApp as any).referredBy ?? null,
                  coverLetter: d.coverLetter ?? currentApp.coverLetter ?? null,
                });
                closeAllMenus();
              }}
            >
              View details
            </button>
          </li> */}

          {/* Accept / Reject только для Pending */}
          {currentApp.status === 'Pending' && (
            <>
              <li>
                <button
                  className="ch-dd__item"
                  onClick={async () => {
                    try {
                      await updateApplicationStatus(currentApp.applicationId, 'Accepted');
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
                      toast.error(e?.response?.data?.message || 'Failed to accept.');
                    } finally {
                      closeAllMenus();
                    }
                  }}
                >
                  Invite to interview
                </button>
              </li>

              <li>
                <button
                  className="ch-dd__item"
                  onClick={async () => {
                    if (!confirm('Reject this applicant? This will remove the chat.')) return;
                    try {
                      await updateApplicationStatus(currentApp.applicationId, 'Rejected');
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
                      toast.error(e?.response?.data?.message || 'Failed to reject.');
                    } finally {
                      closeAllMenus();
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
                      autoComplete="off"
    autoCorrect="on"
    inputMode="text"
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
      {confirmCloseOpen && (
  <div className="ch-modal">
    <div className="ch-modal__content">
      <button className="ch-modal__close" onClick={() => setConfirmCloseOpen(false)}>×</button>
      <h4 className="ch-title" style={{ fontSize: 18, marginBottom: 8 }}>
        Close job
      </h4>
      <p style={{ marginBottom: 12 }}>
        Are you sure you want to close this job post? Applicants will no longer be able to message you.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="ch-btn"
          onClick={async () => {
            if (!activeJobId) return;
            try {
              await closeJobPost(activeJobId);
              setJobPosts(prev => prev.filter(p => p.id !== activeJobId));
              setJobPostApplications(prev => {
                const next = { ...prev };
                delete next[activeJobId];
                return next;
              });
              if (selectedChat) setSelectedChat(null);
              setActiveJobId(null);
              setMultiMode(false);
              clearSelection();
              toast.success('Job closed successfully.');
            } catch (err: any) {
              toast.error(err?.response?.data?.message || 'Failed to close job.');
            } finally {
              setConfirmCloseOpen(false);
            }
          }}
        >
          Close job
        </button>
        <button className="ch-btn" onClick={() => setConfirmCloseOpen(false)}>Cancel</button>
      </div>
    </div>
  </div>
)}

      <Footer />
      <Copyright />
    </div>
  );
};

export default Messages;
