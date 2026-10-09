import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownAZ, ChevronLeft, ChevronRight, MapPin, Search, SearchX } from 'lucide-react';
import { api } from '../../api/client.js';
import { PageHeader } from '../../components/ui/PageHeader.jsx';
import { StarInput, Stars } from '../../components/ui/Stars.jsx';
import { Tilt } from '../../components/ui/Tilt.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useList } from '../../hooks/useList.js';
import { formatRating } from '../../lib/format.js';

const SORTS = [
  { value: 'name:asc', label: 'Name, A–Z' },
  { value: 'name:desc', label: 'Name, Z–A' },
  { value: 'rating:desc', label: 'Highest rated' },
  { value: 'rating:asc', label: 'Lowest rated' },
  { value: 'address:asc', label: 'Address, A–Z' },
];

function StoreCard({ store, onRate, index }) {
  const [saving, setSaving] = useState(false);
  const rated = store.myRating != null;

  const rate = async (n) => {
    setSaving(true);
    await onRate(store, n);
    setSaving(false);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Tilt className="store-card" max={5}>
        <div className="store-card__top">
          <h3>{store.name}</h3>
          <p className="store-card__addr">
            <MapPin size={14} /> {store.address}
          </p>
        </div>

        <div className="store-card__score">
          <span className="store-card__big mono">{formatRating(store.overallRating)}</span>
          <div>
            <Stars value={store.overallRating ?? 0} size={16} />
            <p className="muted">
              {store.ratingCount ? `${store.ratingCount} rating${store.ratingCount > 1 ? 's' : ''}` : 'Be the first to rate'}
            </p>
          </div>
        </div>

        <div className="store-card__mine">
          <p className="store-card__mine-label">
            {rated ? (
              <>
                Your rating: <strong>{store.myRating}</strong> · tap to change
              </>
            ) : (
              'Rate this store'
            )}
          </p>
          <StarInput name={`rate-${store.id}`} value={store.myRating} onChange={rate} disabled={saving} />
        </div>
      </Tilt>
    </motion.li>
  );
}

export default function Discover() {
  const toast = useToast();
  const list = useList('/stores', { defaultSort: 'name', pageSize: 9, initialFilters: { q: '' } });
  const { patchItem } = list;

  const onRate = async (store, rating) => {
    const before = { myRating: store.myRating, overallRating: store.overallRating, ratingCount: store.ratingCount };
    patchItem(store.id, { myRating: rating });
    try {
      const r = await api.put(`/stores/${store.id}/rating`, { rating });
      patchItem(store.id, r.data);
      toast.success(before.myRating ? 'Rating updated' : 'Thanks for rating!');
    } catch (err) {
      patchItem(store.id, before);
      toast.error(err.message);
    }
  };

  const sortValue = `${list.sort.sortBy}:${list.sort.order}`;
  const { meta } = list;

  return (
    <>
      <PageHeader eyebrow="Discover" title="Find a store, leave a rating." lede="Search by name or address. Your rating can be changed any time." />

      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <span className="sr-only">Search stores by name or address</span>
          <input value={list.filters.q} onChange={(e) => list.setFilter('q', e.target.value)} placeholder="Search by name or address…" type="search" />
        </label>
        <label className="filter filter--select">
          <ArrowDownAZ size={16} />
          <span className="sr-only">Sort stores</span>
          <select
            value={sortValue}
            onChange={(e) => {
              const [sortBy, order] = e.target.value.split(':');
              list.setSort({ sortBy, order });
              list.setPage(1);
            }}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {list.error && (
        <p className="form__error" role="alert">
          {list.error.message}
        </p>
      )}

      {list.loading && !list.items.length ? (
        <ul className="store-grid" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="store-card store-card--skeleton">
              <span className="skeleton" style={{ height: 24, width: '70%' }} />
              <span className="skeleton" style={{ height: 14, width: '50%' }} />
              <span className="skeleton" style={{ height: 56, width: '100%', marginTop: 18 }} />
            </li>
          ))}
        </ul>
      ) : list.items.length ? (
        <ul className={`store-grid ${list.loading ? 'is-refreshing' : ''}`}>
          <AnimatePresence mode="popLayout">
            {list.items.map((s, i) => (
              <StoreCard key={s.id} store={s} index={i} onRate={onRate} />
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        !list.error && (
          <div className="empty">
            <SearchX size={36} />
            <h3>No stores found</h3>
            <p>{list.filters.q ? `Nothing matches “${list.filters.q}”. Try a different name or area.` : 'No stores have been added yet.'}</p>
          </div>
        )
      )}

      {meta && meta.totalPages > 1 && (
        <nav className="pager pager--center" aria-label="Pagination">
          <button className="icon-btn" disabled={meta.page <= 1} onClick={() => list.setPage(meta.page - 1)} aria-label="Previous page">
            <ChevronLeft size={18} />
          </button>
          <span className="mono">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button className="icon-btn" disabled={meta.page >= meta.totalPages} onClick={() => list.setPage(meta.page + 1)} aria-label="Next page">
            <ChevronRight size={18} />
          </button>
        </nav>
      )}
    </>
  );
}
