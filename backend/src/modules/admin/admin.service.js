import { query } from '../../db/pool.js';
import { AppError } from '../../utils/AppError.js';
import { buildWhere, contains, meta, orderBy, paging } from '../../utils/query.js';
import { createUser } from '../auth/auth.service.js';

const USER_ORDER = {
  name: 'u.name',
  email: 'u.email',
  address: 'u.address',
  role: 'u.role::text',
  createdAt: 'u.created_at',
};

const STORE_ORDER = {
  name: 's.name',
  email: 's.email',
  address: 's.address',
  rating: 'rating',
  createdAt: 's.created_at',
};

const ownerRatingSql = `(
  SELECT ROUND(AVG(r.rating), 1)::float8
  FROM stores s JOIN ratings r ON r.store_id = s.id
  WHERE s.owner_id = u.id
)`;

export async function dashboard() {
  const { rows } = await query(`
    SELECT
      (SELECT COUNT(*) FROM users)   AS users,
      (SELECT COUNT(*) FROM stores)  AS stores,
      (SELECT COUNT(*) FROM ratings) AS ratings
  `);
  return rows[0];
}

export async function listUsers(q) {
  const { where, params } = buildWhere([
    { value: q.name && contains(q.name), sql: (p) => `u.name ILIKE ${p}` },
    { value: q.email && contains(q.email), sql: (p) => `u.email ILIKE ${p}` },
    { value: q.address && contains(q.address), sql: (p) => `u.address ILIKE ${p}` },
    { value: q.role, sql: (p) => `u.role = ${p}` },
  ]);
  const { limit, offset } = paging(q);

  const [count, list] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM users u ${where}`, params),
    query(
      `SELECT u.id, u.name, u.email, u.address, u.role, u.created_at AS "createdAt",
              CASE WHEN u.role = 'STORE_OWNER' THEN ${ownerRatingSql} END AS rating
       FROM users u ${where}
       ${orderBy(USER_ORDER, q.sortBy, q.order, 'u.id')}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
  ]);
  return { items: list.rows, meta: meta(q, count.rows[0].total) };
}

export async function getUser(id) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.address, u.role, u.created_at AS "createdAt",
            CASE WHEN u.role = 'STORE_OWNER' THEN ${ownerRatingSql} END AS rating,
            st.id AS "storeId", st.name AS "storeName"
     FROM users u
     LEFT JOIN stores st ON st.owner_id = u.id
     WHERE u.id = $1`,
    [id],
  );
  if (!rows[0]) throw AppError.notFound('User not found');
  return rows[0];
}

export const addUser = (input) => createUser(input);

export async function listStores(q) {
  const { where, params } = buildWhere([
    { value: q.name && contains(q.name), sql: (p) => `s.name ILIKE ${p}` },
    { value: q.email && contains(q.email), sql: (p) => `s.email ILIKE ${p}` },
    { value: q.address && contains(q.address), sql: (p) => `s.address ILIKE ${p}` },
  ]);
  const { limit, offset } = paging(q);

  const [count, list] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM stores s ${where}`, params),
    query(
      `SELECT s.id, s.name, s.email, s.address, s.created_at AS "createdAt",
              o.id AS "ownerId", o.name AS "ownerName",
              ROUND(AVG(r.rating), 1)::float8 AS rating,
              COUNT(r.id) AS "ratingCount"
       FROM stores s
       LEFT JOIN users o   ON o.id = s.owner_id
       LEFT JOIN ratings r ON r.store_id = s.id
       ${where}
       GROUP BY s.id, o.id
       ${orderBy(STORE_ORDER, q.sortBy, q.order, 's.id')}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
  ]);
  return { items: list.rows, meta: meta(q, count.rows[0].total) };
}

export async function addStore({ name, email, address, ownerId }) {
  const dup = await query('SELECT 1 FROM stores WHERE lower(email) = $1', [email]);
  if (dup.rowCount) throw AppError.conflict('A store with that email already exists', { email: ['Email already in use'] });

  if (ownerId) {
    const { rows } = await query('SELECT role FROM users WHERE id = $1', [ownerId]);
    if (!rows[0]) throw AppError.validation('Owner not found', { ownerId: ['Owner not found'] });
    if (rows[0].role !== 'STORE_OWNER') {
      throw AppError.validation('Selected user is not a store owner', { ownerId: ['User must have the Store Owner role'] });
    }
    const taken = await query('SELECT 1 FROM stores WHERE owner_id = $1', [ownerId]);
    if (taken.rowCount) throw AppError.conflict('That owner already has a store', { ownerId: ['Owner already has a store'] });
  }

  const { rows } = await query(
    `INSERT INTO stores (name, email, address, owner_id) VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, address, owner_id AS "ownerId"`,
    [name, email, address, ownerId],
  );
  return rows[0];
}

export async function unassignedOwners() {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email FROM users u
     WHERE u.role = 'STORE_OWNER' AND NOT EXISTS (SELECT 1 FROM stores s WHERE s.owner_id = u.id)
     ORDER BY u.name`,
  );
  return rows;
}
