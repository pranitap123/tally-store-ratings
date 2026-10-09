import { Check, Circle } from 'lucide-react';
import { passwordChecks } from '../../lib/validation.js';

export function PasswordMeter({ value }) {
  const checks = passwordChecks(value);
  const score = checks.filter((c) => c.ok).length;
  return (
    <div className="pw-meter" aria-live="polite">
      <div className="pw-meter__bars" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={score >= n ? `on on--${score}` : ''} />
        ))}
      </div>
      <ul>
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? 'ok' : ''}>
            {c.ok ? <Check size={13} /> : <Circle size={13} />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
