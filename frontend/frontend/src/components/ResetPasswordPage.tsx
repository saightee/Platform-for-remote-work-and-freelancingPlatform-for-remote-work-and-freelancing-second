import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Invalid token');
      return;
    }

    try {
      await resetPassword(token, newPassword);
      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Reset Password</h2>
      {error && <p className="login-error">{error}</p>}
      {success && <p className="login-success">{success}</p>}
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="login-input"
          required
        />
        <button type="submit" className="login-button">Reset Password</button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;