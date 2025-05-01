import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Определяем типы для пользователя
interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}

// Создаём контекст
const AuthContext = createContext<AuthContextType | null>(null);

// Провайдер контекста
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  // Проверяем, есть ли пользователь в localStorage при загрузке
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Функция для логина
  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // Функция для логаута
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    // Здесь можно добавить API-запрос для логаута, например:
    // fetch('/api/logout', { method: 'POST' });
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