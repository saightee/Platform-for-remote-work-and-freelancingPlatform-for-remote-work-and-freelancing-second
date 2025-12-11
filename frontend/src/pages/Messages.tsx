import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';



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
import { FaComments, FaPaperPlane, FaUsers, FaUserCircle } from 'react-icons/fa';
import { brandOrigin } from '../brand';
import '../styles/chat-hub.css';
import { toast } from '../utils/toast';
import '../styles/photoGallery.css';

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
  countryCode?: string | null;
};

const toId = (v: unknown) => String(v ?? '');


interface RoleContextType {
  profile: { id: string; username?: string } | null;
  currentRole: 'jobseeker' | 'employer' | null;
  socket: any;
  socketStatus: string;
  setSocketStatus: (status: string) => void;
  getLastFromCache: (id: string) => { text: string; ts: number } | undefined;
  setLastInCache: (id: string, text: string, ts: number) => void;
}

// interface RoleContextType {
//   profile: { id: string; username?: string } | null;
//   currentRole: 'jobseeker' | 'employer' | null;
//   socket: any;
//   socketStatus: string;
//   setSocketStatus: (status: string) => void;
//   getLastFromCache: (id: string) => { text: string; ts: number } | undefined;
//   setLastInCache: (id: string, text: string, ts: number) => void;
// }

// ==== country helpers (module-level) ====
const pickCountryCode = (v: unknown): string | null => {
  const s = String(v ?? '').trim();
  return /^[A-Za-z]{2,3}$/.test(s) ? s.toUpperCase() : null;
};

const getCountryCodeFrom = (a: any): string | null => {
  if (!a) return null;
  const candidates = [
    a.country, a.country_code, a.countryCode,
    a.applicant_country, a.applicant_country_code, a.applicantCountryCode,
    a.profile?.country, a.profile?.country_code, a.profile?.countryCode,
    a.profile?.location?.country, a.profile?.location?.country_code, a.profile?.location?.countryCode,
  ];
  for (const v of candidates) {
    const cc = pickCountryCode(v);
    if (cc) return cc;
  }
  return null;
};

const regionName = (() => {
  try {
    const DN = (Intl as any).DisplayNames;
    const f = new DN([(typeof navigator !== 'undefined' ? navigator.language : 'en')], { type: 'region' });
    return (code?: string) => {
      const c = String(code || '').trim().toUpperCase();
      return c ? (f?.of?.(c) || c) : '';
    };
  } catch {
    return (code?: string) => String(code || '').toUpperCase();
  }
})();

const makeAbs = (url: string) =>
  url?.startsWith('http') ? url : `${brandOrigin()}/backend${url}`;


const calcAge = (dob?: string | null): number | null => {
  if (!dob) return null;
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const birth = new Date(year, month, day);
  if (Number.isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const mdiff = today.getMonth() - birth.getMonth();
  if (mdiff < 0 || (mdiff === 0 && today.getDate() < birth.getDate())) age--;

  if (age < 0 || age > 150) return null;
  return age;
};



const Messages: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
 const preselectJobPostId = location?.state?.jobPostId != null ? toId(location.state.jobPostId) : null;
const preselectApplicationId = location?.state?.applicationId != null ? toId(location.state.applicationId) : null;
const chatListRef = useRef<HTMLUListElement>(null);

const {
  profile,
  currentRole,
  socket,
  socketStatus,
  setSocketStatus,
  getLastFromCache,
  setLastInCache,
} = useRole() as RoleContextType;

const roleForChatApi: 'jobseeker' | 'employer' | 'admin' | 'moderator' = (() => {
  const pr = (profile as any)?.role as string | undefined;
  // если профайл говорит, что мы admin/moderator — используем это
  if (pr === 'admin' || pr === 'moderator') return pr;
  // иначе берём текущую "пользовательскую" роль
  if (currentRole === 'jobseeker' || currentRole === 'employer') return currentRole;
  // дефолт — пусть будет jobseeker (безопасный fallback)
  return 'jobseeker';
})();


// const {
//     profile: ctxProfile,
//     currentRole: ctxRole,
//     socket,
//     socketStatus,
//     setSocketStatus,
//     getLastFromCache,
//     setLastInCache,
//   } = useRole() as RoleContextType;

  
//   const isDevMessages =
//     typeof window !== 'undefined' &&
//     window.location?.pathname?.startsWith?.('/dev-messages');

  
//   const [devRole] = useState<'jobseeker' | 'employer'>(() => {
//     if (!isDevMessages) return 'jobseeker';
//     try {
//       const search = new URLSearchParams(window.location.search);
//       const r = search.get('role');
//       return r === 'employer' ? 'employer' : 'jobseeker';
//     } catch {
//       return 'jobseeker';
//     }
//   });

  
//   const profile = isDevMessages
//     ? {
//         id: devRole === 'employer' ? 'emp-dev' : 'js-dev',
//         username: devRole === 'employer' ? 'Dev Employer' : 'Dev Jobseeker',
//       }
//     : ctxProfile;

//   const currentRole = isDevMessages ? devRole : ctxRole;

//   const roleForChatApi: 'jobseeker' | 'employer' | 'admin' | 'moderator' = (() => {
//     const pr = (profile as any)?.role as string | undefined;
//     if (pr === 'admin' || pr === 'moderator') return pr;
//     if (currentRole === 'jobseeker' || currentRole === 'employer') return currentRole;
//     return 'jobseeker';
//   })();






  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobPostApplications, setJobPostApplications] = useState<{
    [jobPostId: string]: JobApplicationDetails[];
  }>({});

