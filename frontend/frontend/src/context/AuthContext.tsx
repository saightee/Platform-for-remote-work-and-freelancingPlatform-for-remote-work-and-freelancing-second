import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

interface User {
  id: string;
  email: string;
  role: string | null;
  isEmailVerified: boolean;
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
  googleLogin: () => Promise<void>;
  register: (email: string, password: string) => Promise<any>;
  verifyEmail: (token: string) => Promise<any>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (token: string, newPassword: string) => Promise<any>;
  selectRole: (role: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
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
      setIsEmailVerified(user.isEmailVerified || false);
      setRole(user.role || null);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const googleLogin = async () => {
    try {
      window.location.href = `${API_BASE_URL}/api/auth/google`;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Google login failed');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { email, password });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      setIsEmailVerified(true);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Verification failed');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Forgot password request failed');
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await api.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Reset password failed');
    }
  };

  const selectRole = async (role: string) => {
    try {
      const response = await api.post('/roles/select', { role });
      setRole(role);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Role selection failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setIsEmailVerified(false);
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
          setIsEmailVerified(response.data.isEmailVerified || false);
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};