// components/inputs/LanguagesInput.tsx
import React, { useState } from 'react';
import '../../styles/country-langs.css';

type Props = {
  value?: string[] | null;
  onChange: (langs: string[]) => void;
  label?: string;
  placeholder?: string;
};

const sanitize = (s: string) => s.replace(/\s+/g, ' ').trim();

const LanguagesInput: React.FC<Props> = ({
  value = [],
  onChange,
  label = 'Languages (multiple)',
  placeholder = 'English, Spanish…'
}) => {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const v = sanitize(raw);
    if (!v) return;
    const exists = (value || []).some(x => x.toLowerCase() === v.toLowerCase());
    if (!exists) onChange([...(value || []), v]);
    setDraft('');
  };

  const remove = (idx: number) => {
    const copy = [...(value || [])];
    copy.splice(idx, 1);
    onChange(copy);
  };

  return (
<div className="cl-field">
  <label className="reg2-label">{label}</label>
  <div className="cl-tags">

    {(value || []).map((l, i) => (
      <span className="cl-tag" key={`${l}-${i}`}>
        {l}
        <button className="cl-x" type="button" onClick={() => remove(i)} aria-label={`Remove ${l}`}>×</button>
      </span>
    ))}

    {/* ввод без рамки */}
    <input
      className="cl-chip-input"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      placeholder={placeholder}
    />

    {/* ПЛЮСИК — основной способ добавления */}
    <button
      type="button"
      className="cl-add"
      onClick={() => add(draft)}
      aria-label="Add language"
    >
      +
    </button>
  </div>

  
</div>

  );
};

export default LanguagesInput;
