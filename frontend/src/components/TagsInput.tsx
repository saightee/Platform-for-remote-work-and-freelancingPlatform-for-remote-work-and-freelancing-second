import React, { useState } from 'react';
import '../styles/public-profile.css';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

const TagsInput: React.FC<Props> = ({ value, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    // уникально, без пустых
    const set = new Set(value.map(s => s.trim()).filter(Boolean));
    set.add(v);
    onChange(Array.from(set));
    setDraft('');
  };

  return (
    <div className="pf-tags-input">
      <div className="pf-tags">
        {value.map((t, i) => (
          <span key={`${t}-${i}`} className="pf-tag">
            {t}
            <button
              type="button"
              className="pf-tag-x"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              aria-label={`Remove ${t}`}
            >×</button>
          </span>
        ))}
      </div>

      <div className="pf-tags-input-row">
        <input
          className="pf-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder || 'Type language and press Enter'}
        />
        <button type="button" className="pf-button pf-secondary" onClick={add}>Add</button>
      </div>
      <p className="pf-help">English, Spanish, German...</p>
    </div>
  );
};

export default TagsInput;
