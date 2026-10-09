import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useDebounced } from './useDebounced.js';

/**
 * Server-driven list state: filters, sort, page → fetch. Stale responses are aborted,
 * filter edits are debounced and send the user back to page 1.
 * `loading` is derived (the stored result belongs to a different request key), so no
 * setState runs synchronously inside the effect.
 */
export function useList(path, { defaultSort, defaultOrder = 'asc', pageSize = 10, initialFilters = {} } = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState({ sortBy: defaultSort, order: defaultOrder });
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, items: [], meta: null, error: null });

  const debounced = useDebounced(filters, 300);
  const key = JSON.stringify([path, debounced, sort, page, pageSize, tick]);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .get(path, { params: { ...debounced, ...sort, page, pageSize }, signal: ctrl.signal })
      .then((r) => setResult({ key, items: r.data, meta: r.meta, error: null }))
      .catch((err) => {
        if (err.name !== 'AbortError') setResult((s) => ({ ...s, key, error: err }));
      });
    return () => ctrl.abort();
    // `key` already encodes every input below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setFilter = useCallback((name, value) => {
    setFilters((f) => ({ ...f, [name]: value }));
    setPage(1);
  }, []);

  const toggleSort = useCallback((column) => {
    setSort((s) =>
      s.sortBy === column ? { sortBy: column, order: s.order === 'asc' ? 'desc' : 'asc' } : { sortBy: column, order: 'asc' },
    );
    setPage(1);
  }, []);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  /** Merge fields into one row locally (optimistic updates / server echo). */
  const patchItem = useCallback(
    (id, patch) =>
      setResult((s) => ({ ...s, items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })),
    [],
  );

  return {
    items: result.items,
    meta: result.meta,
    error: result.key === key ? result.error : null,
    loading: result.key !== key,
    filters,
    setFilter,
    sort,
    setSort,
    toggleSort,
    page,
    setPage,
    reload,
    patchItem,
  };
}
