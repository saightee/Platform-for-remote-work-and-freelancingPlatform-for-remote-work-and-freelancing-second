// src/pages/RegistrationPending.tsx
import React, { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/registration-pending.css';
import { brand } from '../brand';

const REDIRECT_MS = 12000; // 12 seconds

const RegistrationPending: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { email?: string } };
  const email = location?.state?.email;
  const progressRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      navigate('/login', { replace: true });
    }, REDIRECT_MS);

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const el = progressRef.current;
      if (!el) return;
      const elapsed = Math.min(now - start, REDIRECT_MS);
      const pct = 100 - (elapsed / REDIRECT_MS) * 100;
      el.style.width = `${pct}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [navigate]);

  return (
    <div className="rp-shell rp-shell--light">
   <Helmet>
  <title>Check your email — {brand.name}</title>
</Helmet>

      <main className="rp-card rp-card--light" role="main" aria-live="polite">
        {/* убран бейдж "Thank you" */}

        <div className="rp-icon" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="56" height="56">
            <circle className="rp-icon__ring" cx="32" cy="32" r="28" />
            <path
              className="rp-icon__check"
              d="M22 33.5l6.5 6.5L42 26.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="rp-title">Thank you for registering!</h1>

        <p className="rp-text">
          {email ? (
            <>We’ve sent a verification link to <strong>{email}</strong>. </>
          ) : (
            <>We’ve sent a verification link to your email. </>
          )}
          Please check your inbox (and spam folder) and click the link to verify your account.
        </p>

        <div className="rp-info">
          <span className="rp-dot" aria-hidden="true" />
          You’ll be redirected to the login page in <strong>12 seconds</strong>.
        </div>

        <div className="rp-progress" aria-hidden="true">
          <div className="rp-progress__bar" ref={progressRef} />
        </div>

        <div className="rp-actions">
          <Link className="rp-btn rp-btn--primary" to="/login">Go to Login now</Link>
        </div>
      </main>
    </div>
  );
};

export default RegistrationPending;
