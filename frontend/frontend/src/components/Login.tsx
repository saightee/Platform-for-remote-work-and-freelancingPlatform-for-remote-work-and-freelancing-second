import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';
import '../styles/Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const { login, googleLogin, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    console.log(
      '[Login] Attempting login with:',
      { email, password },
      'at',
      new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }),
    );

    try {
      await login(email, password);
      console.log(
        '[Login] Login successful at',
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }),
      );
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      navigate('/myaccount');
    } catch (err: any) {
      console.error(
        '[Login] Login failed:',
        err.message,
        'at',
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }),
      );
      setError(err.message || 'Login failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
    } catch (err: any) {
      console.error(
        '[Login] Google login failed:',
        err.message,
        'at',
        new Date().toLocaleString('en-US', { timeZone: 'Europe/Kiev' }),
      );
      setError(err.message || 'Google login failed');
    }
  };

  const handleFacebookLogin = async () => {
    setError('Facebook login is not implemented yet.');
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="login-container">
      <h2 className="login-title">Login</h2>
      {error && <p className="login-error">{error}</p>}
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
          required
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          required
          autoComplete="current-password"
        />
        <div className="checkbox-group">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label htmlFor="rememberMe">Remember me</label>
        </div>
        <button type="submit" className="login-button" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <div className="social-login">
        <button
          type="button"
          className="social-button google-button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <FaGoogle /> Login with Google
        </button>
        <button
          type="button"
          className="social-button facebook-button"
          onClick={handleFacebookLogin}
          disabled={isLoading}
        >
          <FaFacebookF /> Login with Facebook
        </button>
      </div>
      <p>
        Forgot password? <Link to="/forgot-password" className="link">Reset</Link>
      </p>
      <p>
        Don’t have an account? <Link to="/register" className="link">Register</Link>
      </p>
    </div>
  );
};

export default Login;