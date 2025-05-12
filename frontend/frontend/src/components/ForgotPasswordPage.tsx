import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/ForgotPassword.css';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await forgotPassword(email);
      setSuccess('Password reset link sent! Please check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
    }
  };

  return (
    <div className="forgot-password-page">
      <h2>Forgot Password</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {!success && (
        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="reset-btn">
            Send Reset Link
          </button>
        </form>
      )}
      <div className="links">
        <Link to="/login">Back to Login</Link>
        <Link to="/register">Register</Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;