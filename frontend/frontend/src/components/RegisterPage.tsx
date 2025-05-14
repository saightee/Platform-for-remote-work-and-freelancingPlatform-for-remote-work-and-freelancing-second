import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaGoogle, FaFacebookF } from 'react-icons/fa';
import '../styles/Login.css';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState(''); // Добавляем состояние для username
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(true);
  const { register, googleLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/myaccount');
    }
  }, [isAuthenticated, navigate]);

  const handleRoleSelect = (selectedRole: string) => {
    setRole(selectedRole);
    setShowModal(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!role) {
      setError('Please select a role');
      return;
    }

    try {
      console.log('[RegisterPage] Register attempt:', { username, email, password, role });
      await register(email, password, role, username); // Передаём username в register
      setSuccess('Registration successful! Redirecting to your account...');
      setTimeout(() => navigate('/myaccount'), 2000);
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
        if (!role) {
          setError('Please select a role before registering with Google');
          return;
        }
        await googleLogin(role);
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
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Select Your Role</h2>
            <div className="role-selection">
              <div
                className={`role-card ${role === 'jobseeker' ? 'selected' : ''}`}
                onClick={() => handleRoleSelect('jobseeker')}
              >
                <h3>Job Seeker</h3>
                <p>Find jobs and apply for projects</p>
              </div>
              <div
                className={`role-card ${role === 'employer' ? 'selected' : ''}`}
                onClick={() => handleRoleSelect('employer')}
              >
                <h3>Employer</h3>
                <p>Post jobs and hire employees</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="login-title">Register</h2>
      {error && <p className="login-error">{error}</p>}
      {success && <p className="login-success">{success}</p>}
      <form onSubmit={handleRegister} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="login-input"
          required
        />
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