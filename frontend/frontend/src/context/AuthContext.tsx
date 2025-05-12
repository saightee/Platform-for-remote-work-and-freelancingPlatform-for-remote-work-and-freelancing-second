import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Определяем интерфейс для пользователя
interface User {
  email: string;
  role: string | null;
  isEmailVerified: boolean;
}

// Интерфейс для контекста
interface AuthContextType {
  user: User | null;
  role: string | null;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setRole: (role: 'employer' | 'jobseeker') => void;
  verifyEmail: (token: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Фейковая API с валидацией токенов
const fakeAuthAPI: {
  register: (email: string, password: string) => Promise<{ user: User }>;
  login: (email: string, password: string) => Promise<{ user: User }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string }>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
} = {
  register: async (email: string, password: string) => {
    console.log('fakeAuthAPI.register called with:', { email, password });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { user: { email, role: null, isEmailVerified: false } };
  },
  login: async (email: string, password: string) => {
    console.log('fakeAuthAPI.login called with:', { email, password });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { user: { email, role: null, isEmailVerified: false } };
  },
  verifyEmail: async (token: string) => {
    console.log('fakeAuthAPI.verifyEmail called with:', { token });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Имитация валидации токена: токен должен начинаться с "verify-" и быть не старше 1 часа
    const validTokenPrefix = 'verify-';
    const tokenAge = Date.now() - (parseInt(token.split('-')[1]) || 0);
    const isTokenValid = token.startsWith(validTokenPrefix) && tokenAge < 3600000; // 1 час = 3600000 мс

    if (isTokenValid) {
      return { success: true };
    } else {
      return { success: false, message: 'Invalid or expired verification token' };
    }
  },
  forgotPassword: async (email: string) => {
    console.log('fakeAuthAPI.forgotPassword called with:', { email });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Имитация генерации токена (например, "reset-1715481600000" с текущей временной меткой)
    const resetToken = `reset-${Date.now()}`;
    console.log(`Generated reset token for ${email}: ${resetToken}`);
    // В реальном приложении здесь отправляется email с токеном
  },
  resetPassword: async (token: string, newPassword: string) => {
    console.log('fakeAuthAPI.resetPassword called with:', { token, newPassword });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Имитация валидации токена: токен должен начинаться с "reset-" и быть не старше 1 часа
    const validTokenPrefix = 'reset-';
    const tokenAge = Date.now() - (parseInt(token.split('-')[1]) || 0);
    const isTokenValid = token.startsWith(validTokenPrefix) && tokenAge < 3600000; // 1 час = 3600000 мс

    if (isTokenValid) {
      return { success: true };
    } else {
      return { success: false, message: 'Invalid or expired reset token' };
    }
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Loading data from localStorage...');
    const storedUser = localStorage.getItem('user');
    const storedRole = localStorage.getItem('role');
    const emailVerified = localStorage.getItem('emailVerified');

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);
        setIsAuthenticated(true);
        setRoleState(storedRole);
        setIsEmailVerified(emailVerified === 'true');
        console.log('Data loaded from localStorage:', { parsedUser, storedRole, emailVerified });
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('emailVerified');
      }
    }
  }, []);

  console.log('AuthProvider rendering with state:', { user, role, isAuthenticated, isEmailVerified });

  const register = async (email: string, password: string) => {
    console.log('register called with:', { email, password });
    try {
      const response = await fakeAuthAPI.register(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('emailVerified', 'false');
    } catch (error: any) {
      console.error('register error:', error);
      throw new Error(error.message || 'Registration failed');
    }
  };

  const login = async (email: string, password: string) => {
    console.log('login called with:', { email, password });
    try {
      const response = await fakeAuthAPI.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      setRoleState(response.user.role || null);
      setIsEmailVerified(response.user.isEmailVerified || false);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('role', response.user.role || '');
      localStorage.setItem('emailVerified', response.user.isEmailVerified ? 'true' : 'false');
    } catch (error: any) {
      console.error('login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = () => {
    console.log('logout called');
    setUser(null);
    setIsAuthenticated(false);
    setRoleState(null);
    setIsEmailVerified(false);
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    localStorage.removeItem('emailVerified');
    navigate('/login');
  };

  const setRole = (selectedRole: 'employer' | 'jobseeker') => {
    console.log('setRole called with:', selectedRole);
    setRoleState(selectedRole);
    if (user) {
      const updatedUser = { ...user, role: selectedRole };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('role', selectedRole);
    }
  };

  const verifyEmail = async (token: string) => {
    console.log('verifyEmail called with:', { token });
    try {
      const response = await fakeAuthAPI.verifyEmail(token);
      if (response.success) {
        setIsEmailVerified(true);
        if (user) {
          const updatedUser = { ...user, isEmailVerified: true };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          localStorage.setItem('emailVerified', 'true');
        }
        navigate('/select-role');
      } else {
        throw new Error(response.message || 'Email verification failed');
      }
    } catch (error: any) {
      console.error('verifyEmail error:', error);
      throw new Error(error.message || 'Email verification failed');
    }
  };

  const forgotPassword = async (email: string) => {
    console.log('forgotPassword called with:', { email });
    try {
      await fakeAuthAPI.forgotPassword(email);
    } catch (error: any) {
      console.error('forgotPassword error:', error);
      throw new Error(error.message || 'Failed to send reset link');
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    console.log('resetPassword called with:', { token, newPassword });
    try {
      const response = await fakeAuthAPI.resetPassword(token, newPassword);
      if (response.success) {
        if (user) {
          const updatedUser = { ...user };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        navigate('/login');
      } else {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (error: any) {
      console.error('resetPassword error:', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isEmailVerified,
        register,
        login,
        logout,
        setRole,
        verifyEmail,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    console.error('useAuth called outside of AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};