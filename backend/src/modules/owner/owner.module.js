import { Router } from 'express';
import { query } from '../../db/pool.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listQuery, meta, orderBy, paging } from '../../utils/query.js';

const ORDER = { name: 'u.name', email: 'u.email', rating: 'r.rating', ratedAt: 'r.updated_at' };
const listSchema = listQuery(['name', 'email', 'rating', 'ratedAt'], 'ratedAt', {});

async function dashboard(ownerId, q) {
  const { rows } = await query(
    `SELECT s.id, s.name, s.email, s.address,
            ROUND(AVG(r.rating), 1)::float8 AS "averageRating",
            COUNT(r.id) AS "ratingCount"
     FROM stores s LEFT JOIN ratings r ON r.store_id = s.id
     WHERE s.owner_id = $1
     GROUP BY s.id`,
    [ownerId],
  );
  const store = rows[0];
  if (!store) return { store: null, raters: [], meta: meta(q, 0) };

  const { limit, offset } = paging(q);
  const raters = await query(
    `SELECT u.id AS "userId", u.name, u.email, u.address, r.rating, r.updated_at AS "ratedAt"
     FROM ratings r JOIN users u ON u.id = r.user_id
     WHERE r.store_id = $1
     ${orderBy(ORDER, q.sortBy, q.order, 'u.id')}
     LIMIT $2 OFFSET $3`,
    [store.id, limit, offset],
  );

  const { id, name, email, address, averageRating, ratingCount } = store;
  return {
    store: { id, name, email, address },
    averageRating,
    ratingCount,
    raters: raters.rows,
    meta: meta(q, ratingCount),
  };
}

const router = Router();
router.use(authenticate, requireRole('STORE_OWNER'));

router.get(
  '/dashboard',
  validate({ query: listSchema }),
  asyncHandler(async (req, res) => {
    const { raters, meta: m, ...rest } = await dashboard(req.user.id, req.query);
    res.json({ data: { ...rest, raters }, meta: m });
  }),
);

export default router;
