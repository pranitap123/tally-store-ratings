import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { Button } from './Button.jsx';

/**
 * columns: [{ key, header, sortKey?, render?(row), className? }]
 * Server-driven: sorting and paging are delegated to the parent via callbacks.
 */
export function DataTable({ columns, rows, loading, error, sort, onSort, meta, onPage, onRowClick, empty, onRetry }) {
  const ariaSort = (col) =>
    col.sortKey && sort?.sortBy === col.sortKey ? (sort.order === 'asc' ? 'ascending' : 'descending') : undefined;

  return (
    <div className="table-card">
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} aria-sort={ariaSort(c)} className={c.className}>
                  {c.sortKey ? (
                    <button className="th-sort" onClick={() => onSort(c.sortKey)}>
                      {c.header}
                      {sort?.sortBy === c.sortKey ? (
                        sort.order === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                      ) : (
                        <ArrowUpDown size={14} className="th-sort__idle" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={loading && rows.length ? 'is-refreshing' : ''}>
            {loading && !rows.length
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    {columns.map((c) => (
                      <td key={c.key}>
                        <span className="skeleton" style={{ width: `${55 + ((i * 17 + c.key.length * 11) % 40)}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row, i) => (
                  <tr
                    key={row.id ?? row.userId}
                    className={onRowClick ? 'is-clickable' : ''}
                    style={{ '--i': i }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={c.className} data-label={c.header}>
                        {c.render ? c.render(row) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="table-state">
          <p>{error.message}</p>
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}
      {!error && !loading && rows.length === 0 && (
        <div className="table-state">
          <Inbox size={28} />
          <p>{empty ?? 'Nothing here yet.'}</p>
        </div>
      )}

      {meta && meta.total > 0 && (
        <footer className="table-foot">
          <span className="mono">
            {(meta.page - 1) * meta.pageSize + 1}–{Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total}
          </span>
          <div className="pager">
            <button className="icon-btn" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page">
              <ChevronLeft size={18} />
            </button>
            <span className="mono">
              {meta.page} / {meta.totalPages}
            </span>
            <button
              className="icon-btn"
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPage(meta.page + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