const [activeJobId, setActiveJobId] = useState<string | null>(
  preselectJobPostId || (localStorage.getItem('lastActiveJobId') ? toId(localStorage.getItem('lastActiveJobId')) : null)
);
const [selectedChat, setSelectedChat] = useState<string | null>(
  preselectApplicationId || (localStorage.getItem('lastSelectedChat') ? toId(localStorage.getItem('lastSelectedChat')) : null)
);
 const [messages, setMessages] = useState<{
    [jobApplicationId: string]: Message[];
  }>({});







  // const [devLoaded, setDevLoaded] = useState(false);







// ==== BEGIN: helper & comparator ====
const getLastActivity = useCallback((id: string, appliedAt?: string | null) => {
  const list = messages[id];
  if (list?.length) {
    const lastMsg = list[list.length - 1];
    return new Date(lastMsg.created_at).getTime();
  }
  
  const cached = getLastFromCache?.(id);
  if (cached) return cached.ts;
  
  return appliedAt ? new Date(appliedAt as any).getTime() : 0;
}, [messages, getLastFromCache]);

const getLastPreview = useCallback((id: string) => {
  const list = messages[id];
  if (list?.length) {
    return list[list.length - 1].content;
  }
  const cached = getLastFromCache?.(id);
  return cached?.text || '';
}, [messages, getLastFromCache]);

const byLastActivityDesc = useCallback((a: any, b: any) => {
  if ((b.lastActivity ?? 0) !== (a.lastActivity ?? 0)) {
    return (b.lastActivity ?? 0) - (a.lastActivity ?? 0);
  }
  const a2 = a.appliedAt ? new Date(a.appliedAt as any).getTime() : 0;
  const b2 = b.appliedAt ? new Date(b.appliedAt as any).getTime() : 0;
  if (b2 !== a2) return b2 - a2;
  return String(a.id || '').localeCompare(String(b.id || ''));
}, []);




const preloadLast = async (ids: string[]) => {
  const tasks = ids.map(id =>
    getChatHistory(id, { page: 1, limit: 50 }, roleForChatApi)
      .then(res => ({ id, arr: res?.data || [] }))
      .catch((e: any) => {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          // Можно добавить redirect или обработку авторизации
          return { id, arr: [] };
        }
        console.error(`Failed to load chat history for ${id}:`, e);
        return { id, arr: [] };
      })
  );
  
  const results = await Promise.all(tasks);
  results.forEach(({ id, arr }) => {
    if (arr.length) {
      // Сортируем сообщения по времени (старые -> новые)
      const sorted = [...arr].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      setMessages(prev => ({ ...prev, [id]: sorted }));
      
      // Обновляем кэш последним сообщением
      const lastMsg = sorted[sorted.length - 1];
      setLastInCache?.(id, lastMsg.content, +new Date(lastMsg.created_at));
    }
  });
};



