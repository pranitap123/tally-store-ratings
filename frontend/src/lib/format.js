export const ROLE_LABEL = {
  ADMIN: 'Administrator',
  USER: 'Customer',
  STORE_OWNER: 'Store owner',
};

export const formatRating = (n) => (n == null ? '—' : Number(n).toFixed(1));

export const formatDate = (iso) =>
  iso ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—';

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/** Home route per role — used after login and by the route guards. */
export const homeFor = (role) =>
  ({ ADMIN: '/admin', USER: '/stores', STORE_OWNER: '/owner' })[role] ?? '/login';
