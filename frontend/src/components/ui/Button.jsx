import { Loader2 } from 'lucide-react';

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className = '', ...rest }) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="spin" /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
