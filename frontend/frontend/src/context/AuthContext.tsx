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
  selectRole: (role: string, tempToken: string, additionalData?: Record<string, any>) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true); // Отключили проверку email
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
      setIsEmailVerified(true); // Отключили проверку email
      setRole(user.role || null);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Ошибка входа');
    }
  };

  const googleLogin = async () => {
    try {
      console.log('Перенаправление на Google...');
      window.location.href = `${API_BASE_URL}/api/auth/google?callbackUrl=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
    } catch (error: any) {
      console.error('Ошибка Google-логина:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Ошибка Google-логина');
    }
  };

  const register = async (email: string, password: string) => {
    try {
      console.log('Регистрация с данными:', { email, password });
      const response = await api.post('/auth/register', { email, password });
      console.log('Ответ сервера:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Ошибка регистрации:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Не удалось зарегистрироваться');
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await api.post('/auth/verify-email', { token });
      setIsEmailVerified(true);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Ошибка подтверждения');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Ошибка запроса восстановления пароля');
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await api.post('/auth/reset-password', { token, newPassword });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Ошибка сброса пароля');
    }
  };

  const selectRole = async (role: string, tempToken: string, additionalData?: Record<string, any>) => {
    try {
      console.log('Выбор роли с tempToken и дополнительными данными:', { role, tempToken, additionalData });
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
        setIsEmailVerified(true); // Для Google-логина email уже подтверждён
        setRole(role);
      }
      return response.data;
    } catch (error: any) {
      console.error('Ошибка выбора роли:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Не удалось выбрать роль');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setIsEmailVerified(true); // Оставляем true, так как проверка отключена
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
          setIsEmailVerified(true); // Отключили проверку email
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
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};