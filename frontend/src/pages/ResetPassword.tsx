import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/api';
import '../styles/reset-password.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      await requestPasswordReset(trimmed);
      setMessage('If an account with this email exists, a reset link has been sent.');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err?.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rp-shell">
      <div className="rp-card">
        <h1 className="rp-title">Reset Password</h1>

        {message && <div className="rp-alert rp-ok">{message}</div>}
        {error && <div className="rp-alert rp-err">{error}</div>}

        <div className="rp-form" no-validate="true">
          <div className="rp-group">
            <label className="rp-label">Email</label>
            <input
              className="rp-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              inputMode="email"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>

          <button className="rp-btn" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Sending…' : 'Send Reset Link'}
          </button>

          <div className="rp-links rp-links-row">
            <Link className="rp-link" to="/login">Go to Login</Link>
            <span className="rp-divider">•</span>
            <Link className="rp-link" to="/">Go to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
