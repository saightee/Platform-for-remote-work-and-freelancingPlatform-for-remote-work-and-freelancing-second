// src/context/RoleContext.tsx
import { createContext, useContext, useState, useEffect, useRef} from 'react';
import {
  getProfile,
  initializeWebSocket,
  getMyApplications,
  getMyJobPosts,
  getApplicationsForJobPost,
} from '../services/api';
import { Profile } from '@types';
import type { Socket } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import { brand, brandEvent } from '../brand';
import { getChatHistory } from '../services/api';


interface Message {
  id: string;
  job_application_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface WebSocketError {
  statusCode: number;
  message: string;
}

interface RoleContextType {
  currentRole: 'employer' | 'jobseeker' | 'admin' | 'moderator' | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  socket: Socket | null;
  socketStatus: 'connected' | 'disconnected' | 'reconnecting';
  setSocketStatus: (s: 'connected' | 'disconnected' | 'reconnecting') => void;
  setLastInCache: (id: string, text: string, ts: number) => void;
  getLastFromCache: (id: string) => { text: string; ts: number } | undefined;
}

interface DecodedToken {
  email: string;
  sub: string;
  role: 'employer' | 'jobseeker' | 'admin' | 'moderator';
  iat: number;
  exp: number;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// helpers (без хуков — можно держать вне компонента)
const isDev = typeof import.meta !== 'undefined' ? import.meta.env.DEV : false;

const getAsParam = () => {
  try {
    return new URLSearchParams(window.location.search).get('as') as
      | 'jobseeker'
      | 'employer'
      | null;
  } catch {
    return null;
  }
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<'employer' | 'jobseeker' | 'admin' | 'moderator' | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
   const notifAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayRef = useRef(0);
  const activeChatRef = useRef<string | null>(null);
  const lastMsgCacheRef = useRef<Map<string, { text: string; ts: number }>>(new Map());




// один раз гидрируем из localStorage (если провайдер вдруг размонтируется между страницами)
useEffect(() => {
  try {
    const raw = localStorage.getItem('jf_lastmsg_cache');
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, { text: string; ts: number }>;
      lastMsgCacheRef.current = new Map(Object.entries(obj));
    }
  } catch {}
}, []);

const persistCache = () => {
  try {
    const obj = Object.fromEntries(lastMsgCacheRef.current.entries());
    localStorage.setItem('jf_lastmsg_cache', JSON.stringify(obj));
  } catch {}
};

const setLastInCache = (id: string, text: string, ts: number) => {
  lastMsgCacheRef.current.set(id, { text, ts });
  persistCache(); // <-- сохраняем
};
const getLastFromCache = (id: string) => lastMsgCacheRef.current.get(id);

  // DEV-имперсонация: если dev + ?as=... и нет токена — подставляем фейкового пользователя
  // useEffect(() => {
  //   const as = getAsParam();
  //   const hasToken = !!localStorage.getItem('token');
  //   if (isDev && as && !hasToken) {
  //     const fake: Profile = {
  //       id: `dev-${as}`,
  //       email: `${as}@dev.local`,
  //       role: as,
  //       username: as === 'employer' ? 'Dev Employer' : 'Dev Jobseeker',
  //     } as any;

  //     setProfile(fake);
  //     setCurrentRole(as);
  //     setIsLoading(false);
  //     setSocket(null);
  //     setSocketStatus('disconnected');
  //   }
  // }, []);

  // мок сокет в dev без токена — чтобы UI не падал
  // const mockSocket = useMemo(() => {
  //   const as = getAsParam();
  //   const hasToken = !!localStorage.getItem('token');
  //   if (!(isDev && as && !hasToken)) return null;

  //   return {
  //     connected: false,
  //     on: () => {},
  //     off: () => {},
  //     emit: () => {},
  //     disconnect: () => {},
  //     io: { engine: { transport: { name: 'mock' } } },
  //   } as unknown as Socket;
  // }, []);

  const fetchProfile = async () => {
    // const as = getAsParam();
    const token = localStorage.getItem('token');

    // dev-имперсонация — сеть не трогаем
    // if (isDev && as && !token) {
    //   return;
    // }

    if (!token) {
      setIsLoading(false);
      setProfile(null);
      setCurrentRole(null);
      setSocket(null);
      setSocketStatus('disconnected');
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      setCurrentRole(decoded.role);

      if (decoded.role === 'admin' || decoded.role === 'moderator') {
        setProfile(null);
        setIsLoading(false);
        setSocket(null);
        setSocketStatus('disconnected');
        return;
      }

      setIsLoading(true);
      setError(null);

      const profileData = await getProfile();
      setProfile(profileData);
      setCurrentRole((profileData as any)?.role || decoded.role);
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 404) {
        try {
          const decoded = jwtDecode<DecodedToken>(token);
          setCurrentRole(decoded.role);
          setError('Profile not found. Please complete your registration.');
          setProfile(null);
        } catch {
          setError('Invalid token.');
          setProfile(null);
          setCurrentRole(null);
          localStorage.removeItem('token');
        }
      } else {
        setError('Invalid token or failed to load profile. Please log in again.');
        setProfile(null);
        setCurrentRole(null);
        localStorage.removeItem('token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setSocketStatus('disconnected');
      }
    };
  }, []);

