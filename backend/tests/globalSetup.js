import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';

export default async function setup() {
  await migrate({ log: () => {} });
  await pool.end();
}
