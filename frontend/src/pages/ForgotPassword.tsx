import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/api';
import '../styles/CheckEmail.css'; // ⬅️ используем тот же css, что и CheckEmail

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!email.trim()) {
      setErr('Please enter your email.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await forgotPassword(email.trim());
      setMsg(res.message || 'If the email exists, we’ve sent a reset link.');
      setEmail('');
      setTimeout(() => navigate('/login'), 3000);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ce">
      <div className="ce__box">
        <h2 className="ce__title">Reset your password</h2>
        <p className="ce__desc">
          Enter your account email and we’ll send you a password reset link.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="ce__group">
            <label className="ce__label">Email</label>
            <input
              type="email"
              value={email}
              className="ce__input"
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="ce__btn" disabled={isLoading}>
            {isLoading ? 'Sending…' : 'Send reset link'}
          </button>

          {msg && <p className="ce__msg ce__msg--success">{msg}</p>}
          {err && <p className="ce__msg ce__msg--error">{err}</p>}
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