  // инициализация realtime; учитываем Pending и Accepted
  useEffect(() => {
    const as = getAsParam();
    const token = localStorage.getItem('token');
    const impersonated = isDev && as && !token;
    if (impersonated) return;

    if (!profile || !['jobseeker', 'employer'].includes(profile.role as any) || socket) {
      return;
    }

    const init = async () => {
      try {
        let hasApplications = false;

        if (profile.role === 'jobseeker') {
          const apps = await getMyApplications();
          hasApplications = apps.some(a => a.status === 'Pending' || a.status === 'Accepted'); // ✅
        } else if (profile.role === 'employer') {
          const posts = await getMyJobPosts();
          const arrays = await Promise.all(posts.map(p => getApplicationsForJobPost(p.id)));
          hasApplications = arrays.flat().some(a => a.status === 'Pending' || a.status === 'Accepted'); // ✅
        }

        if (!hasApplications) return;

//         const newSocket = initializeWebSocket(
//           () => {},
//           (error: WebSocketError) => {
//             setSocketStatus('disconnected');
//             setError(error.message || 'WebSocket error occurred.');
//           }
//         );

//         newSocket.on('newMessage', (m: Message) => {
//           if (profile && m.recipient_id === profile.id && !m.is_read) {
//             const key = `unreads_${profile.id}`;
//             let map: Record<string, number> = {};
//             try {
//               map = JSON.parse(localStorage.getItem(key) || '{}');
//             } catch {}
//             map[m.job_application_id] = (map[m.job_application_id] || 0) + 1;
//             localStorage.setItem(key, JSON.stringify(map));


// window.dispatchEvent(new Event('jobforge:unreads-updated'));

// window.dispatchEvent(new Event(brandEvent('unreads-updated')));
//           }
//           playNewMessageSound(m);
//         });

//         newSocket.on('connect', () => setSocketStatus('connected'));
//         newSocket.on('disconnect', () => setSocketStatus('disconnected'));
//         newSocket.on('connect_error', (err: any) => {
//           setSocketStatus('reconnecting');
//           setError('Failed to connect to real-time updates. Retrying...');
//           if (typeof err?.message === 'string' && err.message.includes('401')) {
//             localStorage.removeItem('token');
//             window.location.href = '/login';
//           }
//         });

//         setSocket(newSocket);

const newSocket = initializeWebSocket(
  () => {},
  (error: WebSocketError) => {
    setSocketStatus('disconnected');
    setError(error.message || 'WebSocket error occurred.');
  }
);

newSocket.on('newMessage', (m: Message) => {
  if (profile && m.recipient_id === profile.id && !m.is_read) {
    const key = `unreads_${profile.id}`;
    let map: Record<string, number> = {};
    try {
      map = JSON.parse(localStorage.getItem(key) || '{}');
    } catch {}
    map[m.job_application_id] = (map[m.job_application_id] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(map));

    // legacy (на время миграции)
    window.dispatchEvent(new Event('jobforge:unreads-updated'));
    // брендовый (новый)
    window.dispatchEvent(new Event(brandEvent('unreads-updated')));
  }
  setLastInCache(m.job_application_id, m.content, new Date(m.created_at).getTime());
  playNewMessageSound(m);
});

newSocket.on('messagesRead', (payload: { data?: Message[] } | Message[]) => {
  const list: Message[] = Array.isArray(payload) ? payload : (payload?.data || []);
  if (!list.length || !profile?.id) return;

  const jobId = list[0].job_application_id;
  const key = `unreads_${profile.id}`;

  try {
    const map = JSON.parse(localStorage.getItem(key) || '{}');
    // все сообщения в событии уже с is_read = true; просто обнулим чат,
    // так как «прочитано» приходит пачкой по конкретному jobId
    map[jobId] = 0;
    localStorage.setItem(key, JSON.stringify(map));

    // legacy + бренд-ивент
    window.dispatchEvent(new Event('jobforge:unreads-updated'));
    window.dispatchEvent(new Event(brandEvent('unreads-updated')));
  } catch {}
});


newSocket.on('connect', () => {
  setSocketStatus('connected');

  // Fallback: на случай если сервер не поддерживает initAllChats —
  // сами подписываемся на все активные чаты пользователя.
  (async () => {
    try {
      if (profile?.role === 'jobseeker') {
        const apps = await getMyApplications();
        apps
          .filter(a => a.status === 'Pending' || a.status === 'Accepted')
          .forEach(a => newSocket.emit('joinChat', { jobApplicationId: a.id }));
      } else if (profile?.role === 'employer') {
        const posts = await getMyJobPosts();
        const arrays = await Promise.all(posts.map(p => getApplicationsForJobPost(p.id)));
        arrays.flat()
          .filter(a => a.status === 'Pending' || a.status === 'Accepted')
          .forEach(a => newSocket.emit('joinChat', { jobApplicationId: a.applicationId }));
      }
    } catch {
      // молча игнорим сбои сети; это лишь fallback
    }

    // Если сервер умеет массовую инициализацию — пусть тоже отработает.
    try {
      if (profile?.id) {
        newSocket.emit('initAllChats', { userId: profile.id });
      }
    } catch {}
  })();
});

(async () => {
  if (!profile?.id) return;
  const key = `unreads_${profile.id}`;
  const map: Record<string, number> = {};

  try {
    let ids: string[] = [];

    if (profile.role === 'jobseeker') {
      const apps = await getMyApplications();
      ids = apps
        .filter(a => a.status === 'Pending' || a.status === 'Accepted')
        .map(a => a.id);
    } else if (profile.role === 'employer') {
      const posts = await getMyJobPosts();
      const arrays = await Promise.all(posts.map(p => getApplicationsForJobPost(p.id)));
      ids = arrays.flat()
        .filter(a => a.status === 'Pending' || a.status === 'Accepted')
        .map(a => a.applicationId);
    }

    // аккуратно, без DDOS: последовательно
    for (const id of ids) {
      try {
        const hist = await getChatHistory(id, { page: 1, limit: 50 }, profile.role);
        const unread = hist.data.filter(m => m.recipient_id === profile.id && !m.is_read).length;
        if (unread > 0) map[id] = unread;
      } catch { /* молча */ }
    }

    localStorage.setItem(key, JSON.stringify(map));
    window.dispatchEvent(new Event('jobforge:unreads-updated'));
    window.dispatchEvent(new Event(brandEvent('unreads-updated')));
  } catch { /* ignore */ }
})();


newSocket.on('disconnect', () => setSocketStatus('disconnected'));
newSocket.on('connect_error', (err: any) => {
  setSocketStatus('reconnecting');
  setError('Failed to connect to real-time updates. Retrying...');
  if (typeof err?.message === 'string' && err.message.includes('401')) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
});

setSocket(newSocket);


      } catch {
      
      }
    };

    void init();
  }, [profile, socket]);