// В начале компонента Messages, добавьте:
useEffect(() => {
  // Запрашиваем разрешение на уведомления
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);


useEffect(() => { if (activeJobId) localStorage.setItem('lastActiveJobId', toId(activeJobId)); }, [activeJobId]);
useEffect(() => { if (selectedChat) localStorage.setItem('lastSelectedChat', toId(selectedChat)); }, [selectedChat]);



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
  const listAnchorRef = useRef<{ id: string; offset: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedSet = useRef<Set<string>>(new Set());
  const joinQueue = useRef<string[]>([]);
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  // const devSeededRef = useRef(false);
// Вместо any лучше использовать конкретные типы
const ts = (d?: string | Date) => (d ? new Date(d).getTime() : 0);

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
  return apps.reduce((sum, a) => sum + (unreadCounts[toId(a.applicationId)] || 0), 0);
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

useLayoutEffect(() => {
  const el = chatListRef.current;
  if (!el) return;

  // 1) восстановить позицию, если до этого сохраняли якорь
  const prev = listAnchorRef.current;
  if (prev) {
    const node = el.querySelector<HTMLElement>(`li[data-chat-id="${prev.id}"]`);
    if (node) {
      el.scrollTop = node.offsetTop - prev.offset;
    }
    listAnchorRef.current = null;
  }

  // 2) перед СЛЕДУЮЩЕЙ перерисовкой запомнить текущий «первый видимый» элемент
  return () => {
    const list = chatListRef.current;
    if (!list) return;

    const { scrollTop } = list;
    const items = Array.from(list.querySelectorAll<HTMLElement>('li.ch-chatlist__item'));
    // первый частично/полностью видимый элемент
    const firstVisible = items.find(li => li.offsetTop + li.offsetHeight > scrollTop + 1);
    if (!firstVisible) return;

    const id = firstVisible.dataset.chatId || '';
    listAnchorRef.current = { id, offset: firstVisible.offsetTop - scrollTop };
  };
});
  // helpers


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

 
useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
     
      setMessages({});
      setUnreadCounts({});

      if (currentRole === 'jobseeker') {
        const all = await getMyApplications();
        const filtered = all.filter(a => ['Pending','Accepted'].includes(a.status as any));
        setApplications(filtered);

        joinAllMyChats(filtered.map(a => toId(a.id)));
await preloadLast(filtered.map(a => toId(a.id)));
        
       
   if (preselectApplicationId && filtered.some(a => toId(a.id) === preselectApplicationId)) {
  setSelectedChat(preselectApplicationId);
} else {
  const ls = localStorage.getItem('lastSelectedChat');
  if (ls && filtered.some(a => toId(a.id) === toId(ls))) {
    setSelectedChat(toId(ls));
  } else {
            const latestId = pickLatestJobseekerApplicationId(filtered);
            if (latestId) setSelectedChat(latestId);
          }
        }
      } else if (currentRole === 'employer') {
        const posts = await getMyJobPosts();
        const active = posts.filter(isActiveJob);
        setJobPosts(active);
const arrays = await Promise.all(
  active.map(p => getApplicationsForJobPost(p.id))
);
        const map: Record<string, JobApplicationDetails[]> = {};
        active.forEach((p, i) => { map[p.id] = arrays[i]; });
        setJobPostApplications(map);

        
const allowed = arrays
  .flat()
  .filter(a => a.status === 'Pending' || a.status === 'Accepted');

const allIds = allowed.map(a => toId(a.applicationId));
joinAllMyChats(allIds);
await preloadLast(allIds);


if (!activeJobId && active[0]) setActiveJobId(active[0].id);

if (!selectedChat) {
  
  const sorted = [...allowed].sort(
    (a, b) =>
      getLastActivity(b.applicationId, b.appliedAt) -
      getLastActivity(a.applicationId, a.appliedAt)
  );
  const first = preselectApplicationId ?? toId(sorted[0]?.applicationId);
if (first) setSelectedChat(toId(first));
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
  
}, [profile, currentRole]);

// useEffect(() => {
  
//   if (isDevMessages && devLoaded) {
//     return;
//   }

//   const fetchData = async () => {
//     try {
//       setIsLoading(true);

//       setMessages({});
//       setUnreadCounts({});

//       if (currentRole === 'jobseeker') {
//         const all = await getMyApplications();
//         const filtered = all.filter(a =>
//           ['Pending', 'Accepted'].includes(a.status as any)
//         );
//         setApplications(filtered);

//         const ids = filtered.map(a => toId(a.id));
//         joinAllMyChats(ids);
//         await preloadLast(ids);

//         if (
//           preselectApplicationId &&
//           filtered.some(a => toId(a.id) === preselectApplicationId)
//         ) {
//           setSelectedChat(preselectApplicationId);
//         } else {
//           const ls = localStorage.getItem('lastSelectedChat');
//           if (ls && filtered.some(a => toId(a.id) === toId(ls))) {
//             setSelectedChat(toId(ls));
//           } else {
//             const latestId = pickLatestJobseekerApplicationId(filtered);
//             if (latestId) setSelectedChat(latestId);
//           }
//         }
//       } else if (currentRole === 'employer') {
//         const posts = await getMyJobPosts();
//         const active = posts.filter(isActiveJob);
//         setJobPosts(active);

//         const arrays = await Promise.all(
//           active.map(p => getApplicationsForJobPost(p.id))
//         );
//         const map: Record<string, JobApplicationDetails[]> = {};
//         active.forEach((p, i) => {
//           map[p.id] = arrays[i];
//         });
//         setJobPostApplications(map);

//         const allowed = arrays
//           .flat()
//           .filter(a => a.status === 'Pending' || a.status === 'Accepted');

//         const allIds = allowed.map(a => toId(a.applicationId));
//         joinAllMyChats(allIds);
//         await preloadLast(allIds);

//         if (!activeJobId && active[0]) setActiveJobId(active[0].id);

//         if (!selectedChat) {
//           const sorted = [...allowed].sort(
//             (a, b) =>
//               getLastActivity(b.applicationId, b.appliedAt) -
//               getLastActivity(a.applicationId, a.appliedAt)
//           );
//           const first =
//             preselectApplicationId ?? toId(sorted[0]?.applicationId);
//           if (first) setSelectedChat(toId(first));
//         }
//       }
//     } catch (e) {
//       console.error('Error fetching applications:', e);
//       setError('Failed to load applications.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   if (profile && currentRole && ['jobseeker', 'employer'].includes(currentRole)) {
//     fetchData().then(() => {
//       if (isDevMessages) {
//         setDevLoaded(true); 
//       }
//     });
//   }


// }, [ctxProfile, ctxRole, isDevMessages, devLoaded]);









// при смене выбранной вакансии (только у работодателя) — открыть самый «свежий» чат
useEffect(() => {
  if (currentRole !== 'employer') return; // <-- ключевое ограничение по роли


  if (!activeJobId) {
    setSelectedChat(null);
    return;
  }

  const apps = jobPostApplications[activeJobId] || [];
  const allowed = apps.filter(a => a.status === 'Pending' || a.status === 'Accepted');

  if (allowed.length === 0) {
    setSelectedChat(null);
    return;
  }

  const sorted = [...allowed].sort(
    (a, b) =>
      getLastActivity(b.applicationId, b.appliedAt) -
      getLastActivity(a.applicationId, a.appliedAt)
  );
  const newestId = toId(sorted[0].applicationId);

  // не трогаем выбор пользователя, если он уже внутри текущей вакансии
  if (selectedChat == null) {
    setSelectedChat(newestId);
    void handleSelectChat(newestId);
  } else {
    const belongsToCurrentJob = allowed.some(a => toId(a.applicationId) === toId(selectedChat));
    if (!belongsToCurrentJob) {
      setSelectedChat(newestId);
      void handleSelectChat(newestId);
    }
  }
}, [currentRole, activeJobId, jobPostApplications, getLastActivity]); // <-- убрали selectedChat

const prevJobIdRef = useRef<string | null>(null);

useEffect(() => {
  if (currentRole !== 'employer') return;

  
  if (activeJobId && prevJobIdRef.current !== activeJobId) {
    setMultiMode(false);
    clearSelection();
  }

  prevJobIdRef.current = activeJobId ?? null;
}, [currentRole, activeJobId]);


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
    const jobApplicationId = toId(history[0].job_application_id);
    const sorted = [...history].sort((a,b)=>+new Date(a.created_at)-+new Date(b.created_at));

    setMessages((prev) => ({ ...prev, [jobApplicationId]: sorted }));

  if (sorted.length) {
  const last = sorted[sorted.length - 1];
  setLastInCache?.(jobApplicationId, last.content, +new Date(last.created_at));
}

    const unread = sorted.filter(
      (msg) => msg.recipient_id === profile.id && !msg.is_read
    ).length;
    setUnreadCounts((prevCounts) => ({
      ...prevCounts,
      [jobApplicationId]: selectedChat === jobApplicationId ? 0 : unread,
    }));
  }
});


