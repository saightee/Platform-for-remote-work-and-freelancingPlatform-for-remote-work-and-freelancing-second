import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface User {
  id: string;
  email: string;
  role: string | null;
  isEmailVerified: boolean;
  username?: string; // Добавляем username
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

  const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
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
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setIsAuthenticated(true);
      setIsEmailVerified(true);
      setRole(user.role || null);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login error');
    }
  };

  const googleLogin = async (role?: string) => {
    try {
      console.log('Redirecting to Google with role:', role || 'none');
      const roleQuery = role ? `&role=${encodeURIComponent(role)}` : '';
      window.location.href = `${API_BASE_URL}/api/auth/google?callbackUrl=${encodeURIComponent(window.location.origin + '/auth/callback')}${roleQuery}`;
    } catch (error: any) {
      console.error('Google login error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Google login failed');
    }
  };

  const register = async (email: string, password: string, role: string, username: string) => {
    try {
      console.log('Registering with data:', { email, password, role, username });
      const response = await api.post('/auth/register', { email, password, role, username });
      console.log('Server response:', response.data);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setIsAuthenticated(true);
      setIsEmailVerified(true);
      setRole(role);
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      setIsEmailVerified(true);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Verification error');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to send reset link');
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await api.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  };

  const selectRole = async (role: string, tempToken: string, additionalData?: Record<string, any>) => {
    try {
      console.log('Selecting role with tempToken and additional data:', { role, tempToken, additionalData });
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
        setIsEmailVerified(true);
        setRole(role);
      }
      return response.data;
    } catch (error: any) {
      console.error('Role selection error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to select role');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setIsEmailVerified(true);
    setRole(null);
    setUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((response) => {
          setUser(response.data);
          setIsAuthenticated(true);
          setIsEmailVerified(true);
          setRole(response.data.role || null);
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, []);

  const value: AuthContextType = {
    isAuthenticated,
    isEmailVerified,
    role,
    user,
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