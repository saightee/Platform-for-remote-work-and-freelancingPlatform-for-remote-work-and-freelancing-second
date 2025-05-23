// src/pages/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, googleAuthInitiateForLogin } from '../services/api';
import { FaGoogle } from 'react-icons/fa';
import { useRole } from '../context/RoleContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { profile, refreshProfile } = useRole();

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setErrorMessage(null);
      const { accessToken } = await login({ email, password });
      localStorage.setItem('token', accessToken);
      await refreshProfile();
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Login error:', error);
      setErrorMessage(error.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    googleAuthInitiateForLogin();
  };

  useEffect(() => {
    if (isAuthenticated && profile) {
      // Временно отключаем проверку роли
      // if (profile.role === 'admin') {
      //   navigate('/admin');
      // } else {
      //   navigate('/');
      // }
      navigate('/'); // Перенаправляем всех на главную страницу
    }
  }, [isAuthenticated, profile, navigate]);

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Sign In</h2>
        {errorMessage && <p style={{ color: 'red', textAlign: 'center' }}>{errorMessage}</p>}
        <div className="register-form">
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
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="remember-me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember-me">Remember Me</label>
          </div>
          <button onClick={handleSubmit}>Sign In</button>
          <div className="google-login">
            <button onClick={handleGoogleLogin} className="google-button">
              <FaGoogle style={{ marginRight: '8px' }} /> Sign In with Google
            </button>
          </div>
          <div className="form-links">
            <p>
              Forgot password? <Link to="/reset-password">Reset</Link>
            </p>
            <p>
              Don’t have an account? <Link to="/role-selection">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;