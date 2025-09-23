import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { confirmPasswordReset } from '../services/api';
import PasswordStrength, { isStrongPassword } from '../components/PasswordStrength';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/reset-password.css';

const ConfirmResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [touchedNew, setTouchedNew] = useState(false);
  const navigate = useNavigate();

  const passLenOk = newPassword.length >= 8;
  const passStrong = isStrongPassword(newPassword);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => navigate('/login'), 2200);
      return () => clearTimeout(t);
    }
  }, [message, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (!passLenOk || !passStrong) {
      setError('Password does not meet the requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setBusy(true);
      setError(null);
      setMessage(null);
      await confirmPasswordReset(token, newPassword);
      setMessage('Password reset successfully. Redirecting to login…');
    } catch (err: any) {
      console.error('Confirm reset password error:', err);
      setError(err?.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rp-shell">
      <div className="rp-card">
        <h1 className="rp-title">Confirm Password Reset</h1>
        {message && <div className="rp-alert rp-ok">{message}</div>}
        {error && <div className="rp-alert rp-err">{error}</div>}

        <form onSubmit={handleSubmit} className="rp-form" noValidate>
          {/* два поля рядом (на мобилке — в столбец) */}
          <div className="rp-two">
            {/* new password */}
            <div className="rp-group">
              <label className="rp-label">New Password</label>
              <div className="rp-passwrap">
                <input
                  className="rp-input"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => setTouchedNew(true)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  aria-invalid={touchedNew && (!passLenOk || !passStrong) ? 'true' : 'false'}
                />
                <button
                  type="button"
                  className="rp-eye"
                  onClick={() => setShowNew((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {/* один источник подсказок — компонент PasswordStrength (без дублей списков) */}
              <PasswordStrength value={newPassword} />
            </div>

            {/* confirm */}
            <div className="rp-group">
              <label className="rp-label">Confirm Password</label>
              <div className="rp-passwrap">
                <input
                  className="rp-input"
                  type={showConf ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="rp-eye"
                  onClick={() => setShowConf((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showConf ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="rp-btn" disabled={busy}>
            {busy ? 'Saving…' : 'Reset Password'}
          </button>

          <div className="rp-links rp-links-row">
            <Link className="rp-link" to="/login">Go to Login</Link>
            <span className="rp-divider">•</span>
            <Link className="rp-link" to="/">Go to Home</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfirmResetPassword;
