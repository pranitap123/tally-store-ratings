import { useState } from 'react';
import { motion } from 'framer-motion';

const STAR = 'M12 2.2l2.9 6.1 6.7.9-4.9 4.7 1.2 6.6L12 17.2l-5.9 3.3 1.2-6.6L2.4 9.2l6.7-.9z';

function Star({ fill = 0, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="star">
      <defs>
        <clipPath id={`clip-${Math.round(fill * 100)}`}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <path d={STAR} fill="var(--star-off)" />
      <path d={STAR} fill="var(--star)" clipPath={`url(#clip-${Math.round(fill * 100)})`} />
    </svg>
  );
}

/** Read-only, supports fractional values (4.3 fills 30% of the fifth star). */
export function Stars({ value = 0, size = 18, label }) {
  const v = Number(value) || 0;
  return (
    <span className="stars" role="img" aria-label={label ?? `${v.toFixed(1)} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} fill={Math.max(0, Math.min(1, v - i))} />
      ))}
    </span>
  );
}

/** Interactive 1–5 picker. Arrow keys work because it's a radio group underneath. */
export function StarInput({ value, onChange, disabled, size = 26, name }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;

  return (
    <div className="star-input" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="star-input__item" onMouseEnter={() => !disabled && setHover(n)}>
          <input
            type="radio"
            name={name}
            value={n}
            checked={value === n}
            disabled={disabled}
            onChange={() => onChange(n)}
            className="sr-only"
          />
          <motion.span
            animate={{ scale: shown >= n ? 1 : 0.88, rotate: shown >= n ? 0 : -8 }}
            whileTap={{ scale: 1.3 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            className="star-input__star"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star size={size} fill={shown >= n ? 1 : 0} />
          </motion.span>
        </label>
      ))}
    </div>
  );
}
