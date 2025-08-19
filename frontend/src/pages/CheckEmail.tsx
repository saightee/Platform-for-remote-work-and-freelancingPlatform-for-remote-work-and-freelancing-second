import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { resendVerification } from '../services/api';
import '../styles/CheckEmail.css';

const DEFAULT_COOLDOWN = 300; // 5 минут

export default function CheckEmail() {
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const [email, setEmail] = useState(stateEmail || '');
  const [cooldown, setCooldown] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!cooldown) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const mmss = useMemo(() => {
    const m = Math.floor(cooldown / 60).toString().padStart(2, '0');
    const s = (cooldown % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [cooldown]);

  const handleResend = async () => {
    setMsg(null);
    setErr(null);
    if (!email.trim()) {
      setErr('Please enter your email.');
      return;
    }
    try {
      await resendVerification(email.trim());
      setMsg('If the account exists and is not verified, we sent a new link.');
      setCooldown(DEFAULT_COOLDOWN);
    } catch (e: any) {
      if (e?.response?.status === 429) {
        const retry = parseInt(e.response.headers?.['retry-after'] || '', 10);
        setCooldown(Number.isFinite(retry) ? retry : DEFAULT_COOLDOWN);
        setErr('Please wait before requesting another verification email.');
      } else {
        setErr(e?.response?.data?.message || 'Failed to resend verification email.');
      }
    }
  };

  return (
    <div className="ce">
      <div className="ce__box">
        <h2 className="ce__title">Check your email</h2>
        <p className="ce__desc">
          We sent you a verification link. Click it to finish registration.
        </p>

        <div className="ce__group">
          <label className="ce__label">Email</label>
          <input
            type="email"
            value={email}
            className="ce__input"
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="ce__btn"
        >
          {cooldown > 0 ? `Resend in ${mmss}` : 'Resend verification email'}
        </button>

        {msg && <p className="ce__msg ce__msg--success">{msg}</p>}
        {err && <p className="ce__msg ce__msg--error">{err}</p>}
      </div>
    </div>
  );
}
