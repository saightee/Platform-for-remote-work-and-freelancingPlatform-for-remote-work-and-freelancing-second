import React, { useState } from 'react';
  import { useNavigate, Link } from 'react-router-dom';
  import { useAuth } from '../context/AuthContext';
  import '../styles/Login.css';

  const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const { forgotPassword } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      try {
        await forgotPassword(email);
        setSuccess('Password reset link sent! Check your email.');
        setTimeout(() => navigate('/login'), 2000);
      } catch (err: any) {
        setError(err.message || 'Failed to send reset link');
      }
    };

    return (
      <div className="login-container">
        <h2 className="login-title">Forgot Password</h2>
        {error && <p className="login-error">{error}</p>}
        {success && <p className="login-success">{success}</p>}
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="login-input"
            required
          />
          <button type="submit" className="login-button">Send Reset Link</button>
        </form>
        <div className="link-container">
          <Link to="/login" className="link">Back to Login</Link>
        </div>
      </div>
    );
  };

  export default ForgotPasswordPage;