import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import { useRole } from '../context/RoleContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { profile, refreshProfile } = useRole();

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
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
    }
  };

  useEffect(() => {
    console.log('Login useEffect, isAuthenticated:', isAuthenticated, 'profile:', profile);
    if (isAuthenticated) {
      if (profile?.role === 'admin') {
        navigate('/admin');
      } else if (profile) {
        navigate('/');
      } else {
        // Для администратора без профиля перенаправляем в /admin
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const decoded: any = jwtDecode(token);
            if (decoded.role === 'admin') {
              navigate('/admin');
            }
          } catch (err) {
            console.error('Error decoding token:', err);
            setErrorMessage('Invalid token. Please log in again.');
          }
        }
      }
    }
  }, [isAuthenticated, profile, navigate]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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
          <div className="form-group password-container">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <span className="password-toggle-icon" onClick={togglePasswordVisibility}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
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
          <div className="form-links">
            <p>
              Forgotten your password? <Link to="/reset-password">Reset</Link>
            </p>
            <p>
              Don’t have an account? <Link to="/role-selection">Register</Link>
            </p>
            <p>
              <Link to="/">Go to Home</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;