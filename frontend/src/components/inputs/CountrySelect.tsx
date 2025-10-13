import React, { useMemo, useState, useRef, useEffect } from 'react';
import '../../styles/country-langs.css';

type Props = {
  value?: string;                     // ISO-2
  onChange: (code?: string) => void;  // отдаем только ISO-2
  label?: string;
  placeholder?: string;
  required?: boolean;
};

/* расширил список: добавил, в т.ч., PH и др. (можно дополнять) */
const ISO2 = [
  'US','CA','GB','IE','DE','FR','ES','IT','NL','PL','RO','BG','CZ','SK','PT','SE','NO','FI','DK','EE','LV','LT',
  'UA','RU','KZ','TR','AE','SA','IN','PK','BD','PH','TH','VN','MY','SG','ID','HK','TW','KR','JP','AU','NZ',
  'BR','AR','CL','CO','MX','PE','UY','VE','ZA','NG','EG','KE','MA','TN','IL','GE','AM','AZ','GR','HU','RS','BA',
  'AL','MK','MD','SI','HR','CH','AT','BE','LU','LI','IS','MT','CY','QA','KW','OM','BH','JO','PS','IR','IQ','LK',
  'MM','KH','LA','NP','BT','MN','ET','TZ','GH','CM','CI','SN','DZ','LY','SD','AO','MZ','BW','ZW','NA','ZM','UG'
];

const regionName = (() => {
  try {
    const DN = (Intl as any).DisplayNames;
    const f = new DN(['en'], { type: 'region' });
    return (c: string) => f?.of?.(c) || c;
  } catch { return (c: string) => c; }
})();

const ALL = ISO2.map(code => ({ code, name: regionName(code) }));

const CountrySelect: React.FC<Props> = ({
  value,
  onChange,
  label = 'Country',
  placeholder = 'Start typing a country…',
  required
}) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ALL;
    return ALL.filter(i =>
      i.name.toLowerCase().includes(s) || i.code.toLowerCase().includes(s)
    );
  }, [q]);

  // закрытие по клику вне
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const curr = (value || '').toUpperCase();
  const currName = curr ? regionName(curr) : '';

  return (
    <div className="cl-field" ref={wrapRef}>
     <label className="reg2-label">
  {label}{required ? ' *' : ''}
</label>


      {/* одно поле: показывает человеко-читаемое имя, хранит ISO-2 в value пропе */}
    <input
  className="reg2-input"
  value={q || currName}
  onChange={e => { setQ(e.target.value); setOpen(true); }}
  onFocus={() => setOpen(true)}
  placeholder={placeholder}
  aria-expanded={open}
  aria-haspopup="listbox"
/>

{open && (
  <div className="cl-dd" role="listbox">
    {list.map(i => (
      <button
        key={i.code}
        type="button"
        className={`cl-row ${i.code === curr ? 'is-active' : ''}`}
        onClick={() => { onChange(i.code); setQ(''); setOpen(false); }}
        title={i.name}
        role="option"
        aria-selected={i.code === curr}
      >
        <span className="cl-code">{i.code}</span>
        <span className="cl-name">{i.name}</span>
      </button>
    ))}
    {list.length === 0 && <div className="cl-empty">Nothing found</div>}
  </div>
)}

    </div>
  );
};

export default CountrySelect;
