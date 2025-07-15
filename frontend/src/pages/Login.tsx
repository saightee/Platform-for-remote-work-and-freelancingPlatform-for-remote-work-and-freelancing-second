import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import { useRole } from '../context/RoleContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';




const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { profile, currentRole, refreshProfile } = useRole();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRefreshing) return;
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email and password cannot be empty.');
      return;
    }
    try {
      setIsRefreshing(true);
      setErrorMessage(null);
      console.log('Attempting login with:', { email, rememberMe });
      const response = await login({ email, password, rememberMe });
      console.log('Login response:', response);
      localStorage.setItem('token', response.accessToken);
      console.log('Token stored:', response.accessToken);
      await refreshProfile();
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.message || 'Login failed. Please try again.';
      console.log('Error details:', error.response?.data);
      setErrorMessage(errorMsg);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('Login useEffect, isAuthenticated:', isAuthenticated, 'profile:', profile, 'currentRole:', currentRole);
    if (isAuthenticated && currentRole) {
      if (currentRole === 'admin') {
        navigate('/admin');
      } else if (currentRole === 'moderator') {
        navigate('/moderator');
      } else {
        navigate('/');
      }
    }
  }, [isAuthenticated, currentRole, navigate]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Sign In</h2>
        {errorMessage && <p style={{ color: 'red', textAlign: 'center' }}>{errorMessage}</p>}
<form onSubmit={handleSubmit} className="login-form">
  <div className="login-form-group">
    <label>Email</label>
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="Enter your email"
      autoComplete="email"
      required
    />
  </div>
  <div className="login-form-group login-password-container">
    <label>Password</label>
    <div className="login-password-input-wrapper">
      <input
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        autoComplete="current-password"
        required
      />
      <span className="login-password-toggle-icon" onClick={togglePasswordVisibility}>
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </span>
    </div>
  </div>
  <div className="login-form-group login-checkbox-group">
    <input
      type="checkbox"
      id="login-remember-me"
      checked={rememberMe}
      onChange={(e) => setRememberMe(e.target.checked)}
    />
    <label htmlFor="login-remember-me">Remember Me</label>
  </div>
  <button type="submit" className="login-button">Sign In</button>
  <div className="login-form-links">
    <p>
      Forgotten your password? <Link to="/forgot-password">Reset</Link>
    </p>
    <p>
      Don’t have an account? <Link to="/role-selection">Register</Link>
    </p>
    <p>
      <Link to="/">Go to Home</Link>
    </p>
  </div>
</form>
      </div>
    </div>
  );
};

export default Login;