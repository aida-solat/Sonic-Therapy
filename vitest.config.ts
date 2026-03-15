import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-env.ts'],
    // Run tests in a single process to avoid race conditions
    // when resetting the shared Supabase test database.
    maxWorkers: 1,
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000
  },
});