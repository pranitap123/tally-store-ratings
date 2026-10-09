import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

function Shell({ id, label, hint, error, children }) {
  return (
    <div className={`field ${error ? 'field--error' : ''}`}>
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      {children}
      {error ? (
        <p className="field__msg field__msg--error" id={`${id}-err`} role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="field__msg">{hint}</p>
      )}
    </div>
  );
}

export const TextField = forwardRef(function TextField({ label, hint, error, type = 'text', ...rest }, ref) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';

  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <div className="field__control">
        <input
          id={id}
          ref={ref}
          type={isPassword && shown ? 'text' : type}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            className="field__eye"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? 'Hide password' : 'Show password'}
          >
            {shown ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </Shell>
  );
});

export const TextArea = forwardRef(function TextArea({ label, hint, error, ...rest }, ref) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <div className="field__control">
        <textarea id={id} ref={ref} rows={3} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...rest} />
      </div>
    </Shell>
  );
});

export const SelectField = forwardRef(function SelectField({ label, hint, error, children, ...rest }, ref) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <div className="field__control">
        <select id={id} ref={ref} aria-invalid={!!error} {...rest}>
          {children}
        </select>
      </div>
    </Shell>
  );
});
