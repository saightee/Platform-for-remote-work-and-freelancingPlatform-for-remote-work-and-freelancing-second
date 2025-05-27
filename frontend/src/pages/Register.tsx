import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { register } from '../services/api'; // Раскомментируем только register
// import { FaGoogle } from 'react-icons/fa';
import { useRole } from '../context/RoleContext';

const Register: React.FC = () => {
  const { role } = useParams<{ role: 'employer' | 'jobseeker' }>();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { refreshProfile } = useRole();

  useEffect(() => {
    if (!role || !['employer', 'jobseeker'].includes(role)) {
      navigate('/role-selection');
    }
  }, [role, navigate]);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!role) return;
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match!');
      return;
    }
    try {
      setErrorMessage(null);
      const { accessToken } = await register({ username, email, password, role });
      localStorage.setItem('token', accessToken);
      await refreshProfile();
      navigate('/');
    } catch (error: any) {
      console.error('Register error:', error);
      if (error.response?.status === 403 && error.response?.data?.message === 'Registration is not allowed from your country') {
        setErrorMessage('Registration is not allowed from your country.');
      } else {
        setErrorMessage(error.response?.data?.message || 'Registration failed. Please try again.');
      }
    }
  };

  // const handleGoogleRegister = () => {
  //   if (role) {
  //     googleAuthInitiate(role);
  //   }
  // };

  if (!role) return null;

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Sign Up</h2>
        {errorMessage && <p style={{ color: 'red', textAlign: 'center' }}>{errorMessage}</p>}
        <div className="register-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
            />
          </div>
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
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
            />
          </div>
          <button onClick={handleSubmit}>Sign Up as {role === 'employer' ? 'Employer' : 'Jobseeker'}</button>
          <div className="form-links">
            <p>
              Already have an account? <Link to="/login">Login</Link>
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

export default Register;