import { z } from 'zod';
import { name, email, address, password, role, uuid } from '../../validation/fields.js';
import { listQuery, textFilter } from '../../utils/query.js';

export const createUserBody = z.object({ name, email, address, password, role }).strict();

export const createStoreBody = z
  .object({
    name,
    email,
    address,
    ownerId: uuid.nullish().transform((v) => v ?? null),
  })
  .strict();

export const idParams = z.object({ id: uuid });

export const USER_SORT = ['name', 'email', 'address', 'role', 'createdAt'];
export const STORE_SORT = ['name', 'email', 'address', 'rating', 'createdAt'];

export const listUsersQuery = listQuery(USER_SORT, 'name', {
  name: textFilter,
  email: textFilter,
  address: textFilter,
  role: z.enum(['ADMIN', 'USER', 'STORE_OWNER']).optional().or(z.literal('').transform(() => undefined)),
});

export const listStoresQuery = listQuery(STORE_SORT, 'name', {
  name: textFilter,
  email: textFilter,
  address: textFilter,
});
