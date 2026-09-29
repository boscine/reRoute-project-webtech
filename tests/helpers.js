/**
 * Shared helpers for the ReRoute Playwright suite.
 *
 * The suite runs against two live servers (see playwright.config.js):
 *   - Vue 3 SPA (student + admin) :5173
 *   - Laravel API                 :8000
 *
 * Helpers here exist so the spec files read as behaviour descriptions rather
 * than plumbing, and so that destructive calls (building/floor/location and
 * admin creation) always have a matching, deterministic cleanup path.
 */
import { expect } from '@playwright/test';

export const APP_URL = 'http://localhost:5173';
export const API_BASE = 'http://localhost:8000/api';

/**
 * Credentials for the seeded super admin. These come from
 * laravel-backend/database/seeders/DatabaseSeeder.php, so the stub mirrors
 * them exactly - a mismatch here would make every authenticated test pass
 * against the stub and fail against the real API, or worse, the reverse.
 */
export const ADMIN_CREDENTIALS = { email: 'admin@reroute.campus', password: 'admin12345' };

/** QR slugs the seeder creates, so the public resolve flow is testable offline. */
export const SEEDED_QR_SLUGS = ['nh-gf', 'sc-f1', 'sh-l1', 'lib-f3'];

/**
 * True when the suite is running against the in-memory stub API
 * (tests/stubs/api-server.js) instead of the real Laravel + SQLite backend.
 *
 * The stub reimplements the HTTP contract rather than exercising it, so a test
 * whose premise is *backend* behaviour is meaningless in this mode and is
 * skipped via skipIfStubbed(). The UI and client-side validation tests still
 * run, because the SPA talks to the stub unchanged.
 */
export const STUB_API = process.env.REROUTE_STUB_API === '1';

/**
 * Skips a test that asserts real backend semantics - Sanctum token enforcement,
 * cascade deletes, the ScanLog audit trail.
 *
 * Running these against the stub would only prove the stub agrees with itself,
 * so they report as skipped rather than as a misleading pass. Run the suite
 * with `npm run test:api` to execute them for real.
 */
export function skipIfStubbed(test) {
  test.skip(
    STUB_API,
    'REROUTE_STUB_API=1: the stub reimplements the API contract, so it cannot verify backend behaviour. Run with npm run test:api.'
  );
}

/**
 * Skips a test that mutates persistent state in the real database.
 *
 * The stub is per-process in-memory, so a test may create records freely there.
 * Against the real SQLite file those rows survive the run, so a second run
 * would trip the unique constraints on buildings.name and locations.qr_slug.
 * These tests skip unless a fresh database is prepared.
 */
export function skipUnlessFreshDatabase(test) {
  test.skip(
    process.env.REROUTE_ALLOW_DB_WRITES !== '1',
    'Test writes persistent rows. Run with REROUTE_ALLOW_DB_WRITES=1 after `php artisan migrate:fresh --seed` to execute it.'
  );
}

/**
 * Signs in through the real login form and waits until the admin shell has
 * rendered, so callers can assert on page content rather than on loading state.
 */
export async function loginAsAdmin(page, credentials = ADMIN_CREDENTIALS) {
  await page.goto('/admin/login');
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin/dashboard', { timeout: 20000 });
  await expectAdminShellReady(page);
}

/** Waits for the admin shell to be interactive (sidebar + main region present). */
export async function expectAdminShellReady(page) {
  await page.waitForSelector('aside', { timeout: 20000 });
  await page.waitForSelector('h1, h2', { timeout: 20000 });
}

/**
 * Performs an API call from inside the browser.
 *
 * Running in-page rather than through Playwright's `request` fixture means the
 * SPA's own origin is used and the Vite proxy is exercised, which is the path
 * the app really takes. The Sanctum bearer token is read from localStorage,
 * mirroring the interceptor in frontend/src/services/api.js.
 *
 * @returns {{status:number, ok:boolean, body:any}}
 */
export async function apiRequest(page, method, path, body, { token } = {}) {
  return page.evaluate(
    async ({ method, path, body, API_BASE, token }) => {
      const authToken =
        token ?? window.localStorage.getItem('reroute_token') ?? undefined;

      const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await res.text();
      let parsed = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* non-JSON response */
      }
      return { status: res.status, ok: res.ok, body: parsed };
    },
    { method, path, body, API_BASE, token },
  );
}

/** Monotonic suffix so parallel/repeated runs never collide on unique data. */
let sequence = 0;
export function uniqueSuffix() {
  sequence += 1;
  return `${Date.now().toString(36)}${sequence}`;
}

/**
 * Builds a unique building name. The backend enforces unique:buildings,name, so
 * a fixed name would fail on the second run against a persistent database.
 */
export function uniqueBuildingName() {
  return `Test Wing ${uniqueSuffix()}`;
}

/** Reads the *authored* text of a set of elements. */
export async function domTexts(locator) {
  return locator.evaluateAll(els => els.map(el => el.textContent.trim()));
}

// --- assertion shorthands -------------------------------------------------
// The specs assert on rendered styling and on API responses, and both idioms
// are extremely repetitive inline. These keep the specs reading as behaviour
// statements instead of plumbing, without weakening a single assertion.

/** Computed styles for the given properties: `await css(el, 'height', 'color')`. */
export async function css(locator, ...props) {
  return locator.evaluate(
    (el, keys) => Object.fromEntries(keys.map(k => [k, getComputedStyle(el)[k]])),
    props
  );
}

/** Asserts one or more computed styles: `await expectCss(el, 'height', '48px')`. */
export async function expectCss(locator, props, value) {
  if (typeof props === 'string') props = { [props]: value };
  expect(await css(locator, ...Object.keys(props))).toEqual(props);
}

/**
 * Asserts a computed style that animates in (colour transitions, hover states).
 * Polls for the settled value instead of racing the transition.
 */
export async function expectCssSettles(locator, props, value) {
  if (typeof props === 'string') props = { [props]: value };
  await expect.poll(() => css(locator, ...Object.keys(props))).toEqual(props);
}

/** Rounded bounding box, for layout assertions. */
export async function box(locator) {
  const b = await locator.boundingBox();
  return { x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) };
}

/** Asserts the page does not scroll horizontally at the given viewport width. */
export async function expectNoOverflow(page, width) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
}

/** Runs an API call, asserts it succeeded, and returns the parsed body. */
export async function apiBody(page, method, path, body, opts) {
  const res = await apiRequest(page, method, path, body, opts);
  expect(res.status, `${method} ${path} -> ${res.status} ${JSON.stringify(res.body)}`).toBeLessThan(300);
  return res.body;
}

/** Runs an API call, asserts it failed with `status`, and returns the parsed body. */
export async function apiError(page, method, path, status, body, opts) {
  const res = await apiRequest(page, method, path, body, opts);
  expect(res.status, `${method} ${path} -> ${res.status} ${JSON.stringify(res.body)}`).toBe(status);
  return res.body;
}
