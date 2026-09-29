import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for ReRoute
 * Drives the Vue 3 SPA (:5173) against either a stub or the real Laravel API.
 *
 * The API on :8000 runs in one of two modes, chosen by REROUTE_STUB_API:
 *
 *   REROUTE_STUB_API=1  (default for `npm test`) - boots tests/stubs/api-server.js,
 *      an in-memory stand-in for the Laravel backend. No PHP, no SQLite, and no
 *      writes to a developer's real database. Tests whose premise is backend
 *      behaviour skip themselves via skipIfStubbed() in tests/helpers.js, so a
 *      green stub run never overstates what was actually verified.
 *
 *   REROUTE_STUB_API=0  (`npm run test:api`) - boots `php artisan serve` against
 *      laravel-backend/database/database.sqlite. This is the only mode that
 *      verifies Sanctum token enforcement, cascade deletes, and the ScanLog
 *      audit trail. Requires `php artisan migrate --seed` to have been run.
 *
 * The frontend is always real in both modes - the stub replaces only the API,
 * so the UI and client-side assertions are genuine either way.
 */
const STUB_API = process.env.REROUTE_STUB_API !== '0';

// Laravel exposes /up as a health route; the stub mirrors it so the readiness
// probe below is identical in both modes.
const apiServer = STUB_API
  ? {
      command: 'node tests/stubs/api-server.js',
      url: 'http://localhost:8000/up',
      reuseExistingServer: true,
      timeout: 60000,
    }
  : {
      command: 'php artisan serve --host=127.0.0.1 --port=8000',
      cwd: 'laravel-backend',
      url: 'http://localhost:8000/up',
      reuseExistingServer: true,
      timeout: 120000,
    };

export default defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: STUB_API ? 'stubbed' : 'api',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // The SPA is started by invoking Vite's bin script directly with a cwd,
  // rather than via `npm run dev --workspace=...`. The npm/.bin shim route
  // resolves through a workspace symlink and Vite then fails to write its
  // bundled temp config into node_modules/.vite-temp, so the server never binds
  // and the webServer check times out. Same binary, same args - only the
  // launcher differs.
  webServer: [
    {
      command: 'node node_modules/vite/bin/vite.js',
      cwd: 'frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60000,
    },
    apiServer,
  ],
});
