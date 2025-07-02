
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/api';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setMessage(null);
      await requestPasswordReset(email);
      setMessage('If an account with this email exists, a reset link has been sent.');
    } catch (error: any) {
      console.error('Reset password error:', error);
      setError(error.response?.data?.message || 'Failed to send reset link. Please try again.');
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Reset Password</h2>
        {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
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
          <button onClick={handleSubmit}>Send Reset Link</button>
          <div className="form-links">
            <p>
              <Link to="/login">Go to Login</Link>
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

export default ResetPassword;