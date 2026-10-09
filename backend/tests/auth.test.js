import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { app, request, resetDb, closeDb, insertUser, loginAs, PASSWORD } from './helpers.js';

const valid = {
  name: 'Jonathan Whitfield Barnes',
  email: 'jon@example.com',
  address: '12 Elm Street, Springfield',
  password: 'Strong#Pass1',
};

beforeEach(resetDb);
afterAll(closeDb);

describe('POST /api/auth/signup', () => {
  it('creates a USER, sets an httpOnly cookie and never returns the hash', async () => {
    const res = await request(app).post('/api/auth/signup').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: 'jon@example.com', role: 'USER' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
  });

  it('rejects attempts to self-assign a role', async () => {
    const res = await request(app).post('/api/auth/signup').send({ ...valid, role: 'ADMIN' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['short name', { name: 'Too short' }, 'name'],
    ['long name', { name: 'x'.repeat(61) }, 'name'],
    ['long address', { address: 'a'.repeat(401) }, 'address'],
    ['bad email', { email: 'not-an-email' }, 'email'],
    ['short password', { password: 'Ab#1' }, 'password'],
    ['long password', { password: 'Abcdefgh#12345678' }, 'password'],
    ['no uppercase', { password: 'lowercase#1' }, 'password'],
    ['no special char', { password: 'NoSpecial123' }, 'password'],
  ])('rejects %s', async (_label, patch, field) => {
    const res = await request(app).post('/api/auth/signup').send({ ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.error.details[field]).toBeDefined();
  });

  it('accepts boundary values (name 20 and 60, password 8 and 16)', async () => {
    const a = await request(app)
      .post('/api/auth/signup')
      .send({ ...valid, name: 'a'.repeat(20), email: 'a@x.com', password: 'Abcdef#1' });
    const b = await request(app)
      .post('/api/auth/signup')
      .send({ ...valid, name: 'b'.repeat(60), email: 'b@x.com', password: 'Abcdefgh#1234567' });
    expect([a.status, b.status]).toEqual([201, 201]);
  });

  it('treats email as case-insensitive for uniqueness', async () => {
    await request(app).post('/api/auth/signup').send(valid);
    const res = await request(app).post('/api/auth/signup').send({ ...valid, email: 'JON@Example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('login and session', () => {
  it('logs in, reads /me, and logs out', async () => {
    const user = await insertUser('USER');
    const agent = await loginAs(user);
    const me = await agent.get('/api/auth/me');
    expect(me.body.data.email).toBe(user.email);

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const user = await insertUser('USER');
    const wrong = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Wrong#Pass1' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@x.com', password: 'Wrong#Pass1' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error).toEqual(unknown.body.error);
  });

  it('rejects protected routes without a cookie', async () => {
    await request(app).get('/api/stores').expect(401);
  });
});

describe('PATCH /api/auth/password', () => {
  it('changes the password; the old one stops working', async () => {
    const user = await insertUser('STORE_OWNER');
    const agent = await loginAs(user);
    await agent.patch('/api/auth/password').send({ currentPassword: PASSWORD, newPassword: 'Brand#New99' }).expect(204);

    await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD }).expect(401);
    await request(app).post('/api/auth/login').send({ email: user.email, password: 'Brand#New99' }).expect(200);
  });

  it('requires the correct current password and a valid new one', async () => {
    const agent = await loginAs(await insertUser('USER'));
    const wrong = await agent.patch('/api/auth/password').send({ currentPassword: 'nope', newPassword: 'Brand#New99' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.details.currentPassword).toBeDefined();

    const weak = await agent.patch('/api/auth/password').send({ currentPassword: PASSWORD, newPassword: 'weak' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.details.newPassword).toBeDefined();
  });
});
