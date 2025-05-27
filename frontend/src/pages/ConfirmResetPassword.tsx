
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { confirmPasswordReset } from '../services/api';

const ConfirmResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    try {
      setError(null);
      setMessage(null);
      await confirmPasswordReset(token, newPassword);
      setMessage('Password reset successfully. You can now log in with your new password.');
    } catch (error: any) {
      console.error('Confirm reset password error:', error);
      setError(error.response?.data?.message || 'Failed to reset password. Please try again.');
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Confirm Password Reset</h2>
        {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
        <div className="register-form">
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <button onClick={handleSubmit}>Reset Password</button>
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

export default ConfirmResetPassword;