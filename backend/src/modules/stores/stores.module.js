import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { buildWhere, contains, listQuery, meta, orderBy, paging, textFilter } from '../../utils/query.js';
import { uuid } from '../../validation/fields.js';

const ORDER = { name: 's.name', address: 's.address', rating: 'rating' };

const listSchema = listQuery(['name', 'address', 'rating'], 'name', { q: textFilter });
const idParams = z.object({ id: uuid });
const ratingBody = z
  .object({
    rating: z.number({ error: 'Rating must be a number' }).int('Rating must be a whole number').min(1, 'Minimum rating is 1').max(5, 'Maximum rating is 5'),
  })
  .strict();

const storeSelect = `
  SELECT s.id, s.name, s.address,
         ROUND(AVG(r.rating), 1)::float8 AS "overallRating",
         COUNT(r.id) AS "ratingCount",
         mine.rating AS "myRating"
  FROM stores s
  LEFT JOIN ratings r    ON r.store_id = s.id
  LEFT JOIN ratings mine ON mine.store_id = s.id AND mine.user_id = $1`;

async function listStores(userId, q) {
  const search = q.q && contains(q.q);
  const cond = [{ value: search, sql: (p) => `(s.name ILIKE ${p} OR s.address ILIKE ${p})` }];
  const countWhere = buildWhere(cond, 1); // $1 = search
  const listWhere = buildWhere(cond, 2); // $1 is the viewer, search shifts to $2
  const { limit, offset } = paging(q);
  const n = listWhere.params.length;

  const [count, list] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM stores s ${countWhere.where}`, countWhere.params),
    query(
      `${storeSelect}
       ${listWhere.where}
       GROUP BY s.id, mine.rating
       ${orderBy(ORDER, q.sortBy, q.order, 's.id')}
       LIMIT $${n + 2} OFFSET $${n + 3}`,
      [userId, ...listWhere.params, limit, offset],
    ),
  ]);
  return { items: list.rows, meta: meta(q, count.rows[0].total) };
}

async function rateStore(userId, storeId, rating) {
  const store = await query('SELECT 1 FROM stores WHERE id = $1', [storeId]);
  if (!store.rowCount) throw AppError.notFound('Store not found');

  await query(
    `INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)
     ON CONFLICT (user_id, store_id)
     DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()`,
    [userId, storeId, rating],
  );

  const { rows } = await query(`${storeSelect} WHERE s.id = $2 GROUP BY s.id, mine.rating`, [userId, storeId]);
  return rows[0];
}

const router = Router();
router.use(authenticate, requireRole('USER'));

router.get(
  '/',
  validate({ query: listSchema }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await listStores(req.user.id, req.query);
    res.json({ data: items, meta });
  }),
);

router.put(
  '/:id/rating',
  validate({ params: idParams, body: ratingBody }),
  asyncHandler(async (req, res) => {
    res.json({ data: await rateStore(req.user.id, req.params.id, req.body.rating) });
  }),
);

export default router;
