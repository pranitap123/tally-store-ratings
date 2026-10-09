import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const COOKIE_NAME = 'tally_token';

export function signToken(userId) {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: env.JWT_EXPIRES_IN });
}

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.COOKIE_SECURE,
  path: '/',
});

/** Resolves the cookie to a live user row. The role is read from the DB, never from the token. */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw AppError.unauthenticated();

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw AppError.unauthenticated('Session expired, please sign in again');
  }

  const { rows } = await query('SELECT id, name, email, address, role FROM users WHERE id = $1', [payload.sub]);
  if (!rows[0]) throw AppError.unauthenticated('Account no longer exists');

  req.user = rows[0];
  next();
});

export const requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(AppError.forbidden());