socket.on('newMessage', (message: Message) => {
  const mid = toId(message.job_application_id);
  setMessages((prev) => {
  const currentMessages = prev[mid] || [];
  const updated = [...currentMessages, message];
  return { ...prev, [mid]: updated };
});

  // Обновляем кэш последнего сообщения
setLastInCache?.(mid, message.content, new Date(message.created_at).getTime());

 const inOpenedChat = selectedChat === mid;

  if (inOpenedChat) {
    // Если чат открыт - отмечаем как прочитанное
   socket.emit('markMessagesAsRead', { jobApplicationId: mid });
    scrollToBottom(true);
  } else if (message.recipient_id === profile.id && !message.is_read) {
    // Если не открыт - увеличиваем счетчик непрочитанных
setUnreadCounts((prev) => ({
  ...prev,
  [mid]: (prev[mid] || 0) + 1,
}));
    
    // Показываем уведомление (браузерное)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New message', {
        body: `${message.content.substring(0, 50)}...`,
        icon: '/favicon.ico'
      });
    }
  }
});

    socket.on(
      'typing',
      (data: { userId: string; jobApplicationId: string; isTyping: boolean }) => {
        if (data.userId !== profile.id) {
      const tid = toId(data.jobApplicationId);
setIsTyping((prev) => ({
  ...prev,
  [tid]: data.isTyping,
}));
        }
      }
    );

    type MessagesReadPayload = { data: Message[] } | Message[];
    socket.on('messagesRead', (payload: MessagesReadPayload) => {
      const list: Message[] = Array.isArray(payload) ? payload : payload?.data || [];
      if (!list.length) return;

      const jobId = toId(list[0].job_application_id);


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
  const jid = toId(data.jobApplicationId);
  if (socket.connected) {
    socket.emit('joinChat', { jobApplicationId: jid });
  } else {
    joinQueue.current.push(jid);
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

const content = newMessage.trim();
socket.emit('sendMessage', { jobApplicationId: selectedChat, content });
setLastInCache?.(selectedChat, content, Date.now());

    setNewMessage('');
  };

// Выносим тяжелые вычисления в отдельные мемоизированные значения
const activeJobApps = useMemo(() => 
  activeJobId ? (jobPostApplications[activeJobId] || []) : []
, [activeJobId, jobPostApplications]);

const jobPostsMap = useMemo(() => 
  new Map(jobPosts.map(p => [p.id, p]))
, [jobPosts]);

const applicationsMap = useMemo(() =>
  new Map(applications.map(app => [toId(app.id), app]))
, [applications]);


const chatList = useMemo<ChatListItem[]>(() => {
  if (currentRole === 'employer') {
    // 1) Берём все Pending/Accepted заявки по всем активным job-постам
    const allAllowed = Object.values(jobPostApplications)
      .flat()
      .filter(app => app.status === 'Pending' || app.status === 'Accepted');

    // 2) Если выбран конкретный job (activeJobId есть) —
    //    показываем чаты только по нему.
    //    Если job не выбран (activeJobId === null) — показываем все.
    const source = activeJobId
      ? activeJobApps.filter(
          app => app.status === 'Pending' || app.status === 'Accepted'
        )
      : allAllowed;

    return source
      .map((app): ChatListItem => {
        const jobPost = jobPostsMap.get(app.job_post_id);
        const id = toId(app.applicationId);

        const cc = getCountryCodeFrom(app as any);

        return {
          id,
          title: jobPost?.title || 'Unknown Job',
          partner: app.username,
          status: app.status,
          unreadCount: unreadCounts[id] ?? 0,
          coverLetter: app.coverLetter ?? null,
          userId: app.userId,
          job_post_id: app.job_post_id,
          appliedAt: app.appliedAt,
          lastMessage: getLastPreview(id),
          lastActivity: getLastActivity(id, app.appliedAt),
          countryCode: cc,
        };
      })
      // сортировка по последней активности (новые сообщения и так будут сверху)
      .sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0));
  }

  // Jobseeker — оставляем как было
  // ...


  // Jobseeker
  let source = applications;
if (selectedChat && !applicationsMap.has(selectedChat)) {
  source = applications.filter(a => toId(a.id) === selectedChat);
}


  return source
    .map((app): ChatListItem => {
      const jobPost = app.job_post;
const id = toId(app.id);
      
return {
  id,
  title: jobPost?.title || 'Unknown Job',
  partner: jobPost?.employer?.username || 'Unknown',
  unreadCount: unreadCounts[id] ?? 0,
  status: app.status,
  appliedAt: (app as any).created_at,
  lastMessage: getLastPreview(id),
  lastActivity: getLastActivity(id, (app as any).created_at),
};
    })
    .sort(byLastActivityDesc);
}, [
  currentRole,
  activeJobApps,
  jobPostsMap,
  applicationsMap,
  unreadCounts,
  selectedChat,
  applications, // ✅ Добавлено
  getLastPreview, // ✅ Добавлено
  getLastActivity, // ✅ Добавлено
  byLastActivityDesc, // ✅ Добавлено
]);


