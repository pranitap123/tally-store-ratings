export function Logo({ size = 34, withWord = true }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="var(--ink)" />
        <path
          d="M32 11l6.6 13.4 14.8 2.1-10.7 10.4 2.5 14.7L32 44.7l-13.2 6.9 2.5-14.7L10.6 26.5l14.8-2.1z"
          fill="var(--accent)"
        />
      </svg>
      {withWord && <span className="logo__word">tally</span>}
    </span>
  );
}
