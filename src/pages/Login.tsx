import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, googleAuthInitiateForLogin } from '../services/api';
import { FaGoogle } from 'react-icons/fa';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const { accessToken } = await login({ email, password });
      localStorage.setItem('token', accessToken);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleGoogleLogin = () => {
    googleAuthInitiateForLogin();
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Sign In</h2>
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