import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';


import CountrySelect from '../components/inputs/CountrySelect';
import Turnstile from '../components/Turnstile';
import PasswordStrength, { isStrongPassword } from '../components/PasswordStrength';

import { registerAffiliate } from '../services/api';
import { toast } from '../utils/toast';

import '../styles/register-v2.css';
import '../styles/country-langs.css';

const urlOk = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());

const getCookie = (name: string): string | undefined => {
  const m = document.cookie.match(
    new RegExp(
      '(?:^|; )' +
        name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') +
        '=([^;]*)'
    )
  );
  return m ? decodeURIComponent(m[1]) : undefined;
};

const PAYOUT_METHODS = ['PayPal', 'Wise', 'Payoneer', 'Bank transfer', 'Crypto'];

const tsSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim();

const AffiliateRegister: React.FC = () => {
  const navigate = useNavigate();

  // базовые поля
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [seePass, setSeePass] = useState(false);
  const [seeConf, setSeeConf] = useState(false);

  // аффилейтовые поля
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [country, setCountry] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [companyName, setCompanyName] = useState('');

  const [trafficSourcesStr, setTrafficSourcesStr] = useState('SEO, PPC, Social');
  const [promoGeoStr, setPromoGeoStr] = useState('US, CA, UK');
  const [monthlyTraffic, setMonthlyTraffic] = useState('');

  const [payoutMethod, setPayoutMethod] = useState<string>('PayPal');
  const [payoutDetails, setPayoutDetails] = useState('');

  const [telegram, setTelegram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');

  // рефка
  const [refCode, setRefCode] = useState<string | undefined>(undefined);

  // Turnstile
  const [tsToken, setTsToken] = useState<string | undefined>(undefined);
  const [tsError, setTsError] = useState(false);

  // служебное
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const emailsMismatch = useMemo(() => {
    if (!confirmEmail) return false;
    return (
      confirmEmail.trim().toLowerCase() !== email.trim().toLowerCase()
    );
  }, [email, confirmEmail]);

  // подхватываем ref как в обычной реге
  useEffect(() => {
    try {
      const urlRef =
        new URLSearchParams(window.location.search).get('ref') || undefined;
      const lsRef = localStorage.getItem('referralCode') || undefined;
      const ckRef =
        getCookie('jf_ref') || getCookie('ref') || undefined;

      setRefCode(urlRef || lsRef || ckRef || undefined);
    } catch {
      setRefCode(undefined);
    }
  }, []);

  // скролл к ошибке (как в обычной регистрации)
  useEffect(() => {
    if (err) {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        // ignore
      }
    }
  }, [err]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    const normEmail = email.trim().toLowerCase();
    const normConfirmEmail = confirmEmail.trim().toLowerCase();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // валидация как в обычной реге
    if (!username.trim()) {
      setErr('Name is required.');
      return;
    }
    if (!normEmail || !emailRe.test(normEmail)) {
      setErr('Valid email is required.');
      return;
    }
    if (!normConfirmEmail || !emailRe.test(normConfirmEmail)) {
      setErr('Please re-enter a valid email.');
      return;
    }
    if (normEmail !== normConfirmEmail) {
      setErr('Emails do not match.');
      return;
    }

    if (!password) {
      setErr('Password is required.');
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    if (!isStrongPassword(password)) {
      setErr(
        'Password must be at least 10 characters and include upper/lowercase, number and symbol.'
      );
      return;
    }

    if (!websiteUrl.trim() || !urlOk(websiteUrl)) {
      setErr('Valid website URL is required (https://...).');
      return;
    }

    if (!agree) {
      setErr(
        'Please read and agree to the Terms of Service and Privacy Policy.'
      );
      return;
    }

    // Turnstile: если ключ есть, без токена не пускаем
    if (tsSiteKey && !tsToken) {
      setErr('Please complete the security check.');
      return;
    }
    if (tsError) {
      setErr('Security check failed. Please reload the widget and try again.');
      return;
    }

    const trafficSources = trafficSourcesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const promoGeo = promoGeoStr
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    try {
      setBusy(true);

      const payload: any = {
        email: normEmail,
        password,
        username: username.trim(),
        account_type: accountType,
        ...(companyName.trim() && accountType === 'company'
          ? { company_name: companyName.trim() }
          : {}),
        website_url: websiteUrl.trim(),
        ...(country.trim()
          ? { country: country.trim().toUpperCase() }
          : {}),
        ...(trafficSources.length ? { traffic_sources: trafficSources } : {}),
        ...(promoGeo.length ? { promo_geo: promoGeo } : {}),
        ...(monthlyTraffic.trim()
          ? { monthly_traffic: monthlyTraffic.trim() }
          : {}),
        ...(payoutMethod.trim()
          ? { payout_method: payoutMethod.trim() }
          : {}),
        ...(payoutDetails.trim()
          ? { payout_details: payoutDetails.trim() }
          : {}),
        ...(telegram.trim() ? { telegram: telegram.trim() } : {}),
        ...(whatsapp.trim() ? { whatsapp: whatsapp.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(refCode ? { ref: refCode } : {}),
      };

      // ⚠️ Если на бэке будет проверка Turnstile —
      // сюда добавь поле для tsToken ровно так же, как сделаешь в обычной реге.
      // if (tsToken) payload.turnstileToken = tsToken;

      await registerAffiliate(payload);

      toast.success(
        'Registration successful. Please confirm your email.'
      );

      // pending email + роль
      try {
        localStorage.setItem('pendingEmail', normEmail);
        localStorage.setItem('pendingRole', 'affiliate');
      } catch {
        // ignore
      }

      // ===== ref_meta / afterVerifyReturn (как в обычной реге) =====
      let afterReturn: string | undefined;

      // 1) читаем мету рефки, записанную при клике на ссылку
      try {
        const raw = sessionStorage.getItem('ref_meta');
        if (raw) {
          const m = JSON.parse(raw);
          if (!refCode || m.code === refCode) {
            if (m.scope === 'job') {
              afterReturn = m.jobSlug
                ? `/vacancy/${m.jobSlug}`
                : m.jobId
                ? `/vacancy/${m.jobId}`
                : undefined;
            } else if (m.landingPath) {
              afterReturn = m.landingPath;
            }
          }
        }
      } catch {
        // ignore
      }

      // 2) фоллбэк — поддерживаем ?return= как в обычной реге
      if (!afterReturn) {
        const rawReturn =
          new URLSearchParams(window.location.search).get('return') || '';
        try {
          const u = new URL(rawReturn);
          const sameHost =
            u.hostname.toLowerCase() ===
            window.location.hostname.toLowerCase();
          if (sameHost) afterReturn = `${u.pathname}${u.search}`;
        } catch {
          if (rawReturn.startsWith('/') && !rawReturn.startsWith('//')) {
            afterReturn = rawReturn;
          }
        }
      }

      // 3) сохраняем маршрут для экрана подтверждения e-mail
      if (refCode && afterReturn) {
        localStorage.setItem('afterVerifyReturn', afterReturn);
      } else {
        localStorage.removeItem('afterVerifyReturn');
      }

      try {
        sessionStorage.removeItem('ref_meta');
      } catch {
        // ignore
      }

      if (refCode) {
        try {
          localStorage.removeItem('referralCode');
        } catch {
          // ignore
        }
      }

      navigate('/registration-pending', {
        state: { email: normEmail },
      });
    } catch (error: any) {
      console.error('Affiliate register error', error);
      const msg = error?.response?.data?.message;

      if (
        msg?.includes(
          'Account exists but not verified. We sent a new confirmation link.'
        )
      ) {
        navigate('/registration-pending', { state: { email: normEmail } });
        return;
      }

      if (msg === 'Fingerprint is required') {
        setErr(
          'Fingerprint is required. Please refresh the page and try again.'
        );
      } else if (
        error?.response?.status === 403 &&
        msg === 'Registration is not allowed from your country'
      ) {
        setErr('Registration is not allowed from your country.');
      } else if (msg === 'Weak password') {
        setErr('Password does not meet security requirements.');
      } else if (
        msg === 'website_url is required for affiliate registration'
      ) {
        setErr('Website URL is required.');
      } else if (msg === 'Email already exists') {
        setErr('Email already exists.');
      } else {
        setErr(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !busy &&
    !emailsMismatch &&
    agree &&
    (!tsSiteKey || (!!tsToken && !tsError));

  return (
    <div className="reg2-shell">
      <div className="reg2-card">
        <h1 className="reg2-title">Affiliate Registration</h1>

        {err && (
          <div
            className="reg2-toast-fixed"
            role="alert"
            onClick={() => setErr(null)}
          >
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reg2-form">
          {/* Имя / контакт */}
          <div className="reg2-field reg2-span2">
            <label className="reg2-label">Name / contact person</label>
            <input
              className="reg2-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </div>

          {/* Email */}
          <div className="reg2-field">
            <label className="reg2-label">Email</label>
            <input
              className="reg2-input"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value.trim().toLowerCase())
              }
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="off"
              spellCheck={false}
              required
            />
          </div>

          {/* Подтверждение email — без копипаста / вставки */}
          <div className="reg2-field">
            <label className="reg2-label">Confirm Email</label>
            <input
              className="reg2-input"
              type="email"
              value={confirmEmail}
              onChange={(e) =>
                setConfirmEmail(e.target.value.trim().toLowerCase())
              }
              placeholder="Re-enter your email"
              autoComplete="off"
              name="confirm-email"
              inputMode="email"
              autoCapitalize="off"
              spellCheck={false}
              required
              aria-invalid={emailsMismatch || undefined}
              data-invalid={emailsMismatch || undefined}
              onPaste={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
            />
            {emailsMismatch && (
              <div
                className="reg2-hint reg2-hint--err"
                role="alert"
              >
                Emails do not match.
              </div>
            )}
          </div>

          {/* Пароль */}
          <div className="reg2-field">
            <label className="reg2-label">Password</label>
            <div className="reg2-passwrap">
              <input
                className="reg2-input"
                type={seePass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Strong password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="reg2-eye"
                onClick={() => setSeePass((s) => !s)}
                aria-label="Toggle password"
              >
                {seePass ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <PasswordStrength value={password} />
          </div>

          {/* Подтверждение пароля */}
          <div className="reg2-field">
            <label className="reg2-label">Confirm Password</label>
            <div className="reg2-passwrap">
              <input
                className="reg2-input"
                type={seeConf ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="reg2-eye"
                onClick={() => setSeeConf((s) => !s)}
                aria-label="Toggle password"
              >
                {seeConf ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* Website URL */}
          <div className="reg2-field reg2-span2">
            <label className="reg2-label">
              Website URL <span className="reg2-req">*</span>
            </label>
            <input
              className="reg2-input"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://your-traffic-site.com"
              required
            />
            <div className="reg2-note">
              This should be the main site or landing where you plan to send traffic from.
            </div>
          </div>

          {/* Country */}
          <div className="reg2-field">
            <CountrySelect
              value={country || undefined}
              onChange={(code?: string) => setCountry(code ?? '')}
              label="Country"
              placeholder="Start typing a country…"
            />
          </div>

          {/* Account type */}
          <div className="reg2-field">
            <label className="reg2-label">Account type</label>
            <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <input
                  type="radio"
                  checked={accountType === 'individual'}
                  onChange={() => setAccountType('individual')}
                />
                <span>Individual</span>
              </label>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <input
                  type="radio"
                  checked={accountType === 'company'}
                  onChange={() => setAccountType('company')}
                />
                <span>Company</span>
              </label>
            </div>
          </div>

          {/* Company name, если company */}
          {accountType === 'company' && (
            <div className="reg2-field reg2-span2">
              <label className="reg2-label">Company name</label>
              <input
                className="reg2-input"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="My Media LLC"
              />
            </div>
          )}

          {/* Traffic sources */}
          <div className="reg2-field reg2-span2">
            <label className="reg2-label">
              Traffic sources <span className="reg2-opt">(comma separated)</span>
            </label>
            <input
              className="reg2-input"
              type="text"
              value={trafficSourcesStr}
              onChange={(e) => setTrafficSourcesStr(e.target.value)}
              placeholder="SEO, PPC, Social, Email, Influencers…"
            />
          </div>

          {/* Promo GEO */}
          <div className="reg2-field reg2-span2">
            <label className="reg2-label">
              Promo GEO <span className="reg2-opt">(comma separated ISO codes)</span>
            </label>
            <input
              className="reg2-input"
              type="text"
              value={promoGeoStr}
              onChange={(e) => setPromoGeoStr(e.target.value)}
              placeholder="US, CA, UK, AU…"
            />
          </div>

          {/* Monthly traffic */}
          <div className="reg2-field">
            <label className="reg2-label">Monthly traffic</label>
            <input
              className="reg2-input"
              type="text"
              value={monthlyTraffic}
              onChange={(e) => setMonthlyTraffic(e.target.value)}
              placeholder="e.g. 10 000+ visits"
            />
          </div>

          {/* Payout method (select) */}
          <div className="reg2-field">
            <label className="reg2-label">Payout method</label>
            <select
              className="reg2-input"
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
            >
              {PAYOUT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Payout details */}
          <div className="reg2-field reg2-span2">
            <label className="reg2-label">
              Payout details <span className="reg2-opt">(not shown publicly)</span>
            </label>
            <input
              className="reg2-input"
              type="text"
              value={payoutDetails}
              onChange={(e) => setPayoutDetails(e.target.value)}
              placeholder="PayPal email / bank details / wallet address"
            />
          </div>

          {/* Contacts */}
          <div className="reg2-divider reg2-span2">Contacts</div>

          <div className="reg2-field">
            <label className="reg2-label">
              Telegram <span className="reg2-opt">(optional)</span>
            </label>
            <input
              className="reg2-input"
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username or https://t.me/username"
            />
          </div>

          <div className="reg2-field">
            <label className="reg2-label">
              WhatsApp <span className="reg2-opt">(optional)</span>
            </label>
            <input
              className="reg2-input"
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+12025550123"
            />
          </div>

          {/* Notes */}
          <div className="reg2-field reg2-span2">
            <label className="reg2-label">
              Notes <span className="reg2-opt">(optional)</span>
            </label>
            <textarea
              className="reg2-textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Short description of your traffic, verticals and audience."
            />
          </div>

          {/* Turnstile (если siteKey задан) */}
          {tsSiteKey && (
            <div className="reg2-field reg2-span2">
              <label className="reg2-label">Security check</label>
              <Turnstile
                siteKey={tsSiteKey}
                onVerify={(token) => {
                  setTsToken(token);
                  setTsError(false);
                }}
                onError={() => {
                  setTsToken(undefined);
                  setTsError(true);
                }}
                onExpire={() => {
                  setTsToken(undefined);
                  setTsError(false);
                }}
                theme="auto"
              />
              {tsError && (
                <div className="reg2-hint reg2-hint--err">
                  There was an error loading the security widget. Please refresh the page.
                </div>
              )}
            </div>
          )}

          {/* Consent */}
          <div className="reg2-consent reg2-span2">
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <label htmlFor="agree">
              I have read and agree to the{' '}
              <Link
                to="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </Link>{' '}
              and the{' '}
              <Link
                to="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </Link>
              .
            </label>
          </div>

          {/* Submit */}
          <div className="reg2-actions reg2-span2">
            <button
              className="reg2-btn"
              type="submit"
              disabled={!canSubmit}
            >
              {busy ? 'Submitting…' : 'Submit application'}
            </button>
          </div>

          {/* Ссылки как в обычной регистрации */}
          <div className="reg2-links reg2-span2">
            <span>
              Already have an account? <Link to="/login">Login</Link>
            </span>
            <span>
              <Link to="/">Go to Home</Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AffiliateRegister;
