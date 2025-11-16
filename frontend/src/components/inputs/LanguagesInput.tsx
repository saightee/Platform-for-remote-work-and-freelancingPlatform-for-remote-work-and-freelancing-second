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
  label = 'Languages',
  placeholder = 'English, Spanish…',
}) => {
  const [draft, setDraft] = useState('');

  const exists = (v: string) =>
    (value || []).some((x) => x.toLowerCase() === v.toLowerCase());

  const addOne = (raw: string) => {
    const v = sanitize(raw);
    if (!v || exists(v)) return false;
    onChange([...(value || []), v]);
    return true;
  };

  const add = (raw: string) => {
    if (addOne(raw)) setDraft('');
  };

  const addFromPaste = (text: string) => {
    const tokens = text
      .split(/[,\n;]+/)
      .map(sanitize)
      .filter(Boolean);
    if (!tokens.length) return;
    const acc = [...(value || [])];
    tokens.forEach((t) => {
      if (!acc.some((x) => x.toLowerCase() === t.toLowerCase())) acc.push(t);
    });
    onChange(acc);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
    } else if (e.key === 'Backspace' && draft === '' && (value?.length || 0) > 0) {
      // как в Skills: backspace на пустом поле — удалить последний тег
      e.preventDefault();
      onChange((value || []).slice(0, -1));
    }
  };

  const onBlur: React.FocusEventHandler<HTMLInputElement> = () => {
    if (draft.trim()) add(draft);
  };

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (/[,\n;]/.test(text)) {
      e.preventDefault();
      addFromPaste(text);
      setDraft('');
    }
  };

  const plusDisabled = !sanitize(draft) || exists(sanitize(draft));

  return (
    <div className="reg2-field">
      <label className="reg2-label">{label}</label>

      {/* рамка/поведение как у Skills, но с плюсиком справа */}
      <div className="reg2-auto">
        <div className="reg2-inputwrap">
          <input
            className="reg2-input reg2-input--has-addon"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            onPaste={onPaste}
            placeholder={placeholder}
            autoCapitalize="words"
            autoCorrect="off"
            enterKeyHint="done"
          />
          <button
            type="button"
            className="reg2-addon"
            onClick={() => add(draft)}
            disabled={plusDisabled}
            aria-label="Add language"
            title="Add language"
          >
            +
          </button>
        </div>
      </div>

      {(value || []).length > 0 && (
        <div className="reg2-tags">
          {(value || []).map((l, i) => (
            <span className="reg2-tag" key={`${l}-${i}`}>
              {l}
              <button
                className="reg2-tag__x"
                type="button"
                onClick={() => {
                  const copy = [...(value || [])];
                  copy.splice(i, 1);
                  onChange(copy);
                }}
                aria-label={`Remove ${l}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguagesInput;
