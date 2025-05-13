import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';
import '../styles/Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { login, googleLogin, isAuthenticated, isEmailVerified, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && isEmailVerified && role) {
      navigate('/myaccount');
    } else if (isAuthenticated && !isEmailVerified) {
      navigate('/verify-email');
    } else if (isAuthenticated && isEmailVerified && !role) {
      navigate('/select-role');
    }
  }, [isAuthenticated, isEmailVerified, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await login(email, password);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        if (isAuthenticated && isEmailVerified && role) {
          navigate('/myaccount');
        } else if (isAuthenticated && !isEmailVerified) {
          navigate('/verify-email');
        } else if (isAuthenticated && isEmailVerified && !role) {
          navigate('/select-role');
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleSocialLogin = async (provider: string) => {
    setError(null);
    setSuccess(null);
    try {
      if (provider === 'Google') {
        await googleLogin();
      } else {
        setError(`Login with ${provider} is not implemented yet`);
      }
    } catch (err: any) {
      setError(err.message || `Login with ${provider} failed`);
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">Login</h2>
      {error && <p className="login-error">{error}</p>}
      {success && <p className="login-success">{success}</p>}
      <form onSubmit={handleLogin} className="login-form">
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
        <button type="submit" className="login-button">Login</button>
      </form>
      <div className="social-login">
        <button
          type="button"
          className="social-button google-button"
          onClick={() => handleSocialLogin('Google')}
        >
          <FaGoogle /> Login with Google
        </button>
        <button
          type="button"
          className="social-button facebook-button"
          onClick={() => handleSocialLogin('Facebook')}
        >
          <FaFacebookF /> Login with Facebook
        </button>
      </div>
      <div className="link-container">
        <Link to="/forgot-password" className="link">Forgot Password?</Link>
        <Link to="/" className="link">Go to Home</Link>
      </div>
    </div>
  );
};

export default Login;