const allSelected = useMemo(
  () =>
    currentRole === 'employer' &&
    multiMode &&
    chatList.length > 0 &&
    chatList.every((c) => selectedIds.has(toId(c.id))),
  [currentRole, multiMode, chatList, selectedIds]
);

  // все чаты — для верхнего пикера
  const allChats = useMemo(() => {
    if (currentRole === 'employer') {
      return Object.values(jobPostApplications)
        .flat()
        .map((app) => ({
          id: toId(app.applicationId), 
          label: `${
            jobPosts.find((p) => p.id === app.job_post_id)?.title || 'Job'
          } — ${app.username}`,
          job_post_id: app.job_post_id,
        }))
      .sort((a, b) => getLastActivity(b.id) - getLastActivity(a.id));

    }
    // jobseeker
   return applications
  .map((app) => ({
    id: toId(app.id), 
    label: `${app.job_post?.title || 'Job'} — ${app.job_post?.employer?.username || 'Employer'}`,
    appliedAt: (app as any).created_at,
  }))
  .sort((a, b) => getLastActivity(b.id, b.appliedAt) - getLastActivity(a.id, a.appliedAt));

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
  return pool.find((x) => toId(x.id) === toId(selectedChat))?.label || 'Chats…';
}, [currentRole, jobPosts, activeJobId, applications, selectedChat]);

