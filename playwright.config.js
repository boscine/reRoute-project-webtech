import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for ReRoute Monorepo
 * Orchestrates tests across Vue Auth (5173), React Dashboard (5174), and the API (3000)
 *
 * The API on :3000 runs in one of two modes, chosen by REROUTE_STUB_API:
 *
 *   REROUTE_STUB_API=1  (default for `npm test`) - boots tests/stubs/api-server.js,
 *      an in-memory stand-in for the Express + MongoDB backend. No mongod needed
 *      and no writes to a developer's real database. Tests whose premise is
 *      backend behaviour skip themselves via skipIfStubbed() in tests/helpers.js,
 *      so a green stub run never overstates what was actually verified.
 *
 *   REROUTE_STUB_API=0  (`npm run test:api`) - boots the real backend from
 *      backend/.env. This is the only mode that verifies session enforcement,
 *      invite-code single-use, and load clamping. Requires a running mongod and
 *      AUTH_BYPASS=false in backend/.env.
 *
 * The two frontends are always real in both modes - the stub replaces only the
 * API, so the UI and client-side validation assertions are genuine either way.
 */
const STUB_API = process.env.REROUTE_STUB_API !== '0';

const apiServer = STUB_API
  ? {
      command: 'node tests/stubs/api-server.js',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 60000,
    }
  : {
      command: 'npm run start --workspace=backend',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 60000,
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

  // Automatically start dev servers if not already running during tests
  webServer: [
    // Both frontends are started by invoking Vite's bin script directly with a
    // cwd, rather than via `npm run dev --workspace=...`. The npm/.bin shim
    // route resolves through the workspace symlink and Vite then fails to write
    // its bundled temp config into node_modules/.vite-temp, so the server never
    // binds and the webServer check times out. Same binary, same args - only the
    // launcher differs.
    {
      command: 'node node_modules/vite/bin/vite.js',
      cwd: 'frontend/auth',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: 'node node_modules/vite/bin/vite.js',
      cwd: 'frontend/dashboard',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 60000,
    },
    apiServer,
  ],
});
