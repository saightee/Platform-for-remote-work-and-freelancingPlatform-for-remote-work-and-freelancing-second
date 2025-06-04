import { createContext, useContext, useState, useEffect } from 'react';
import { getProfile } from '../services/api';
import { Profile } from '@types';
import { jwtDecode } from 'jwt-decode';

interface RoleContextType {
  currentRole: 'employer' | 'jobseeker' | 'admin' | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

interface DecodedToken {
  email: string;
  sub: string;
  role: 'employer' | 'jobseeker' | 'admin';
  iat: number;
  exp: number;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<'employer' | 'jobseeker' | 'admin' | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, clearing profile.');
      setIsLoading(false);
      setProfile(null);
      setCurrentRole(null);
      return;
    }

    try {
      if (typeof token === 'string' && token.split('.').length === 3) {
        const decoded: DecodedToken = jwtDecode(token);
        console.log('Decoded token:', decoded);
        setCurrentRole(decoded.role);
        if (decoded.role === 'admin') {
          console.log('Admin role detected, skipping profile fetch.');
          setProfile(null);
          setIsLoading(false);
          return;
        }
      } else {
        console.warn('Invalid token format:', token);
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
        const decoded: DecodedToken = jwtDecode(token);
        setCurrentRole(decoded.role);
      } else {
        setError('Failed to load profile.');
        setProfile(null);
        setCurrentRole(null);
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
  }, []);

  return (
    <RoleContext.Provider value={{ currentRole, profile, isLoading, error, refreshProfile }}>
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