const handleSelectChat = async (rawId: string) => {
  const jobApplicationId = toId(rawId); // 👈

  const exists = [...chatList, ...allChats].some((c: any) => toId(c.id) === jobApplicationId);
  if (!exists) {
    // не блокируем открытие, просто логируем
    console.warn('Chat id not found in lists yet, opening anyway:', jobApplicationId);
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

  const fetchHistory = async () => {
  const history = await getChatHistory(jobApplicationId, { page: 1, limit: 100 }, roleForChatApi);
  const sorted = [...history.data].sort((a,b)=>+new Date(a.created_at)-+new Date(b.created_at));
  setMessages(prev => ({ ...prev, [jobApplicationId]: sorted }));
    setUnreadCounts(prev => ({ ...prev, [jobApplicationId]: 0 }));
    if (sorted.length) {
      const last = sorted[sorted.length - 1];
      setLastInCache?.(jobApplicationId, last.content, +new Date(last.created_at));
    }
  };

  try {
    await fetchHistory();
  } catch (err: any) {
    const msg: string = err?.response?.data?.message || err?.message || '';
    if (/not initialized/i.test(msg) || /инициал/i.test(msg)) {
      setError('Initializing chat…');
      socket?.emit('initChat', { jobApplicationId });

      // одноразовый слушатель, без "return" из функции
      socket?.once('chatInitialized', (d: { jobApplicationId: string }) => {
        if (toId(d.jobApplicationId) === jobApplicationId) {
          socket?.emit('joinChat', { jobApplicationId });
          fetchHistory().finally(() => setError(null));
        }
      });
    } else {
      setError('Failed to load chat history.');
    }
  }
};

// Автовыбор самого свежего чата при заходе на страницу,
// если никакой чат ещё не выбран
useEffect(() => {
  // Если чатов нет — делаем ничего
  if (!allChats.length) return;

  // Если уже есть выбранный чат (из localStorage или перехода со страницы вакансии) — уважаем его
  if (selectedChat) return;

  // allChats уже отсортированы по дате последней активности (новые сверху)
  const first = allChats[0];

  // Открываем самый свежий диалог
  handleSelectChat(first.id);
}, [allChats, selectedChat, handleSelectChat]);


  // текущая заявка (для действий работодателя)
  const currentApp = useMemo(() => {
    if (!selectedChat) return null;
    return (
      Object.values(jobPostApplications)
        .flat()
        .find((a) => toId(a.applicationId) === selectedChat) || null

    );
  }, [jobPostApplications, selectedChat]);

const currentCountryName = useMemo(() => {
  if (currentRole === 'employer' && currentApp) {
    const a: any = currentApp;
    if (a.country_name) return String(a.country_name);
    const code = getCountryCodeFrom(a);
    return code ? regionName(code) : '';
  }
  return '';
}, [currentRole, currentApp]);

const currentAvatar = useMemo(() => {
  if (currentRole !== 'employer' || !currentApp) return null;
  const a: any = currentApp;
  // пробуем вытащить аватар из профиля / самой заявки
 return a.applicant_avatar || a.profile?.avatar || a.avatar || null;
}, [currentRole, currentApp]);

const currentAge = useMemo(() => {
  if (currentRole !== 'employer' || !currentApp) return null;
  const a: any = currentApp;
  // бек даёт applicant_date_of_birth, но на всякий случай fallback на date_of_birth
  const dob: string | null =
    a.applicant_date_of_birth ?? a.date_of_birth ?? null;
  return calcAge(dob);
}, [currentRole, currentApp]);

const isImageUrl = (u?: string) => !!u && /\.(jpe?g|png|webp)$/i.test(u);
const makeAbs = (u: string) =>
  u.startsWith('http') ? u : `${brandOrigin()}/backend${u}`;


const currentGallery = useMemo(() => {
  if (currentRole !== 'employer' || !currentApp) return [];
  const a: any = currentApp;

  const urls: string[] = [];
  if (currentAvatar) urls.push(currentAvatar);

  // ⬇️ подставь сюда реальные поля с фотками, если у тебя другие названия
const extra =
  a.portfolio_files ||
  a.photos ||
  a.gallery ||
  a.profile?.portfolio_files;


  if (Array.isArray(extra)) {
    for (const v of extra) {
      if (typeof v === 'string' && v.trim() && v !== currentAvatar) {
        urls.push(v);
      }
    }
  }

  return urls;
}, [currentRole, currentApp, currentAvatar]);

const [photoIndex, setPhotoIndex] = useState<number | null>(null);

const openPhotoModal = (idx: number) => {
  if (!currentGallery.length) return;
  setPhotoIndex(idx);
};

const closePhotoModal = () => setPhotoIndex(null);

const stepPhoto = useCallback(
  (dir: 1 | -1) => {
    setPhotoIndex((idx) => {
      if (idx == null || !currentGallery.length) return idx;
      const len = currentGallery.length;
      return (idx + dir + len) % len;
    });
  },
  [currentGallery.length]
);

// поддержка Esc / стрелок при открытой галерее
useEffect(() => {
  if (photoIndex == null) return;

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePhotoModal();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepPhoto(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepPhoto(1);
    }
  };

  document.addEventListener('keydown', onKey);
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  return () => {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = prevOverflow;
  };
}, [photoIndex, stepPhoto]);

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
        unreadCount: unreadCounts[toId(a.applicationId)] || 0,

      }))
      .sort((a, b) => getLastActivity(toId(b.id)) - getLastActivity(toId(a.id)));


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


