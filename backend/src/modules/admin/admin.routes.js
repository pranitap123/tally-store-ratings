import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as schema from './admin.schema.js';
import * as service from './admin.service.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => res.json({ data: await service.dashboard() })),
);

router.get(
  '/users',
  validate({ query: schema.listUsersQuery }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await service.listUsers(req.query);
    res.json({ data: items, meta });
  }),
);

router.post(
  '/users',
  validate({ body: schema.createUserBody }),
  asyncHandler(async (req, res) => res.status(201).json({ data: await service.addUser(req.body) })),
);

router.get(
  '/users/:id',
  validate({ params: schema.idParams }),
  asyncHandler(async (req, res) => res.json({ data: await service.getUser(req.params.id) })),
);

router.get(
  '/stores',
  validate({ query: schema.listStoresQuery }),
  asyncHandler(async (req, res) => {
    const { items, meta } = await service.listStores(req.query);
    res.json({ data: items, meta });
  }),
);

router.post(
  '/stores',
  validate({ body: schema.createStoreBody }),
  asyncHandler(async (req, res) => res.status(201).json({ data: await service.addStore(req.body) })),
);

router.get(
  '/store-owners',
  asyncHandler(async (_req, res) => res.json({ data: await service.unassignedOwners() })),
);

export default router;
