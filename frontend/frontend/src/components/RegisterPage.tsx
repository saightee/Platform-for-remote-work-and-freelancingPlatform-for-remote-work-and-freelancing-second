import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';
import '../styles/Login.css';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const response = await register(email, password);
      console.log('Registration response:', response);
      const tempToken = response.tempToken || response.data?.tempToken;
      if (tempToken) {
        setSuccess('Registration successful! Redirecting to select role...');
        setTimeout(() => navigate(`/select-role?tempToken=${tempToken}`), 2000);
      } else {
        setSuccess('Registration successful! Please verify your email.');
        setTimeout(() => navigate('/verify-email'), 2000);
      }
    } catch (err: any) {
      console.error('Registration failed:', err.message);
      setError(err.message || 'Registration failed');
    }
  };

  const handleSocialRegister = async (provider: string) => {
    setError(null);
    setSuccess(null);
    try {
      if (provider === 'Google') {
        await googleLogin();
        // Редирект обрабатывается через callback в App.tsx
      } else {
        setError(`Registration with ${provider} is not implemented yet`);
      }
    } catch (err: any) {
      console.error('Social registration failed:', err.message);
      setError(err.message || `Registration with ${provider} failed`);
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Register</h2>
      {error && <p className="login-error">{error}</p>}
      {success && <p className="login-success">{success}</p>}
      <form onSubmit={handleRegister} className="login-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="login-input"
          required
        />
        <button type="submit" className="login-button">Register</button>
      </form>
      <div className="social-login">
        <button
          type="button"
          className="social-button google-button"
          onClick={() => handleSocialRegister('Google')}
        >
          <FaGoogle /> Register with Google
        </button>
        <button
          type="button"
          className="social-button facebook-button"
          onClick={() => handleSocialRegister('Facebook')}
        >
          <FaFacebookF /> Register with Facebook
        </button>
      </div>
      <div className="link-container">
        <Link to="/login" className="link">Already have an account? Login</Link>
        <Link to="/" className="link">Go to Home</Link>
      </div>
    </div>
  );
};

export default RegisterPage;