// В компоненте Messages добавьте:
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && selectedChat) {
      // Когда пользователь возвращается на вкладку, обновляем чаты
      socket?.emit('markMessagesAsRead', { jobApplicationId: selectedChat });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [selectedChat, socket]);
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
       
      
      </div>
    );
  }

  return (
    <div>
     
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
                     copy[jobId] = (copy[jobId] || []).filter(a => !ids.includes(toId(a.applicationId)));

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
  <div
    className="ch-sidebar__head"
    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: '10px' }}
  >
    <h3 className="ch-sidebar__title">Chats</h3>

    {currentRole === 'employer' && multiMode && chatList.length > 0 && (
      <button
        type="button"
        className="ch-btn ch-btn--sm"
        onClick={() => {
          if (allSelected) {
            // снять выделение со всех чатов текущей вакансии
            setSelectedIds((prev) => {
              const next = new Set(prev);
              chatList.forEach((c) => next.delete(toId(c.id)));
              return next;
            });
          } else {
            // выделить все чаты текущей вакансии
            setSelectedIds((prev) => {
              const next = new Set(prev);
              chatList.forEach((c) => next.add(toId(c.id)));
              return next;
            });
          }
        }}
      >
        {allSelected ? 'Unselect all' : 'Select all'}
      </button>
    )}
  </div>
              {chatList.length > 0 ? (
                <ul className="ch-chatlist" ref={chatListRef}>
                  {chatList.map((chat) => (
<li
data-chat-id={chat.id}
  key={chat.id}
  className={`ch-chatlist__item ${selectedChat === chat.id ? 'is-active' : ''}
    ${chat.unreadCount > 0 ? 'has-unread' : ''}
    ${chat.status === 'Accepted' ? 'is-accepted' : ''}`}
  onClick={() => handleSelectChat(toId(chat.id))}
  title={chat.partner}
>
  {/* ЧЕКБОКС ВЫБОРА — НЕ МЕШАЕТ ОТКРЫТИЮ ЧАТА */}
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
{currentRole === 'employer' && multiMode && (
<input
  type="checkbox"
  checked={selectedIds.has(toId(chat.id))}
  onChange={(e) => { e.stopPropagation(); toggleSelect(toId(chat.id)); }}
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
    {/* NEW: страна соискателя (ISO) */}
    {!!chat.countryCode && (
      <span className="ch-chip ch-chip--cc" title="Applicant country">
        {chat.countryCode}
      </span>
    )}

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
                <p className="ch-muted">No chats yet.</p>
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
      <div
        className="ch-chat__title-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div
          className="ch-chat__title-left"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
{currentRole === 'employer' && (
  <button
    type="button"
    className="ch-chat__avatar-wrap"
    onClick={() => currentGallery.length && openPhotoModal(0)}
    title={
      currentGallery.length > 1 ? 'Open applicant photos' : 'Open avatar'
    }
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {currentAvatar ? (
      <img
        src={makeAbs(currentAvatar)}
        alt="Avatar"
        className="ch-chat__avatar"
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          objectFit: 'cover',
        }}
      />
    ) : (
      <FaUserCircle
        className="ch-chat__avatar-fallback"
        size={60}
        style={{ opacity: 0.7 }}
      />
    )}
  </button>
)}


          <h3
            className="ch-chat__title"
            style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}
          >
            {currentRole === 'employer' && currentCountryName && (
              <span className="ch-country-inline">
                {currentCountryName}
                {currentAge != null && ` • ${currentAge} y.o.`}
              </span>
            )}

            {currentRole !== 'employer' && (
              <>
                Chat with{' '}
                <span>
                  {applications.find((a) => a.id === selectedChat)?.job_post?.employer?.username ||
                    'Unknown'}
                </span>
              </>
            )}
 {currentRole === 'employer' && currentApp && (
          <button
            type="button"
            className="ch-btn ch-review-btn"
            // style={{ marginLeft: 10 }}
            onClick={() => {
              navigate(`/public-profile/${currentApp.userId}`);
              closeAllMenus();
            }}
          >
            Review profile
          </button>
        )}
            
          </h3>
          
        </div>

       
      </div>

    


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

{photoIndex != null && currentGallery.length > 0 && (
  <div className="ch-photo-modal" onClick={closePhotoModal}>
    <div
      className="ch-photo-modal__inner"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="ch-photo-modal__close"
        onClick={closePhotoModal}
        aria-label="Close"
      >
        ×
      </button>

      {currentGallery.length > 1 && (
        <>
          <button
            type="button"
            className="ch-photo-modal__nav ch-photo-modal__nav--prev"
            onClick={(e) => {
              e.stopPropagation();
              stepPhoto(-1);
            }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            type="button"
            className="ch-photo-modal__nav ch-photo-modal__nav--next"
            onClick={(e) => {
              e.stopPropagation();
              stepPhoto(1);
            }}
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}

      <div className="ch-photo-modal__image-wrap">
        <img
          src={makeAbs(currentGallery[photoIndex])}
          alt={`Photo ${photoIndex + 1} of ${currentGallery.length}`}
          className="ch-photo-modal__img"
        />
      </div>

      {currentGallery.length > 1 && (
        <div className="ch-photo-modal__thumbs">
          {currentGallery.map((url, idx) => (
            <button
              key={idx}
              type="button"
              className={
                'ch-photo-modal__thumb' +
                (idx === photoIndex ? ' is-active' : '')
              }
              onClick={() => setPhotoIndex(idx)}
            >
              <img src={makeAbs(url)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
)}


  
    
    </div>
  );
};

export default Messages;
