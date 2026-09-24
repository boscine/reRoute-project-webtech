import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for ReRoute Monorepo
 * Orchestrates tests across Vue Auth (5173), React Dashboard (5174), and Express API (3000)
 */
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
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Automatically start dev servers if not already running during tests
  webServer: [
    {
      command: 'npm run dev --workspace=frontend/auth',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: 'npm run dev --workspace=frontend/dashboard',
      url: 'http://localhost:5174',
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: 'npm run start --workspace=backend',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
