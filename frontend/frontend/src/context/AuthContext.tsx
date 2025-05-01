import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_BASE_URL } from '../api/apiConfig';

// Определяем типы для пользователя
interface User {
  id: number;
  email: string;
  login: string; // Добавляем поле login
}

interface AuthContextType {
  user: User | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

// Создаём контекст
const AuthContext = createContext<AuthContextType | null>(null);

// Провайдер контекста
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Проверяем, есть ли пользователь в localStorage при загрузке
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Проверяем токен на сервере
      fetch(`${API_BASE_URL}/api/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Invalid token');
          }
          return response.json();
        })
        .then((data: User) => {
          setUser(data); // Устанавливаем пользователя, если токен валиден
        })
        .catch(() => {
          // Если токен недействителен, удаляем его
          localStorage.removeItem('token');
          setUser(null);
        });
    }
  }, []);

  // Функция для логина
  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('token', token);
  };

  // Функция для логаута
  const logout = () => {
    const token = localStorage.getItem('token');
    if (token) {
      // Отправляем запрос на логаут
      fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Logout failed');
          }
          return response.json();
        })
        .catch((err) => {
          console.error('Logout error:', err);
        })
        .finally(() => {
          // В любом случае очищаем данные на клиенте
          setUser(null);
          localStorage.removeItem('token');
        });
    } else {
      setUser(null);
      localStorage.removeItem('token');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};