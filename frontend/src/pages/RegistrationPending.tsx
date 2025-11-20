// src/pages/RegistrationPending.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import '../styles/registration-pending.css';
import { brand } from '../brand';
import { getPendingSessionStatus } from '../services/api';
import { useRole } from '../context/RoleContext';

const REDIRECT_MS = 12000; // 12 seconds

const RegistrationPending: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { email?: string; pendingSessionId?: string } };
  const email = location?.state?.email;
  const progressRef = useRef<HTMLDivElement | null>(null);

  const { refreshProfile, profile } = useRole();
  const [autoLoginActive, setAutoLoginActive] = useState(false);
  const autoLoginStartedRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      navigate('/login', { replace: true });
    }, REDIRECT_MS);

  useEffect(() => {
    // pending_session_id из state или localStorage
    const stateId = location?.state?.pendingSessionId;
    const storedId = (() => {
      try {
        return localStorage.getItem('pendingSessionId');
      } catch {
        return null;
      }
    })();

    const pendingId = stateId || storedId;
    if (!pendingId) return;

    if (autoLoginStartedRef.current) return;
    autoLoginStartedRef.current = true;

    let cancelled = false;
    const startedAt = Date.now();
    const MAX_MS = 5 * 60_000; // максимум 5 минут

    const poll = async () => {
      if (cancelled) return;

      try {
        const res = await getPendingSessionStatus(pendingId);
        if (res.status === 'verified' && res.accessToken) {
          // отмечаем, что авто-логин пошёл
          setAutoLoginActive(true);

          // чистим старую cookie сессии, как в AuthCallback
          document.cookie = `${brand.id}.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;

          try {
            localStorage.setItem('token', res.accessToken);
            localStorage.removeItem('pendingSessionId');
          } catch {}

          try {
            await refreshProfile();
          } catch (e) {
            console.error('Auto-login refreshProfile failed', e);
            try { localStorage.removeItem('token'); } catch {}
            document.cookie = `${brand.id}.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            return;
          }

          // дальше редирект сделает другой useEffect (ниже) по авто-логину + profile
          return;
        }

        if (res.status === 'not_found') {
          // сессия умерла/не найдена — прекращаем попытки
          try { localStorage.removeItem('pendingSessionId'); } catch {}
          cancelled = true;
          return;
        }

        // status === 'pending' — продолжаем polling
      } catch (e) {
        console.error('Error polling pending-session', e);
        // Ошибку логируем, но даём шанс повторять до таймаута
      }

      if (!cancelled && Date.now() - startedAt < MAX_MS) {
        setTimeout(poll, 4000); // 4 секунды между запросами
      }
    };

    // маленькая задержка перед первым запросом
    const first = setTimeout(poll, 3000);

    return () => {
      cancelled = true;
      clearTimeout(first);
    };
  }, [location, refreshProfile]);

    useEffect(() => {
    if (!autoLoginActive) return;
    if (!profile) return;

    const safe = (p?: string | null) =>
      p && p.startsWith('/') && !p.startsWith('//') ? p : null;

    const roleFromStorage = ((): 'employer' | 'jobseeker' | null => {
      try {
        return (localStorage.getItem('pendingRole') as any) || null;
      } catch {
        return null;
      }
    })();

    let after = '';
    try {
      after = localStorage.getItem('afterVerifyReturn') || '';
    } catch {
      after = '';
    }
    const hasAfter = safe(after) != null;

    // чистим хвосты pending-данных
    try { localStorage.removeItem('afterVerifyReturn'); } catch {}
    try { localStorage.removeItem('pendingRole'); } catch {}
    try { localStorage.removeItem('pendingEmail'); } catch {}
    try { localStorage.removeItem('pendingSessionId'); } catch {}

    const role = profile.role;

    if ((roleFromStorage === 'jobseeker' || role === 'jobseeker') && hasAfter) {
      const dest = safe(after)!;
      navigate(dest, { replace: true });
      return;
    }

    if (role === 'employer' || roleFromStorage === 'employer') {
      navigate('/employer-dashboard', { replace: true });
      return;
    }

    if (role === 'affiliate') {
      navigate('/affiliate/dashboard', { replace: true });
      return;
    }

    // дефолт — джобсикер
    navigate('/jobseeker-dashboard', { replace: true });
  }, [autoLoginActive, profile, navigate]);


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
