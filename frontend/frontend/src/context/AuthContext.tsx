import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface User {
  id: string;
  email: string;
  role: string | null;
  isEmailVerified: boolean;
  username?: string;
  name?: string;
  skills?: string;
  experience?: string;
  companyName?: string;
  website?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  role: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (role?: string) => Promise<void>;
  register: (email: string, password: string, role: string, username: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string) => Promise<any>;
  selectRole: (role: string, tempToken: string, additionalData?: Record<string, any>) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    timeout: 10000, // Добавляем таймаут для предотвращения зависаний
  });

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setIsAuthenticated(true);
      setIsEmailVerified(user.isEmailVerified || true);
      setRole(user.role || null);
      console.log('[AuthContext] Login successful at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), 'User:', user);
    } catch (error: any) {
      console.error('[AuthContext] Login error at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Login error');
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (role?: string) => {
    try {
      setIsLoading(true);
      console.log('[AuthContext] Redirecting to Google with role:', role || 'none', 'at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));
      const roleQuery = role ? `&role=${encodeURIComponent(role)}` : '';
      window.location.href = `${API_BASE_URL}/api/auth/google?callbackUrl=${encodeURIComponent(window.location.origin + '/auth/callback')}${roleQuery}`;
    } catch (error: any) {
      console.error('[AuthContext] Google login error at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Google login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, role: string, username: string) => {
    try {
      setIsLoading(true);
      console.log('[AuthContext] Registering with data:', { email, password, role, username }, 'at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));
      const response = await api.post('/auth/register', { email, password, role, username });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setIsAuthenticated(true);
      setIsEmailVerified(user.isEmailVerified || true);
      setRole(role);
      console.log('[AuthContext] Registration successful at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), 'User:', user);
    } catch (error: any) {
      console.error('[AuthContext] Registration error at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/verify-email', { token });
      setIsEmailVerified(true);
      return response.data;
    } catch (error: any) {
      console.error('[AuthContext] Verify email error at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Verification error');
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      console.error('[AuthContext] Forgot password error at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error: any) {
      console.error('[AuthContext] Reset password error at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const selectRole = async (role: string, tempToken: string, additionalData?: Record<string, any>) => {
    try {
      setIsLoading(true);
      console.log('[AuthContext] Selecting role with tempToken and additional data:', { role, tempToken, additionalData }, 'at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));
      const response = await api.post('/auth/select-role', {
        tempToken,
        role,
        ...additionalData,
      });
      const { token } = response.data;
      if (token) {
        localStorage.setItem('token', token);
        const userResponse = await api.get('/auth/me');
        const userData = userResponse.data;
        setUser(userData);
        setIsAuthenticated(true);
        setIsEmailVerified(userData.isEmailVerified || true);
        setRole(role);
      }
      return response.data;
    } catch (error: any) {
      console.error('[AuthContext] Role selection error at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to select role');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setIsEmailVerified(true);
    setRole(null);
    setUser(null);
    setIsLoading(false);
    console.log('[AuthContext] Logout at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('[AuthContext] Checking token on mount at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), 'Token:', token);
    if (token) {
      setIsAuthenticated(true); // Предварительно устанавливаем isAuthenticated
      api.get('/auth/me')
        .then((response) => {
          console.log('[AuthContext] /auth/me response at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), response.data);
          const userData = response.data;
          setUser(userData);
          setIsEmailVerified(userData.isEmailVerified || true);
          setRole(userData.role || null);
        })
        .catch((error) => {
          console.error('[AuthContext] /auth/me error at', new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }), error.response?.data || error.message);
          // Не сбрасываем токен, только логируем ошибку
          setUser(null); // Сбрасываем только user, оставляем isAuthenticated
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setRole(null);
      setIsLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isEmailVerified,
    role,
    user,
    isLoading,
    login,
    googleLogin,
    register,
    verifyEmail,
    forgotPassword,
    resetPassword,
    selectRole,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};