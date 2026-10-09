import { defineConfig } from 'vitest/config';

const env = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgres://tally:tally_dev_pw@localhost:5432/tally_test',
  JWT_SECRET: 'test-secret-test-secret-test-secret-123',
  RATE_LIMIT_ENABLED: 'false',
  BCRYPT_COST: '4',
};

// globalSetup runs in the main process, which does not receive `test.env`
Object.assign(process.env, env);

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false, // suites share one Postgres database
    globalSetup: ['./tests/globalSetup.js'],
    env,
  },
});
