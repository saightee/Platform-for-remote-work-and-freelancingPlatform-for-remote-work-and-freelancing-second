import { createContext, useContext, useState, useEffect } from 'react';
import { getProfile, initializeWebSocket, getMyApplications, getMyJobPosts, getApplicationsForJobPost } from '../services/api';
import { Profile } from '@types';
import { Socket } from 'socket.io-client';
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
}

interface DecodedToken {
  email: string;
  sub: string;
  role: 'employer' | 'jobseeker' | 'admin' | 'moderator';
  iat: number;
  exp: number;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<'employer' | 'jobseeker' | 'admin' | 'moderator' | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  const fetchProfile = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found, clearing profile.');
    setIsLoading(false);
    setProfile(null);
    setCurrentRole(null);
    setSocket(null);
    setSocketStatus('disconnected');
    return;
  }

  try {
    const decoded: DecodedToken = jwtDecode(token);
    console.log('Decoded token:', decoded);
    setCurrentRole(decoded.role);
    if (['admin', 'moderator'].includes(decoded.role)) {
      console.log(`${decoded.role} role detected, skipping profile fetch.`);
      setProfile(null);
      setIsLoading(false);
      setSocket(null);
      setSocketStatus('disconnected');
      return;
    }
    setIsLoading(true);
    setError(null);
    const profileData = await getProfile();
    console.log('Profile fetched:', profileData);
    setProfile(profileData);
    setCurrentRole(profileData.role);
  } catch (error: any) {
    console.error('Error fetching profile in RoleContext:', error);
    if (error.response?.status === 401 || error.response?.status === 404) {
      console.error('Unauthorized or profile not found. Token:', token);
      setError('Unauthorized or profile not found. Please check your credentials.');
      setProfile(null);
      setCurrentRole(null);
    } else {
      console.error('Token decode or profile fetch error:', error.message);
      setError('Invalid token or failed to load profile. Please log in again.');
      setProfile(null);
      setCurrentRole(null);
      localStorage.removeItem('token');
    }
  } finally {
    setIsLoading(false);
  }
};

  const refreshProfile = async () => {
    await fetchProfile();
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

useEffect(() => {
  if (!profile || !['jobseeker', 'employer'].includes(profile.role) || socket) {
    return;
  }

  const initializeSocket = async () => {
    try {
      let hasApplications = false;
      if (profile.role === 'jobseeker') {
        const apps = await getMyApplications();
        hasApplications = apps.some(app => app.status === 'Accepted');
      } else if (profile.role === 'employer') {
        const posts = await getMyJobPosts();
        const appsPromises = posts.map(post => getApplicationsForJobPost(post.id));
        const appsArrays = await Promise.all(appsPromises);
        hasApplications = appsArrays.flat().some(app => app.status === 'Accepted');
      }

      if (!hasApplications) {
        console.log('No accepted applications, skipping WebSocket initialization.');
        return;
      }

      const newSocket = initializeWebSocket(
        () => {}, // Пустой обработчик
        (error: WebSocketError) => {
          console.error('WebSocket error in RoleContext:', error);
          setSocketStatus('disconnected');
          setError(error.message || 'WebSocket error occurred.');
        }
      );

      newSocket.on('connect', () => {
        console.log('WebSocket connected in RoleContext, transport:', newSocket.io.engine.transport.name);
        setSocketStatus('connected');
      });

      newSocket.on('connect_error', (err) => {
        console.error('WebSocket connection error in RoleContext:', err.message);
        setSocketStatus('reconnecting');
        setError('Failed to connect to real-time updates. Retrying...');
      });

      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected in RoleContext');
        setSocketStatus('disconnected');
      });

      setSocket(newSocket);

      return () => {
        newSocket.off('connect');
        newSocket.off('connect_error');
        newSocket.off('disconnect');
        newSocket.disconnect();
        setSocket(null);
        setSocketStatus('disconnected');
      };
    } catch (err) {
      console.error('Error checking applications for WebSocket:', err);
    }
  };

  initializeSocket();
}, [profile]);

  return (
    <RoleContext.Provider value={{ currentRole, profile, isLoading, error, refreshProfile, socket, socketStatus }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};