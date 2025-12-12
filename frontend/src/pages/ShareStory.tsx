import React, { useState } from 'react';
import Footer from '../components/Footer';
import RatingPicker from '../components/RatingPicker';
import { submitSuccessStory } from '../services/api';
import '../styles/contact-support.css';
import { brand } from '../brand';

type ShareStoryProps = {
  embedded?: boolean;
};

const ShareStory: React.FC<ShareStoryProps> = ({ embedded }) => {
  const [headline, setHeadline] = useState('');
  const [story, setStory] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('');
  const [allowPublish, setAllowPublish] = useState(false);
  const [rating, setRating] = useState<number>(5);

  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const validate = () => {
    const h = headline.trim();
    const s = story.trim();
    if (h.length < 5 || h.length > 120) {
      return 'Headline must be 5–120 characters.';
    }
    if (s.length < 50 || s.length > 2000) {
      return 'Story must be 50–2000 characters.';
    }
    if ([headline, story, company, country].some(v => /<[^>]*>/.test(v))) {
      return 'HTML is not allowed.';
    }
    if (rating < 1 || rating > 5) {
      return 'Rating must be between 1 and 5.';
    }
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
      await submitSuccessStory({
        headline: headline.trim(),
        story: story.trim(),
        rating,
        allow_publish: allowPublish,
        company: company.trim() || undefined,
        country: country.trim() || undefined,
      });
      setOk('Thanks for sharing! Your story is submitted for review.');
      setHeadline('');
      setStory('');
      setCompany('');
      setCountry('');
      setAllowPublish(false);
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
      <div className="cs-shell">
        <div className="cs-card">
          <h1 className="cs-title">Share Your Success</h1>
          <p className="cs-subtitle">
            Tell others how {brand.name} helped — the best stories get featured.
          </p>

          {ok && <div className="cs-alert cs-ok">{ok}</div>}
          {err && <div className="cs-alert cs-err">{err}</div>}

          <form className="cs-form" onSubmit={onSubmit} noValidate>
            <div className="cs-row">
              <label className="cs-label">Headline</label>
              <input
                className="cs-input"
                placeholder="E.g. Found our perfect VA in 48 hours"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
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
                placeholder={`What challenge did you have? How did ${brand.name} help? What results did you get?`}
                value={story}
                onChange={e => setStory(e.target.value)}
                required
                maxLength={2000}
              />
              <div className="cs-hint">{story.trim().length}/2000</div>
            </div>

            <div
              className="cs-row"
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <label className="cs-label">Rating</label>
              <RatingPicker value={rating} onChange={setRating} />
            </div>

            <div className="cs-row">
              <label className="cs-label">Company (optional)</label>
              <input
                className="cs-input"
                value={company}
                onChange={e => setCompany(e.target.value)}
              />
            </div>

            <div className="cs-row">
              <label className="cs-label">Country (optional)</label>
              <input
                className="cs-input"
                value={country}
                onChange={e => setCountry(e.target.value)}
              />
            </div>

            <div
              className="cs-row"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <input
                id="allowPublish"
                className="cs-label-check"
                type="checkbox"
                checked={allowPublish}
                onChange={e => setAllowPublish(e.target.checked)}
              />
              <label htmlFor="allowPublish" className="cs-label">
                I allow publishing my story
              </label>
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

export default ShareStory;
