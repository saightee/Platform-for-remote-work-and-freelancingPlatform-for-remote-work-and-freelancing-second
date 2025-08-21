// src/context/RoleContext.tsx
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
    const as = getAsParam();
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
            window.dispatchEvent(new Event('jobforge:unreads-updated'));
          }
        });

        newSocket.on('connect', () => setSocketStatus('connected'));
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
        // no-op
      }
    };

    void init();
  }, [profile]);

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
