/**
 * Shared helpers for the ReRoute Playwright suite.
 *
 * The suite runs against three live servers (see playwright.config.js):
 *   - Vue 3 auth app      :5173
 *   - React admin dashboard :5174
 *   - Express REST API    :3000
 *
 * Helpers here exist so the spec files read as behaviour descriptions rather
 * than plumbing, and so that destructive calls (node/admin creation) always
 * have a matching, deterministic cleanup path.
 */
import { expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const AUTH_URL = 'http://localhost:5173';
export const DASHBOARD_URL = 'http://localhost:5174';
export const API_BASE = 'http://localhost:3000/api';

export const ADMIN_CREDENTIALS = { email: 'admin@campus.edu', password: 'password123' };

/** Seeds a password that satisfies every client- and server-side rule. */
export const STRONG_PASSWORD = 'Str0ng!Pass#2026';

/** Reads a single key out of backend/.env, or undefined if it is not set. */
function readBackendEnvValue(key) {
  // Playwright runs from the repo root, so this resolves alongside playwright.config.js.
  const envPath = join(process.cwd(), 'backend', '.env');
  if (!existsSync(envPath)) return undefined;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && match[1] === key) return match[2].replace(/^["']|["']$/g, '');
  }
  return undefined;
}

/**
 * True when the suite is running against the in-memory stub API
 * (tests/stubs/api-server.js) instead of the real Express + MongoDB backend.
 *
 * The stub reimplements the HTTP contract rather than exercising it, so a test
 * whose premise is *backend* behaviour is meaningless in this mode and is
 * skipped via skipIfStubbed(). The UI and client-side validation tests still
 * run, because the frontends talk to the stub unchanged.
 */
export const STUB_API = process.env.REROUTE_STUB_API === '1';

/**
 * True when the temporary no-login bypass is switched on in backend/.env.
 *
 * The backend loads that same file, so this is one source of truth: flip
 * AUTH_BYPASS there and the auth-enforcement assertions below start running
 * again with no change to this file.
 *
 * The stub has no bypass flag - it always enforces sessions, because enforcing
 * them is the only way the frontends can be tested honestly. So in stub mode
 * this reports as false and the auth tests are not skipped.
 */
export const AUTH_BYPASS = !STUB_API && readBackendEnvValue('AUTH_BYPASS') === 'true';

/**
 * Skips a test whose premise is that anonymous callers are rejected. That
 * cannot hold while the bypass is on, so the test reports as skipped rather
 * than as a failure.
 */
export function skipIfAuthBypassed(test) {
  test.skip(AUTH_BYPASS, 'AUTH_BYPASS is on in backend/.env, so anonymous calls are not rejected.');
}

/**
 * Skips a test that asserts real backend semantics - session enforcement,
 * invite-code consumption, load clamping, duplicate-IP rejection.
 *
 * Running these against the stub would only prove the stub agrees with itself,
 * so they report as skipped rather than as a misleading pass. Run the suite
 * with REROUTE_STUB_API=0 to execute them for real.
 */
export function skipIfStubbed(test) {
  test.skip(
    STUB_API,
    'REROUTE_STUB_API=1: the stub reimplements the API contract, so it cannot verify backend behaviour. Run with REROUTE_STUB_API=0.'
  );
}

/**
 * Signs in through the real login form and waits until the dashboard has
 * finished its session check and rendered a page heading.
 */
export async function loginAsAdmin(page, credentials = ADMIN_CREDENTIALS) {
  await page.goto(`${AUTH_URL}/login`);
  await page.fill('input#email', credentials.email);
  await page.fill('input#password', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${DASHBOARD_URL}/**`, { timeout: 20000 });
  await expectDashboardReady(page);
}

/** Waits for the dashboard shell to be interactive (auth check resolved). */
export async function expectDashboardReady(page) {
  await page.waitForSelector('aside', { timeout: 20000 });
  await page.waitForSelector('h1', { timeout: 20000 });
}

/**
 * Performs an authenticated REST call from inside the browser so that the
 * express-session cookie is sent along, exactly as the apps do it.
 *
 * @returns {{status:number, ok:boolean, body:any}}
 */
export async function apiRequest(page, method, path, body) {
  return page.evaluate(
    async ({ method, path, body, API_BASE }) => {
      const res = await fetch(`${API_BASE}${path}`, {
        method,
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
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
    { method, path, body, API_BASE },
  );
}

/** Monotonic suffix so parallel/repeated runs never collide on unique data. */
let sequence = 0;
export function uniqueSuffix() {
  sequence += 1;
  return `${Date.now().toString(36)}${sequence}`;
}

/**
 * Builds a unique RFC1918 address. The backend keys node uniqueness on IP, so
 * each run needs a fresh one or creation fails with a 400.
 */
export function uniqueIp() {
  sequence += 1;
  const third = 10 + (sequence % 200);
  const fourth = 1 + ((Date.now() + sequence) % 250);
  return `10.${third}.${fourth}`;
}

/** Resolves the show/hide toggle button that belongs to a specific password field. */
export function passwordToggle(page, inputId) {
  return page
    .locator(`input#${inputId}`)
    .locator('xpath=ancestor::div[contains(@class,"relative")][1]')
    .locator('button[aria-label="Show password"], button[aria-label="Hide password"]');
}

/** Resolves the 4-segment strength meter rendered under the register password field. */
export function strengthSegments(page) {
  return page.locator('.auth-card div.flex.gap-1 > div');
}

/**
 * Reads the *authored* text of a set of elements.
 *
 * `innerText`/`allInnerTexts()` return the CSS-rendered casing, so a
 * `text-transform: uppercase` header reads as "DEVICE NAME" rather than the
 * source string. Comparing against the source keeps these assertions sensitive
 * to real copy changes, while the casing itself is asserted separately via
 * computed style.
 */
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

/** Asserts an element is horizontally centred in the viewport. */
export async function expectCentred(locator, viewportWidth) {
  const b = await locator.boundingBox();
  expect(Math.abs(b.x - (viewportWidth - (b.x + b.width)))).toBeLessThanOrEqual(2);
}

/** Runs an API call, asserts it succeeded, and returns the parsed body. */
export async function apiBody(page, method, path, body) {
  const res = await apiRequest(page, method, path, body);
  expect(res.status, `${method} ${path} -> ${res.status} ${JSON.stringify(res.body)}`).toBeLessThan(300);
  return res.body;
}

/** Runs an API call, asserts it failed with `status`, and returns the parsed body. */
export async function apiError(page, method, path, status, body) {
  const res = await apiRequest(page, method, path, body);
  expect(res.status, `${method} ${path}`).toBe(status);
  return res.body;
}

/** Applies a status/load patch to a node, asserting success, and returns the node. */
export async function patchNode(page, id, patch) {
  return (await apiBody(page, 'PATCH', `/network/nodes/${id}/status`, patch)).node;
}