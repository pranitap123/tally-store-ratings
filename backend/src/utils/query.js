import { z } from 'zod';

/** Escape LIKE wildcards so user input is matched literally. */
export const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export const contains = (s) => `%${escapeLike(s.trim())}%`;

/** Shared list params: paging + sort direction. `sortBy` is validated per resource. */
export function listQuery(sortKeys, defaultSort, extra = {}) {
  return z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(10),
      sortBy: z.enum(sortKeys).default(defaultSort),
      order: z.enum(['asc', 'desc']).default('asc'),
      ...extra,
    })
    .strict();
}

/** Optional trimmed text filter; empty string means "no filter". */
export const textFilter = z
  .string()
  .trim()
  .max(400)
  .optional()
  .transform((v) => (v ? v : undefined));

/**
 * Builds a parameterised WHERE clause.
 * conditions: [{ value, sql: (placeholder) => string }]; skipped when value is undefined.
 */
export function buildWhere(conditions, startAt = 1) {
  const clauses = [];
  const params = [];
  for (const { value, sql } of conditions) {
    if (value === undefined) continue;
    params.push(value);
    clauses.push(sql(`$${startAt + params.length - 1}`));
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

/** Maps a whitelisted key to its SQL expression; nothing from the request reaches the string. */
export function orderBy(map, sortBy, order, tiebreaker = '') {
  const dir = order === 'desc' ? 'DESC' : 'ASC';
  return `ORDER BY ${map[sortBy]} ${dir} NULLS LAST${tiebreaker ? `, ${tiebreaker}` : ''}`;
}

export const paging = ({ page, pageSize }) => ({ limit: pageSize, offset: (page - 1) * pageSize });

export const meta = ({ page, pageSize }, total) => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});
