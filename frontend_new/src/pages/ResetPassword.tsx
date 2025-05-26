import { useState } from 'react';
import { Link } from 'react-router-dom';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setMessage(null);
      // Здесь должен быть API-запрос для сброса пароля
      // Например: await resetPassword(email);
      // Пока используем заглушку
      setMessage('If an account with this email exists, a reset link has been sent.');
    } catch (err) {
      console.error('Reset password error:', err);
      setError('Failed to send reset link. Please try again.');
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Reset Password</h2>
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
          {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
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