// src/pages/ContactSupport.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { contactSupport, getProfile } from '../services/api';
import Turnstile from '../components/Turnstile';          // 👈 заменили
import '../styles/contact-support.css';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY; // 👈

const ContactSupport: React.FC = () => {
  const location = useLocation();
  const embedded = useMemo(
    () =>
      location.pathname.startsWith('/employer-dashboard') ||
      location.pathname.startsWith('/jobseeker-dashboard'),
    [location.pathname]
  );

  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);         // 👈 авторизован ли юзер

  // автозаполнение для авторизованных
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    (async () => {
      try {
        const p = await getProfile();
        setIsAuthed(true);                                  // 👈 гость/не гость
        setForm(f => ({
          ...f,
          name: p.username || f.name,
          email: (p as any).email || f.email,
        }));
      } catch {
        setIsAuthed(false);
      }
    })();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const n = form.name.trim();
    const em = form.email.trim();
    const msg = form.message.trim();
    if (n.length < 2 || n.length > 100) return 'Name must be 2–100 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || em.length > 254) return 'Invalid email';
    if (msg.length < 10 || msg.length > 2000) return 'Message must be 10–2000 characters';
    if (/https?:\/\/|www\.|<[^>]*>/.test(msg)) return 'Links and HTML are not allowed';
    if (form.website && form.website.trim() !== '') return 'Forbidden'; // honeypot
    // Требуем капчу только для гостей и только если site key задан
    if (!isAuthed && SITE_KEY && !captchaToken) return 'Please complete the CAPTCHA';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null); setErr(null);
    const v = validate();
    if (v) { setErr(v); return; }

    try {
      setSubmitting(true);
      await contactSupport({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        captchaToken: !isAuthed ? captchaToken : undefined,   // 👈 гость — отправляем
        website: '',                                          // honeypot
      });
      setOk('Your message has been sent. We’ll get back to you soon.');
      setForm({ name: '', email: '', message: '', website: '' });
      setCaptchaToken(undefined);
    } catch (e: any) {
      const msg =
        e?.response?.status === 429 ? 'Too many requests. Please try again later.' :
        e?.response?.status === 403 ? 'Captcha or honeypot failed.' :
        e?.response?.data?.message || 'Failed to send message.';
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {!embedded && <Header />}
      <div className="cs-shell">
        <div className="cs-card">
          <h1 className="cs-title">Contact Support</h1>
          <p className="cs-subtitle">Have a question? Send us a message and we’ll respond by email.</p>

          {ok && <div className="cs-alert cs-ok">{ok}</div>}
          {err && <div className="cs-alert cs-err">{err}</div>}

          <form className="cs-form" onSubmit={onSubmit} noValidate>
            <div className="cs-row">
              <label className="cs-label">Your name</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                className="cs-input"
                placeholder="Jane Doe"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </div>

            <div className="cs-row">
              <label className="cs-label">Email</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                className="cs-input"
                placeholder="jane@example.com"
                required
                maxLength={254}
                autoComplete="email"
              />
            </div>

            <div className="cs-row">
              <label className="cs-label">Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={onChange}
                className="cs-textarea"
                placeholder="How can we help you?"
                rows={6}
                required
                maxLength={2000}
              />
              <div className="cs-hint">No links or HTML allowed.</div>
            </div>

            {/* Honeypot — скрыто */}
            <input
              name="website"
              value={form.website}
              onChange={onChange}
              className="cs-honeypot"
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
            />

            {/* Turnstile — показываем только гостям и только если есть site key */}
            {!isAuthed && SITE_KEY && (
              <div style={{ margin: '8px 0 16px' }}>
                <Turnstile
                  siteKey={SITE_KEY}
                  onVerify={(t) => setCaptchaToken(t)}
                  onExpire={() => setCaptchaToken(undefined)}
                  onError={() => setCaptchaToken(undefined)}
                  theme="auto"
                />
              </div>
            )}

            <button className="cs-button" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send message'}
            </button>
          </form>
        </div>
      </div>

      {!embedded && <>
        <Footer />
        <Copyright />
      </>}
    </div>
  );
};

export default ContactSupport;
