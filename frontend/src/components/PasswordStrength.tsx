import React from 'react';
import '../styles/PasswordStrength.css';

export const isStrongPassword = (pw: string): boolean => {
  return (
    typeof pw === 'string' &&
    pw.length >= 10 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
};

interface Props {
  value: string;
}

const PasswordStrength: React.FC<Props> = ({ value }) => {
  const checks = [
    { label: 'At least 10 characters', ok: value.length >= 10 },
    { label: 'Lowercase letter', ok: /[a-z]/.test(value) },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(value) },
    { label: 'Digit', ok: /\d/.test(value) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(value) },
  ];

  const passed = checks.filter(c => c.ok).length;
  const percent = Math.round((passed / checks.length) * 100);

  return (
    <div className="password-strength">
      <div className="progress-bar">
        <div
          className={`progress-fill ${percent === 100 ? 'strong' : percent >= 60 ? 'medium' : 'weak'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <ul className="criteria-list">
        {checks.map(c => (
          <li key={c.label} className={c.ok ? 'ok' : 'fail'}>
            {c.ok ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PasswordStrength;