    // NEW: подготовка аудио и «разблокировка» автоплея
  useEffect(() => {
    // безопасно для Vite/webpack: формируем правильный URL ассета из src/
    const soundUrl = new URL('../assets/sounds/ring_message.mp3', import.meta.url).href;
    const a = new Audio(soundUrl);
    a.preload = 'auto';
    notifAudioRef.current = a;

    const unlock = () => {
      // будим аудио на iOS: один «нулевой» плей по юзер-gesture
      a.muted = true;
      a.play().catch(() => {}).finally(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
      });
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

useEffect(() => {
  const onSelected = (e: Event) => {
    const id = (e as CustomEvent<string | null>).detail ?? null;
    activeChatRef.current = id;
  };

  const legacy = 'jobforge:selected-chat-changed';
  const branded = brandEvent('selected-chat-changed');

  window.addEventListener(legacy as any, onSelected as any);
  window.addEventListener(branded as any, onSelected as any);

  return () => {
    window.removeEventListener(legacy as any, onSelected as any);
    window.removeEventListener(branded as any, onSelected as any);
  };
}, []);


    // NEW: воспроизведение с троттлингом и игнором своих сообщений
const playNewMessageSound = (msg: Message) => {
  const a = notifAudioRef.current;
  if (!a) return;

  // свои сообщения — молчим
  if (profile && msg.sender_id === profile.id) return;

  // НОВОЕ: если вкладка активна и открыт именно этот чат — не играем звук
  if (document.hasFocus() && activeChatRef.current === msg.job_application_id) return;

  // троттлинг
  const now = Date.now();
  if (now - lastPlayRef.current < 1000) return;
  lastPlayRef.current = now;

  try {
    a.currentTime = 0;
    void a.play();
  } catch {}
};

// useEffect(() => {
//   const onSel = (e: Event) => {
//     // CustomEvent<string|null>
//     const ce = e as CustomEvent<string | null>;
//     selectedChatIdRef.current = ce.detail ?? null;
//   };
//   window.addEventListener('jobforge:selected-chat-changed', onSel as EventListener);
//   return () => {
//     window.removeEventListener('jobforge:selected-chat-changed', onSel as EventListener);
//   };
// }, []);




  return (
    <RoleContext.Provider
      value={{
        currentRole,
        profile,
        isLoading,
        error,
        refreshProfile: fetchProfile,
        // socket: socket ?? mockSocket,
        socket: socket,
        socketStatus,
        setSocketStatus,
        setLastInCache,
getLastFromCache,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
};