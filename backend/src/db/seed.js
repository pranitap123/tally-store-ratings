import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { pool } from './pool.js';
import { migrate } from './migrate.js';

const PASSWORD = 'Passw0rd!demo';

const owners = [
  { name: 'Marcus Delacroix Holloway', email: 'marcus@brewhaus.test', address: '14 Foundry Lane, Portland, OR 97209' },
  { name: 'Priya Venkataraman Iyer', email: 'priya@lanternbooks.test', address: '88 Harbour Road, Mumbai, MH 400001' },
  { name: 'Tobias Lindqvist Eriksson', email: 'tobias@northcycle.test', address: '3 Kungsgatan, Stockholm 111 43' },
];

const stores = [
  { name: 'Brewhaus Coffee Roasters Co.', email: 'hello@brewhaus.test', address: '14 Foundry Lane, Portland, OR 97209' },
  { name: 'Lantern Books and Stationery', email: 'shop@lanternbooks.test', address: '88 Harbour Road, Mumbai, MH 400001' },
  { name: 'North Cycle Workshop and Cafe', email: 'ride@northcycle.test', address: '3 Kungsgatan, Stockholm 111 43' },
];

const extraStores = [
  ['Saffron Table Indian Kitchen', 'saffron', '210 Brigade Road, Bengaluru, KA 560001'],
  ['Pixel and Pine Game Emporium', 'pixelpine', '55 Mission Street, San Francisco, CA 94105'],
  ['Moss and Marrow Plant Studio', 'mossmarrow', '9 Canal Street, Amsterdam 1012'],
  ['The Daily Loaf Bakery House', 'dailyloaf', '72 Rue Oberkampf, Paris 75011'],
];

const shoppers = [
  'Ananya Krishnamurthy Rao', 'Jonathan Whitfield Barnes', 'Sofia Alvarez Montenegro',
  'Kenji Watanabe Nakamura', 'Fatima Zahra Al-Mansouri', 'Oliver Thornbury Sinclair',
];

async function main() {
  await migrate();

  const hash = (p) => bcrypt.hash(p, 12);
  const adminHash = await hash(env.SEED_ADMIN_PASSWORD);
  const demoHash = await hash(PASSWORD);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, address, role)
     VALUES ('System Administrator Account', $1, $2, '1 Admin Plaza, HQ', 'ADMIN')
     ON CONFLICT (lower(email)) DO NOTHING`,
    [env.SEED_ADMIN_EMAIL, adminHash],
  );

  if (process.argv.includes('--admin-only')) {
    console.log(`admin ready: ${env.SEED_ADMIN_EMAIL}`);
    return pool.end();
  }

  const ownerIds = [];
  for (const o of owners) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, address, role)
       VALUES ($1, $2, $3, $4, 'STORE_OWNER')
       ON CONFLICT (lower(email)) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [o.name, o.email, demoHash, o.address],
    );
    ownerIds.push(rows[0].id);
  }

  const storeIds = [];
  for (const [i, s] of stores.entries()) {
    const { rows } = await pool.query(
      `INSERT INTO stores (name, email, address, owner_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT (lower(email)) DO UPDATE SET updated_at = now() RETURNING id`,
      [s.name, s.email, s.address, ownerIds[i]],
    );
    storeIds.push(rows[0].id);
  }
  for (const [name, slug, address] of extraStores) {
    const { rows } = await pool.query(
      `INSERT INTO stores (name, email, address) VALUES ($1, $2, $3)
       ON CONFLICT (lower(email)) DO UPDATE SET updated_at = now() RETURNING id`,
      [name, `hello@${slug}.test`, address],
    );
    storeIds.push(rows[0].id);
  }

  const userIds = [];
  for (const [i, name] of shoppers.entries()) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, address, role)
       VALUES ($1, $2, $3, $4, 'USER')
       ON CONFLICT (lower(email)) DO UPDATE SET updated_at = now() RETURNING id`,
      [name, `shopper${i + 1}@demo.test`, demoHash, `${10 + i} Market Street, Springfield`],
    );
    userIds.push(rows[0].id);
  }

  // deterministic spread so averages look believable
  for (const [ui, userId] of userIds.entries()) {
    for (const [si, storeId] of storeIds.entries()) {
      if ((ui + si) % 3 === 2) continue;
      const rating = ((ui * 3 + si * 2) % 5) + 1;
      await pool.query(
        `INSERT INTO ratings (user_id, store_id, rating) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, store_id) DO NOTHING`,
        [userId, storeId, rating],
      );
    }
  }

  console.log(`seeded. admin: ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
  console.log(`demo users (shopper1@demo.test, marcus@brewhaus.test, …) password: ${PASSWORD}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
