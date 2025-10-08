// components/inputs/CountrySelect.tsx
import React, { useMemo, useState } from 'react';
import '../../styles/country-langs.css';

type Props = {
  value?: string;
  onChange: (code?: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
};

/** Короткий справочник. Можно расширить до полного ISO-3166-1 alpha-2. */
const COUNTRY_CODES = [
  'US','CA','GB','IE','DE','FR','ES','IT','NL','PL','RO','BG','CZ','SK','PT','SE','NO','FI','DK','EE','LV','LT',
  'UA','RU','KZ','TR','AE','SA','IN','PK','BD','PH','TH','VN','MY','SG','ID','HK','TW','KR','JP','AU','NZ',
  'BR','AR','CL','CO','MX','PE','UY','VE','ZA','NG','EG','KE','MA','TN','IL'
];

// Фича-детект без optional chaining на конструкторе
const getRegionName = (() => {
  let formatter: any = null;
  try {
    const DN = (Intl as any).DisplayNames;
    if (typeof DN === 'function') {
      formatter = new DN(['en'], { type: 'region' });
    }
  } catch { /* no-op */ }

  return (code: string) => {
    try {
      return formatter?.of?.(code) || code;
    } catch {
      return code;
    }
  };
})();

const items = COUNTRY_CODES.map(c => ({ code: c, name: getRegionName(c) }));

const CountrySelect: React.FC<Props> = ({
  value,
  onChange,
  label = 'Country (ISO-2)',
  placeholder = 'US, PH, DE…',
  required
}) => {
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(i =>
      i.code.toLowerCase().includes(s) || i.name.toLowerCase().includes(s)
    );
  }, [q]);

  const current = (value ?? '').toUpperCase();

  return (
    <div className="cl-field">
      <label className="cl-label">
        {label}{required ? ' *' : ''}
      </label>

      <div className="cl-combo">
        <input
          className="cl-input"
          type="text"
          value={current}
          onChange={e => {
            const raw = e.target.value.toUpperCase();
            onChange(raw ? raw : undefined); // ← undefined вместо null
          }}
          onBlur={e => {
            const v = e.target.value.toUpperCase();
            if (v && !COUNTRY_CODES.includes(v)) {
              e.target.setCustomValidity('Use ISO-2 code like US, PH, DE');
            } else {
              e.target.setCustomValidity('');
            }
          }}
          placeholder={placeholder}
          maxLength={2}
          inputMode="text"              // ← валидное значение
          autoCapitalize="characters"   // ок как hint
        />

        <input
          className="cl-search"
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or code…"
          inputMode="search"
        />
      </div>

      <div className="cl-list">
        {list.map(i => (
          <button
            key={i.code}
            type="button"
            className={`cl-row ${current === i.code ? 'is-active' : ''}`}
            onClick={() => onChange(i.code)}
            title={i.name}
          >
            <span className="cl-code">{i.code}</span>
            <span className="cl-name">{i.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CountrySelect;
