import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { authenticate, signToken, cookieOptions, COOKIE_NAME } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { signupBody, loginBody, changePasswordBody } from './auth.schema.js';
import * as service from './auth.service.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => !env.RATE_LIMIT_ENABLED,
  handler: (_req, res) =>
    res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again in a few minutes' } }),
});

const startSession = (res, user) => {
  res.cookie(COOKIE_NAME, signToken(user.id), { ...cookieOptions(), maxAge: 8 * 60 * 60 * 1000 });
  return res.json({ data: service.publicUser(user) });
};

router.post(
  '/signup',
  limiter,
  validate({ body: signupBody }),
  asyncHandler(async (req, res) => {
    const user = await service.createUser({ ...req.body, role: 'USER' });
    res.status(201);
    startSession(res, user);
  }),
);

router.post(
  '/login',
  limiter,
  validate({ body: loginBody }),
  asyncHandler(async (req, res) => {
    const user = await service.verifyCredentials(req.body.email, req.body.password);
    startSession(res, user);
  }),
);

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  res.status(204).end();
});

router.get('/me', authenticate, (req, res) => res.json({ data: service.publicUser(req.user) }));

router.patch(
  '/password',
  authenticate,
  validate({ body: changePasswordBody }),
  asyncHandler(async (req, res) => {
    await service.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.status(204).end();
  }),
);

export default router;
