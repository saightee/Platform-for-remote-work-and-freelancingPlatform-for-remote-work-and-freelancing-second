import React, { useState } from 'react';
import Footer from '../components/Footer';
import { submitIssueFeedback } from '../services/api';
import '../styles/contact-support.css';

type ReportIssueProps = {
  embedded?: boolean;
};

const ReportIssue: React.FC<ReportIssueProps> = ({ embedded }) => {
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
    setOk(null);
    setErr(null);
    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    try {
      setSubmitting(true);
      await submitIssueFeedback({
        category: category as 'Bug' | 'UI' | 'Performance' | 'Data' | 'Other',
        summary: summary.trim(),
        steps_to_reproduce: steps.trim() || undefined,
        expected_result: expected.trim() || undefined,
        actual_result: actual.trim() || undefined,
      });
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
      <div className="cs-shell">
        <div className="cs-card">
          <h1 className="cs-title">Report a Technical Issue</h1>
          <p className="cs-subtitle">
            Tell us what went wrong — we’ll route it to the team.
          </p>

          {ok && <div className="cs-alert cs-ok">{ok}</div>}
          {err && <div className="cs-alert cs-err">{err}</div>}

          <form className="cs-form" onSubmit={onSubmit} noValidate>
            <div className="cs-row">
              <label className="cs-label">Category</label>
              <div className="cs-select" style={{ ['--cs-arrow-gap' as any]: '22px' }}>
                <select
                  id="cs-category"
                  className="cs-input cs-select__el"
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
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
            </div>

            <div className="cs-row">
              <label className="cs-label">Summary</label>
              <input
                className="cs-input"
                placeholder="Short description (1–2 sentences)"
                value={summary}
                onChange={e => setSummary(e.target.value)}
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
                onChange={e => setSteps(e.target.value)}
              />
            </div>

            <div className="cs-row">
              <label className="cs-label">Expected (optional)</label>
              <textarea
                className="cs-textarea"
                rows={3}
                value={expected}
                onChange={e => setExpected(e.target.value)}
              />
            </div>

            <div className="cs-row">
              <label className="cs-label">Actual (optional)</label>
              <textarea
                className="cs-textarea"
                rows={3}
                value={actual}
                onChange={e => setActual(e.target.value)}
              />
            </div>

            <div className="cs-actions">
              <button className="cs-button" disabled={submitting}>
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>

      {!embedded && <Footer />}
    </div>
  );
};

export default ReportIssue;
