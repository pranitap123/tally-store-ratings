import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { resetDb, closeDb, insertUser, insertStore, loginAs } from './helpers.js';

// every protected route x every role
const routes = [
  ['get', '/api/admin/dashboard', 'ADMIN'],
  ['get', '/api/admin/users', 'ADMIN'],
  ['get', '/api/admin/stores', 'ADMIN'],
  ['get', '/api/admin/store-owners', 'ADMIN'],
  ['get', '/api/stores', 'USER'],
  ['get', '/api/owner/dashboard', 'STORE_OWNER'],
];

const agents = {};

beforeAll(async () => {
  await resetDb();
  const owner = await insertUser('STORE_OWNER');
  await insertStore(owner.id);
  for (const role of ['ADMIN', 'USER']) agents[role] = await loginAs(await insertUser(role));
  agents.STORE_OWNER = await loginAs(owner);
});
afterAll(closeDb);

describe('role matrix', () => {
  for (const [method, path, allowed] of routes) {
    for (const role of ['ADMIN', 'USER', 'STORE_OWNER']) {
      const expected = role === allowed ? 200 : 403;
      it(`${role} ${method.toUpperCase()} ${path} -> ${expected}`, async () => {
        const res = await agents[role][method](path);
        expect(res.status).toBe(expected);
      });
    }
  }

  it('only USER may submit ratings', async () => {
    const store = await insertStore();
    for (const role of ['ADMIN', 'STORE_OWNER']) {
      await agents[role].put(`/api/stores/${store.id}/rating`).send({ rating: 5 }).expect(403);
    }
  });

  it('only ADMIN may create users or stores', async () => {
    await agents.USER.post('/api/admin/users').send({}).expect(403);
    await agents.STORE_OWNER.post('/api/admin/stores').send({}).expect(403);
  });
});
