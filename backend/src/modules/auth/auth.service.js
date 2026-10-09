import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { query } from '../../db/pool.js';
import { AppError } from '../../utils/AppError.js';

const COST = env.BCRYPT_COST;
// compared against when the email is unknown so response time doesn't reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST);

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, address: u.address, role: u.role });

export const hashPassword = (plain) => bcrypt.hash(plain, COST);

export async function createUser({ name, email, address, password, role = 'USER' }) {
  const existing = await query('SELECT 1 FROM users WHERE lower(email) = $1', [email]);
  if (existing.rowCount) throw AppError.conflict('That email is already registered', { email: ['Email already in use'] });

  const { rows } = await query(
    `INSERT INTO users (name, email, address, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, email, address, role`,
    [name, email, address, await hashPassword(password), role],
  );
  return rows[0];
}

export async function verifyCredentials(email, password) {
  const { rows } = await query(
    'SELECT id, name, email, address, role, password_hash FROM users WHERE lower(email) = $1',
    [email.trim().toLowerCase()],
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  return user;
}

export async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Current password is incorrect', {
      currentPassword: ['Current password is incorrect'],
    });
  }
  await query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [
    userId,
    await hashPassword(newPassword),
  ]);
}
