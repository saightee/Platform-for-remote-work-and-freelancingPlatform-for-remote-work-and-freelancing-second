import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api/apiConfig';
import '../styles/AuthStyles.css';

const Register: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [login, setLogin] = useState<string>(''); // Добавляем состояние для login
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError('');

    // Базовая валидация
    if (!email || !login || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      // Отправляем запрос на регистрацию
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, login, password }), // Добавляем login в запрос
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Успешная регистрация: сохраняем данные пользователя и токен
      authLogin({ email: data.email, login: data.login, id: data.id }, data.token);
      navigate('/');
    } catch (err) {
      setError((err as Error).message || 'Something went wrong');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Register for OnlineJobs</h2>
        {error && <p className="error">{error}</p>}
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>
        <div className="form-group">
          <label>Login</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Enter your login"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        <button onClick={handleSubmit}>Register</button>
        <p>
          Already have an account? <Link to="/">Go to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;