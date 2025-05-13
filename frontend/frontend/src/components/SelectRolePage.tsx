import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const SelectRolePage: React.FC = () => {
  const [role, setRole] = useState('jobseeker');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { selectRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tempToken = searchParams.get('tempToken');

  useEffect(() => {
    console.log('SelectRolePage mounted with tempToken:', tempToken);
    if (!tempToken) {
      setError('Неверный или отсутствующий временный токен');
      setTimeout(() => navigate('/register'), 2000);
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!tempToken) {
      setError('Временный токен отсутствует');
      return;
    }

    try {
      await selectRole(role, tempToken);
      setSuccess('Роль выбрана! Перенаправляем на ваш аккаунт...');
      setTimeout(() => navigate('/myaccount'), 2000);
    } catch (err: any) {
      console.error('Ошибка выбора роли:', err.message);
      setError(err.message || 'Не удалось выбрать роль');
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Выбор роли</h2>
      {error && <p className="login-error">{error}</p>}
      {success && <p className="login-success">{success}</p>}
      <form onSubmit={handleSubmit} className="login-form">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="login-input"
        >
          <option value="jobseeker">Ищущий работу</option>
          <option value="employer">Работодатель</option>
        </select>
        <button type="submit" className="login-button">Выбрать роль</button>
      </form>
    </div>
  );
};

export default SelectRolePage;