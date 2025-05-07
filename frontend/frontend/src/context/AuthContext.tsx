import React, { createContext, useState, useContext, useEffect } from 'react';
import baseURL from '../api/apiConfig';

interface AuthContextType {
  user: string | null;
  role: 'employer' | 'jobseeker' | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string, role: 'employer' | 'jobseeker', extraData?: { [key: string]: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<'employer' | 'jobseeker' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    const storedRole = localStorage.getItem('role');
    if (token && storedUser && storedRole) {
      setUser(storedUser);
      setRole(storedRole as 'employer' | 'jobseeker');
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', email);
      localStorage.setItem('role', data.role || 'jobseeker'); // Предполагаем, что бэкенд возвращает роль
      setUser(email);
      setRole(data.role || 'jobseeker');
      setIsAuthenticated(true);
    } catch (err: any) {
      throw new Error(err.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, username: string, role: 'employer' | 'jobseeker', extraData?: { [key: string]: string }) => {
    try {
      const response = await fetch(`${baseURL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username, role, ...extraData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', email);
      localStorage.setItem('role', role);
      setUser(email);
      setRole(role);
      setIsAuthenticated(true);
    } catch (err: any) {
      throw new Error(err.message || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};