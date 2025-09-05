import React, { useEffect, useRef, useState } from 'react';

type RatingPickerProps = {
  value: number;                 // 1..5
  onChange: (v: number) => void;
  className?: string;            // опционально для твоих стилей
};

const RatingPicker: React.FC<RatingPickerProps> = ({ value, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // закрыть при клике вне
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const renderStars = (n: number) => Array.from({ length: 5 }, (_, i) => (i < n ? '★' : '☆')).join('');

  const setVal = (n: number) => {
    onChange(n);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onChange(Math.min(5, value + 1));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onChange(Math.max(1, value - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  return (
    <div ref={ref} className={`cs-rating ${className ?? ''}`}>
      <button
        type="button"
        className="cs-rating-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Rating ${value} out of 5`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className="cs-rating-icon">★</span>
        <span className="cs-rating-text">{value} / 5</span>
      </button>

      {open && (
        <ul className="cs-rating-menu" role="listbox" aria-label="Select rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <li
              key={n}
              role="option"
              aria-selected={value === n}
              className={`cs-rating-option ${value === n ? 'is-active' : ''}`}
              // mousedown, чтобы не терять фокус до onClick
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setVal(n)}
            >
              <span className="cs-rating-stars">{renderStars(n)}</span>
              <span className="cs-rating-number">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RatingPicker;
