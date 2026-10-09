import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { hashPassword } from '../src/modules/auth/auth.service.js';

export const app = createApp();
export const PASSWORD = 'Passw0rd!x';

export const resetDb = () => pool.query('TRUNCATE ratings, stores, users RESTART IDENTITY CASCADE');
export const closeDb = () => pool.end();

let seq = 0;

export async function insertUser(role = 'USER', overrides = {}) {
  const n = ++seq;
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, address, password_hash, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, address, role`,
    [
      overrides.name ?? `Fixture ${role} Account Holder ${n}`,
      overrides.email ?? `${role.toLowerCase()}${n}@fixture.test`,
      overrides.address ?? '1 Fixture Way',
      await hashPassword(PASSWORD),
      role,
    ],
  );
  return rows[0];
}

export async function insertStore(ownerId = null, overrides = {}) {
  const n = ++seq;
  const { rows } = await pool.query(
    `INSERT INTO stores (name, email, address, owner_id) VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, address`,
    [
      overrides.name ?? `Fixture Store Number ${n} Limited`,
      overrides.email ?? `store${n}@fixture.test`,
      overrides.address ?? `${n} Retail Road`,
      ownerId,
    ],
  );
  return rows[0];
}

/** Returns a supertest agent that carries the session cookie. */
export async function loginAs(user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export { request };
