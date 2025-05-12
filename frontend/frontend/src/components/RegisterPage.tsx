import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';
import '../styles/Register.css';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();

  if (!auth) {
    console.error('Auth context is undefined in RegisterPage');
    return <div>Error: Auth context is not available</div>;
  }

  const { register, isAuthenticated, isEmailVerified, role } = auth;

  useEffect(() => {
    if (isAuthenticated && !isEmailVerified) {
      navigate('/verify-email');
    } else if (isAuthenticated && isEmailVerified && !role) {
      navigate('/select-role');
    } else if (isAuthenticated && isEmailVerified && role) {
      navigate('/complete-profile');
    }
  }, [isAuthenticated, isEmailVerified, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!agree) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await register(email, password);
      setSuccess('Registration successful! Please check your email to verify your account.');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const handleSocialLogin = (provider: string) => {
    setError(`Login with ${provider} is not implemented yet`);
  };

  return (
    <div className="register-page">
      <h2>Register</h2>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {!success && (
        <>
          <form onSubmit={handleSubmit} className="register-form">
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
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="agree"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <label htmlFor="agree">
                I agree to the <a href="/terms">Terms of Service</a> and{' '}
                <a href="/privacy">Privacy Policy</a>
              </label>
            </div>
            <button type="submit" className="register-btn">
              Register
            </button>
          </form>
          <div className="social-login">
            <button
              type="button"
              className="social-btn google-btn"
              onClick={() => handleSocialLogin('Google')}
            >
              <FaGoogle /> Sign up with Google
            </button>
            <button
              type="button"
              className="social-btn facebook-btn"
              onClick={() => handleSocialLogin('Facebook')}
            >
              <FaFacebookF /> Sign up with Facebook
            </button>
          </div>
        </>
      )}
      <div className="links">
        <Link to="/">Go to Home</Link>
        <Link to="/forgot-password">Forgot Password?</Link>
      </div>
    </div>
  );
};

export default RegisterPage;