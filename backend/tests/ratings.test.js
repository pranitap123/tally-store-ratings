import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { resetDb, closeDb, insertUser, insertStore, loginAs } from './helpers.js';

beforeEach(resetDb);
afterAll(closeDb);

const rate = (agent, storeId, rating) => agent.put(`/api/stores/${storeId}/rating`).send({ rating });

describe('ratings', () => {
  it('creates, then updates in place (one row per user and store)', async () => {
    const store = await insertStore();
    const agent = await loginAs(await insertUser('USER'));

    const first = await rate(agent, store.id, 3);
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({ myRating: 3, overallRating: 3, ratingCount: 1 });

    const second = await rate(agent, store.id, 5);
    expect(second.body.data).toMatchObject({ myRating: 5, overallRating: 5, ratingCount: 1 });

    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM ratings');
    expect(rows[0].n).toBe(1);
  });

  it('averages across users to one decimal', async () => {
    const store = await insertStore();
    const users = [await insertUser('USER'), await insertUser('USER'), await insertUser('USER')];
    await rate(await loginAs(users[0]), store.id, 5);
    await rate(await loginAs(users[1]), store.id, 4);
    const last = await rate(await loginAs(users[2]), store.id, 4);
    expect(last.body.data.overallRating).toBe(4.3);
    expect(last.body.data.ratingCount).toBe(3);
  });

  it.each([0, 6, 2.5, '4', null])('rejects invalid rating %j', async (bad) => {
    const store = await insertStore();
    const agent = await loginAs(await insertUser('USER'));
    const res = await rate(agent, store.id, bad);
    expect(res.status).toBe(400);
    expect(res.body.error.details.rating).toBeDefined();
  });

  it('404s for an unknown store and 400s for a malformed id', async () => {
    const agent = await loginAs(await insertUser('USER'));
    await rate(agent, '00000000-0000-4000-8000-000000000000', 3).expect(404);
    await rate(agent, 'not-a-uuid', 3).expect(400);
  });

  it('shows each viewer only their own myRating', async () => {
    const store = await insertStore();
    const agentA = await loginAs(await insertUser('USER'));
    const agentB = await loginAs(await insertUser('USER'));
    await rate(agentA, store.id, 2);

    const asA = await agentA.get('/api/stores');
    const asB = await agentB.get('/api/stores');
    expect(asA.body.data[0].myRating).toBe(2);
    expect(asB.body.data[0].myRating).toBeNull();
    expect(asB.body.data[0].overallRating).toBe(2);
  });
});

describe('owner dashboard', () => {
  it("shows only raters of the owner's own store, with the average", async () => {
    const owner = await insertUser('STORE_OWNER');
    const mine = await insertStore(owner.id);
    const other = await insertStore();
    const u1 = await insertUser('USER');
    const u2 = await insertUser('USER');
    await rate(await loginAs(u1), mine.id, 5);
    await rate(await loginAs(u2), mine.id, 2);
    await rate(await loginAs(u2), other.id, 1);

    const res = await (await loginAs(owner)).get('/api/owner/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.store.id).toBe(mine.id);
    expect(res.body.data.averageRating).toBe(3.5);
    expect(res.body.data.raters).toHaveLength(2);
    expect(res.body.meta.total).toBe(2);
  });

  it('handles an owner without a store', async () => {
    const res = await (await loginAs(await insertUser('STORE_OWNER'))).get('/api/owner/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.store).toBeNull();
  });
});
