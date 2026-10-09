import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { app, request, resetDb, closeDb, insertUser, insertStore, loginAs } from './helpers.js';

let admin;
beforeEach(async () => {
  await resetDb();
  admin = await loginAs(await insertUser('ADMIN'));
});
afterAll(closeDb);

const newUser = (patch = {}) => ({
  name: 'Created By Admin Person',
  email: 'created@example.com',
  address: '5 Admin Street',
  password: 'Strong#Pass1',
  role: 'USER',
  ...patch,
});

describe('dashboard', () => {
  it('counts users, stores and ratings', async () => {
    const owner = await insertUser('STORE_OWNER');
    const store = await insertStore(owner.id);
    const u = await insertUser('USER');
    await (await loginAs(u)).put(`/api/stores/${store.id}/rating`).send({ rating: 4 });

    const res = await admin.get('/api/admin/dashboard');
    expect(res.body.data).toEqual({ users: 3, stores: 1, ratings: 1 });
  });
});

describe('creating records', () => {
  it.each(['ADMIN', 'USER', 'STORE_OWNER'])('creates a %s who can then sign in', async (role) => {
    const email = `${role.toLowerCase()}@new.test`;
    const res = await admin.post('/api/admin/users').send(newUser({ role, email }));
    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe(role);
    await request(app).post('/api/auth/login').send({ email, password: 'Strong#Pass1' }).expect(200);
  });

  it('creates a store with an owner, and each owner can only have one', async () => {
    const owner = await insertUser('STORE_OWNER');
    const body = { name: 'Brand New Corner Shop Ltd', email: 's1@shop.test', address: '1 High St', ownerId: owner.id };
    await admin.post('/api/admin/stores').send(body).expect(201);
    const again = await admin.post('/api/admin/stores').send({ ...body, email: 's2@shop.test' });
    expect(again.status).toBe(409);
  });

  it('refuses to assign a non-owner as store owner', async () => {
    const user = await insertUser('USER');
    const res = await admin.post('/api/admin/stores').send({
      name: 'Brand New Corner Shop Ltd',
      email: 's@shop.test',
      address: '1 High St',
      ownerId: user.id,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details.ownerId).toBeDefined();
  });

  it('lists only unassigned owners for the store form', async () => {
    const free = await insertUser('STORE_OWNER');
    const busy = await insertUser('STORE_OWNER');
    await insertStore(busy.id);
    const res = await admin.get('/api/admin/store-owners');
    expect(res.body.data.map((o) => o.id)).toEqual([free.id]);
  });
});

describe('listings: filter, sort, paginate', () => {
  it('filters users by name, email and role', async () => {
    await insertUser('USER', { name: 'Alphonse Fitzgerald Whitaker', email: 'alpha@x.test' });
    await insertUser('USER', { name: 'Beatrice Montgomery Oakley', email: 'bea@y.test' });
    await insertUser('STORE_OWNER', { name: 'Cornelius Albright Redmond', email: 'corn@x.test' });

    const byName = await admin.get('/api/admin/users?name=beatrice');
    expect(byName.body.data.map((u) => u.email)).toEqual(['bea@y.test']);

    const byEmail = await admin.get('/api/admin/users?email=@x.test');
    expect(byEmail.body.meta.total).toBe(2);

    const byRole = await admin.get('/api/admin/users?role=STORE_OWNER');
    expect(byRole.body.data).toHaveLength(1);
    expect(byRole.body.data[0]).toHaveProperty('rating');
  });

  it('sorts both directions and returns paging meta', async () => {
    for (const n of ['Zed', 'Amy', 'Mia']) await insertUser('USER', { name: `${n} Sortable Fixture Person` });
    const asc = await admin.get('/api/admin/users?role=USER&sortBy=name&order=asc&pageSize=2');
    const desc = await admin.get('/api/admin/users?role=USER&sortBy=name&order=desc&pageSize=2');
    expect(asc.body.data[0].name).toMatch(/^Amy/);
    expect(desc.body.data[0].name).toMatch(/^Zed/);
    expect(asc.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('sorts stores by rating', async () => {
    const hi = await insertStore();
    const lo = await insertStore();
    const agent = await loginAs(await insertUser('USER'));
    await agent.put(`/api/stores/${hi.id}/rating`).send({ rating: 5 });
    await agent.put(`/api/stores/${lo.id}/rating`).send({ rating: 2 });
    const res = await admin.get('/api/admin/stores?sortBy=rating&order=desc');
    expect(res.body.data.map((s) => s.rating)).toEqual([5, 2]);
  });

  it('rejects unknown sort keys instead of passing them to SQL', async () => {
    const res = await admin.get('/api/admin/users?sortBy=password_hash;DROP TABLE users');
    expect(res.status).toBe(400);
  });

  it('treats % in filters literally', async () => {
    await insertUser('USER', { name: 'Percent Sign Fixture Person', address: '100% Juice Bar Lane' });
    await insertUser('USER', { name: 'Other Fixture Person Number', address: '100 Juice Bar Lane' });
    const res = await admin.get('/api/admin/users?address=' + encodeURIComponent('100%'));
    expect(res.body.data.map((u) => u.address)).toEqual(['100% Juice Bar Lane']);
  });
});

describe('user detail', () => {
  it('includes the rating for store owners only', async () => {
    const owner = await insertUser('STORE_OWNER');
    const store = await insertStore(owner.id);
    const shopper = await insertUser('USER');
    await (await loginAs(shopper)).put(`/api/stores/${store.id}/rating`).send({ rating: 4 });

    const o = await admin.get(`/api/admin/users/${owner.id}`);
    expect(o.body.data.rating).toBe(4);
    expect(o.body.data.storeName).toBe(store.name);

    const s = await admin.get(`/api/admin/users/${shopper.id}`);
    expect(s.body.data.rating).toBeNull();
  });

  it('404s on an unknown id', async () => {
    await admin.get('/api/admin/users/00000000-0000-4000-8000-000000000000').expect(404);
  });
});

describe('store search for users', () => {
  it('matches name or address, case-insensitively', async () => {
    await insertStore(null, { name: 'Harbourside Fish Market Co', address: '1 Dock Road' });
    await insertStore(null, { name: 'Quiet Corner Bookshop Ltd', address: '9 Harbour View' });
    await insertStore(null, { name: 'Unrelated Hardware Supplies', address: '3 Mill Lane' });
    const agent = await loginAs(await insertUser('USER'));
    const res = await agent.get('/api/stores?q=HARBOUR');
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
  });
});
