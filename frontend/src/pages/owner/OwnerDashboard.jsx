import { motion } from 'framer-motion';
import { MapPin, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { Stars } from '../../components/ui/Stars.jsx';
import { formatDate, initials } from '../../lib/format.js';

const R = 74;
const C = 2 * Math.PI * R;

function Ring({ value }) {
  return (
    <div className="ring" role="img" aria-label={`Average rating ${value ?? 0} out of 5`}>
      <svg viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={R} className="ring__track" />
        <motion.circle
          cx="90"
          cy="90"
          r={R}
          className="ring__bar"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - (value ?? 0) / 5) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          transform="rotate(-90 90 90)"
        />
      </svg>
      <div className="ring__label">
        <strong className="mono">{value != null ? <AnimatedNumber value={value} decimals={1} /> : '—'}</strong>
        <span>out of 5</span>
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const [sort, setSort] = useState({ sortBy: 'ratedAt', order: 'desc' });
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .get('/owner/dashboard', { params: { ...sort, page, pageSize: 10 }, signal: ctrl.signal })
      .then((r) => setState({ data: r.data, meta: r.meta, loading: false, error: null }))
      .catch((e) => e.name !== 'AbortError' && setState((s) => ({ ...s, loading: false, error: e })));
    return () => ctrl.abort();
  }, [sort, page]);

  const toggleSort = (key) => {
    setSort((s) => (s.sortBy === key ? { sortBy: key, order: s.order === 'asc' ? 'desc' : 'asc' } : { sortBy: key, order: 'asc' }));
    setPage(1);
  };

  const { data, meta, loading, error } = state;

  if (!loading && !error && data && !data.store) {
    return (
      <>
        <PageHeader eyebrow="Your store" title="No store linked yet" />
        <div className="empty">
          <Users size={36} />
          <h3>Waiting on an administrator</h3>
          <p>Your account is set up as a store owner, but no store has been assigned to it. Ask an admin to link one and your ratings will appear here.</p>
        </div>
      </>
    );
  }

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      sortKey: 'name',
      render: (r) => (
        <span className="cell-person">
          <span className="avatar avatar--sm">{initials(r.name)}</span>
          {r.name}
        </span>
      ),
    },
    { key: 'email', header: 'Email', sortKey: 'email' },
    {
      key: 'rating',
      header: 'Rating',
      sortKey: 'rating',
      render: (r) => (
        <span className="cell-rating">
          <Stars value={r.rating} size={14} />
          <span className="mono">{r.rating}</span>
        </span>
      ),
    },
    { key: 'ratedAt', header: 'Rated', sortKey: 'ratedAt', render: (r) => formatDate(r.ratedAt) },
  ];

  return (
    <>
      <PageHeader eyebrow="Your store" title={data?.store?.name ?? 'Loading…'} lede={data?.store && (<span className="inline-icon"><MapPin size={14} /> {data.store.address}</span>)} />

      <motion.section
        className="owner-hero"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Ring value={data?.averageRating} />
        <div className="owner-hero__meta">
          <p className="eyebrow">Average rating</p>
          <Stars value={data?.averageRating ?? 0} size={26} />
          <p className="owner-hero__count">
            Based on <strong className="mono">{data ? <AnimatedNumber value={data.ratingCount} /> : 0}</strong>{' '}
            {data?.ratingCount === 1 ? 'rating' : 'ratings'}
          </p>
        </div>
      </motion.section>

      <h3 className="section-title">Who rated you</h3>
      <DataTable
        columns={columns}
        rows={data?.raters ?? []}
        loading={loading}
        error={error}
        sort={sort}
        onSort={toggleSort}
        meta={meta}
        onPage={setPage}
        empty="No one has rated your store yet."
      />
    </>
  );
}
