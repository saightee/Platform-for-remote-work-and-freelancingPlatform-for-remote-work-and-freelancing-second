import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { submitFeedback } from '../services/api';
import '../styles/contact-support.css';

const ReportIssue: React.FC = () => {
  const [category, setCategory] = useState<'' | 'Bug' | 'UI' | 'Performance' | 'Data' | 'Other'>('');
  const [summary, setSummary] = useState('');
  const [steps, setSteps] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const validate = () => {
    if (!category) return 'Please choose a category.';
    const s = summary.trim();
    if (s.length < 10 || s.length > 200) return 'Summary must be 10–200 characters.';
    if ([summary, steps, expected, actual].some(v => /<[^>]*>/.test(v))) return 'HTML is not allowed.';
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null); setErr(null);
    const v = validate();
    if (v) { setErr(v); return; }

    // Склеиваем всё в одно сообщение для /api/feedback
    const parts = [
      `Category: ${category}`,
      `Summary: ${summary.trim()}`,
      steps.trim() && `Steps to reproduce:\n${steps.trim()}`,
      expected.trim() && `Expected:\n${expected.trim()}`,
      actual.trim() && `Actual:\n${actual.trim()}`,
      [
        'Context:',
        `- URL: ${window.location.href}`,
        `- UA: ${navigator.userAgent}`,
        `- Locale: ${navigator.language}`,
        `- TZ: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
      ].join('\n'),
    ].filter(Boolean) as string[];

    const message = parts.join('\n\n');

    try {
      setSubmitting(true);
      await submitFeedback(message); // <= /api/feedback { message }
      setOk('Thanks! Your report has been submitted.');
      setCategory('');
      setSummary('');
      setSteps('');
      setExpected('');
      setActual('');
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Failed to submit the issue.';
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
          <h1 className="cs-title">Report a Technical Issue</h1>
          <p className="cs-subtitle">Tell us what went wrong — we’ll route it to the team.</p>

          {ok && <div className="cs-alert cs-ok">{ok}</div>}
          {err && <div className="cs-alert cs-err">{err}</div>}

          <form className="cs-form" onSubmit={onSubmit} noValidate>
            <div className="cs-row">
              <label className="cs-label">Category</label>
              <select
                className="cs-input"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                required
              >
                <option value="">Choose…</option>
                <option value="Bug">Bug</option>
                <option value="UI">UI</option>
                <option value="Performance">Performance</option>
                <option value="Data">Data</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="cs-row">
              <label className="cs-label">Summary</label>
              <input
                className="cs-input"
                placeholder="Short description (1–2 sentences)"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
                maxLength={200}
              />
              <div className="cs-hint">{summary.trim().length}/200</div>
            </div>

            <div className="cs-row">
              <label className="cs-label">Steps to Reproduce (optional)</label>
              <textarea
                className="cs-textarea"
                rows={4}
                placeholder={`1) …\n2) …\n3) …`}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                maxLength={2000}
              />
            </div>

            <div className="cs-row">
              <label className="cs-label">Expected result (optional)</label>
              <input
                className="cs-input"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                maxLength={300}
              />
            </div>

            <div className="cs-row">
              <label className="cs-label">Actual result (optional)</label>
              <input
                className="cs-input"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                maxLength={300}
              />
            </div>

            <button className="cs-button" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Submit report'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default ReportIssue;
