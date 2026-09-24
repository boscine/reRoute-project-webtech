/**
 * Common test helper for ReRoute Playwright suite
 */

export const AUTH_URL = 'http://localhost:5173';
export const DASHBOARD_URL = 'http://localhost:5174';
export const BACKEND_URL = 'http://localhost:3000';

export async function loginAsAdmin(page) {
  await page.goto(`${AUTH_URL}/login`);
  await page.fill('input#email', 'admin@campus.edu');
  await page.fill('input#password', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DASHBOARD_URL}/**`, { timeout: 15000 });
}
