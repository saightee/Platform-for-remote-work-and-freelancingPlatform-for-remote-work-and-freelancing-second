// src/context/RoleContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getProfile } from '../services/api';
import { Profile } from '@types';

interface RoleContextType {
  currentRole: 'employer' | 'jobseeker' | 'admin' | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>; // Новая функция для обновления профиля
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
      setIsLoading(true);
      setError(null);
      const profileData = await getProfile();
      console.log('Profile fetched:', profileData);
      setProfile(profileData);
      setCurrentRole(profileData.role);
    } catch (error: any) {
      console.error('Error fetching profile in RoleContext:', error);
      setError('Failed to load profile.');
      if (error.response?.status === 401) {
        console.log('Unauthorized, clearing token.');
        localStorage.removeItem('token');
        setProfile(null);
        setCurrentRole(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для обновления профиля
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