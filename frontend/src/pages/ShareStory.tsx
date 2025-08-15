import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { submitPlatformFeedback } from '../services/api'; // /platform-feedback { rating, description }
import '../styles/contact-support.css';

type RoleOpt = 'Employer' | 'Jobseeker';

const ShareStory: React.FC = () => {
  const [headline, setHeadline] = useState('');
  const [story, setStory] = useState('');
  const [role, setRole] = useState<RoleOpt | ''>('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('');
  const [consent, setConsent] = useState(false);
  const [rating, setRating] = useState<number>(5); // ⭐ селектор звёзд

  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const validate = () => {
    const h = headline.trim();
    const s = story.trim();
    if (!role) return 'Please select your role.';
    if (h.length < 5 || h.length > 120) return 'Headline must be 5–120 characters.';
    if (s.length < 50 || s.length > 2000) return 'Story must be 50–2000 characters.';
    if (!consent) return 'Please allow us to publish your story.';
    if ([headline, story, company, country].some(v => /<[^>]*>/.test(v))) return 'HTML is not allowed.';
    if (rating < 1 || rating > 5) return 'Rating must be between 1 and 5.';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null); setErr(null);
    const v = validate();
    if (v) { setErr(v); return; }

    // Склеиваем в description для /api/platform-feedback
    const description = [
      `Role: ${role}`,
      company.trim() && `Company: ${company.trim()}`,
      country.trim() && `Country: ${country.trim()}`,
      `Headline: ${headline.trim()}`,
      '',
      story.trim(),
    ].filter(Boolean).join('\n');

    try {
      setSubmitting(true);
      await submitPlatformFeedback(rating, description); // <= rating + description
      setOk('Thanks for sharing! Your story is submitted for review.');
      setHeadline('');
      setStory('');
      setRole('');
      setCompany('');
      setCountry('');
      setConsent(false);
      setRating(5);
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to submit your story.';
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Header />
      <div className="cs-shell">
        <div className="cs-card">
          <h1 className="cs-title">Share Your Success</h1>
          <p className="cs-subtitle">Tell others how Jobforge helped — the best stories get featured.</p>

          {ok && <div className="cs-alert cs-ok">{ok}</div>}
          {err && <div className="cs-alert cs-err">{err}</div>}

          <form className="cs-form" onSubmit={onSubmit} noValidate>
            <div className="cs-row">
              <label className="cs-label">Your role</label>
              <select
                className="cs-input"
                value={role}
                onChange={(e) => setRole(e.target.value as RoleOpt | '')}
                required
              >
                <option value="">Choose…</option>
                <option value="Employer">Employer</option>
                <option value="Jobseeker">Jobseeker</option>
              </select>
            </div>

            <div className="cs-row">
              <label className="cs-label">Headline</label>
              <input
                className="cs-input"
                placeholder="E.g., Found our perfect VA in 48 hours"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                required
                maxLength={120}
              />
              <div className="cs-hint">{headline.trim().length}/120</div>
            </div>

            <div className="cs-row">
              <label className="cs-label">Your story</label>
              <textarea
                className="cs-textarea"
                rows={6}
                placeholder="What challenge did you have? How did Jobforge help? What results did you get?"
                value={story}
                onChange={(e) => setStory(e.target.value)}
                required
                maxLength={2000}
              />
              <div className="cs-hint">{story.trim().length}/2000</div>
            </div>

            <div className="cs-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label className="cs-label" style={{ marginBottom: 0 }}>Rating</label>
              <div aria-label="rating" style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(star => (
                  <span
                    key={star}
                    role="button"
                    onClick={() => setRating(star)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setRating(star)}
                    tabIndex={0}
                    style={{
                      fontSize: 20,
                      lineHeight: 1,
                      cursor: 'pointer',
                      userSelect: 'none',
                      filter: star <= rating ? 'none' : 'grayscale(100%) opacity(0.5)',
                      transition: 'transform .05s ease',
                    }}
                    title={`${star} star${star>1?'s':''}`}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <div className="cs-row" style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <input
                id="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <label className="cs-label" htmlFor="consent" style={{ fontWeight: 500 }}>
                I allow Jobforge to publish my story on the site.
              </label>
            </div>

            <div className="cs-row">
              <label className="cs-label">Company (optional)</label>
              <input
                className="cs-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="cs-row">
              <label className="cs-label">Country (optional)</label>
              <input
                className="cs-input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={80}
              />
            </div>

            <button className="cs-button" type="submit" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit story'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default ShareStory;
