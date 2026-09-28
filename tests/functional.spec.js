import { test, expect } from '@playwright/test';
import {
  AUTH_URL,
  DASHBOARD_URL,
  API_BASE,
  ADMIN_CREDENTIALS,
  STRONG_PASSWORD,
  AUTH_BYPASS,
  STUB_API,
  apiBody,
  apiError,
  apiRequest,
  loginAsAdmin,
  uniqueSuffix,
  uniqueIp,
  passwordToggle,
  strengthSegments,
  skipIfAuthBypassed,
  skipIfStubbed,
} from './helpers.js';

/**
 * Functional coverage: core workflows, user interactions, data processing,
 * navigation and API/state changes.
 *
 * Tests marked `real API only` assert backend semantics - session enforcement,
 * invite single-use, load clamping. They self-skip in stub mode, where the
 * assertions would only prove the stub agrees with itself.
 */
test.describe('ReRoute — Functional (10 checks)', () => {
  test('FUNC-01: blocks submission on an empty login form and flags each required field', async ({ page }) => {
    const calls = [];
    await page.route('**/api/auth/login', route => {
      calls.push(route.request().url());
      return route.abort();
    });

    await page.goto(`${AUTH_URL}/login`);
    await page.click('button[type="submit"]');

    // Both messages render, and each is bound to its own field.
    await expect(page.locator('p.field-error', { hasText: 'Email address is required.' })).toBeVisible();
    await expect(page.locator('p.field-error', { hasText: 'Password is required.' })).toBeVisible();

    // The error state is reflected on the control itself, not just in text.
    await expect(page.locator('input#email')).toHaveClass(/input-error/);
    await expect(page.locator('input#password')).toHaveClass(/input-error/);

    // Client-side validation short-circuits: no credential hit the API.
    expect(calls).toHaveLength(0);

    // Supplying the email clears only the email error.
    await page.fill('input#email', ADMIN_CREDENTIALS.email);
    await page.click('button[type="submit"]');
    await expect(page.locator('p.field-error', { hasText: 'Email address is required.' })).toBeHidden();
    await expect(page.locator('p.field-error', { hasText: 'Password is required.' })).toBeVisible();
    expect(calls).toHaveLength(0);
  });

  test('FUNC-02: validates email syntax and clears the error for a well-formed address', async ({ page, request }) => {
    await page.goto(`${AUTH_URL}/login`);

    if (!STUB_API) {
      // The API mirrors the same rules: missing fields are a 400, an unknown or
      // malformed address is a 401, and neither is distinguishable to the client.
      expect((await request.post(`${API_BASE}/auth/login`, { data: { email: ADMIN_CREDENTIALS.email } })).status()).toBe(400);
      const bad = await request.post(`${API_BASE}/auth/login`, { data: { email: 'not-an-email', password: 'x' } });
      expect(bad.status()).toBe(401);
      expect((await bad.json()).error).toBe('Invalid email or password.');
    }

    await page.fill('input#email', 'invalid-email-format');
    await page.click('button[type="submit"]');
    await expect(page.locator('p.field-error', { hasText: 'Please enter a valid email format.' })).toBeVisible();
    await expect(page.locator('input#email')).toHaveClass(/input-error/);

    // A valid format passes validation: submitting now produces no field
    // error on the email input and the request is actually dispatched.
    await page.fill('input#email', ADMIN_CREDENTIALS.email);
    await page.fill('input#password', 'definitely-wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('p.field-error')).toHaveCount(0);
    await expect(page.locator('input#email')).not.toHaveClass(/input-error/);
    await expect(page.locator('input#password')).not.toHaveClass(/input-error/);

    // Wrong credentials are surfaced as a global alert, not a field error.
    const alert = page.locator('[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Invalid email or password.');
    await expect(alert).toHaveClass(/bg-error-container/);

    // A failed login must not navigate away.
    expect(page.url()).toContain('/login');
  });

  test('FUNC-03: toggles password visibility on every password field', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    const loginPassword = page.locator('input#password');
    await expect(loginPassword).toHaveAttribute('type', 'password');

    await page.fill('input#password', 'SecretCampusPass#123');
    await passwordToggle(page, 'password').click();
    await expect(loginPassword).toHaveAttribute('type', 'text');
    await expect(passwordToggle(page, 'password')).toHaveAttribute('aria-label', 'Hide password');

    await passwordToggle(page, 'password').click();
    await expect(loginPassword).toHaveAttribute('type', 'password');
    await expect(passwordToggle(page, 'password')).toHaveAttribute('aria-label', 'Show password');

    // The same control works independently on the registration form.
    await page.goto(`${AUTH_URL}/register`);
    for (const id of ['password', 'confirmPassword']) {
      await expect(page.locator(`input#${id}`)).toHaveAttribute('type', 'password');
      await passwordToggle(page, id).click();
      await expect(page.locator(`input#${id}`)).toHaveAttribute('type', 'text');
      await passwordToggle(page, id).click();
      await expect(page.locator(`input#${id}`)).toHaveAttribute('type', 'password');
    }
  });

  test('FUNC-04: recomputes password strength incrementally as characters change', async ({ page }) => {
    await page.goto(`${AUTH_URL}/register`);

    // The meter is absent until something is typed.
    await expect(strengthSegments(page)).toHaveCount(0);

    const cases = [
      { password: 'abc', label: 'Weak', filled: 1, colour: 'bg-red-500' },
      { password: 'abcdefgh', label: 'Fair', filled: 2, colour: 'bg-yellow-400' },
      { password: 'Abcdefgh12', label: 'Good', filled: 3, colour: 'bg-blue-400' },
      { password: 'Abcdefgh12!#$', label: 'Strong', filled: 4, colour: 'bg-green-500' },
    ];

    for (const { password, label, filled, colour } of cases) {
      await page.locator('input#password').fill(password);
      await expect(page.locator('p.text-label-sm', { hasText: `${label} password` })).toBeVisible();

      const segments = strengthSegments(page);
      await expect(segments).toHaveCount(4);
      const classes = await segments.evaluateAll(els => els.map(e => e.className));
      expect(classes.filter(c => c.includes(colour))).toHaveLength(filled);
      expect(classes.filter(c => c.includes('bg-surface-container-high'))).toHaveLength(4 - filled);
    }

    // Clearing the field removes the meter again.
    await page.locator('input#password').fill('');
    await expect(strengthSegments(page)).toHaveCount(0);
  });

  test('FUNC-05: rejects every invalid registration payload before calling the API', async ({ page }) => {
    const calls = [];
    await page.route('**/api/auth/register', route => {
      calls.push(route.request().postDataJSON());
      return route.abort();
    });

    await page.goto(`${AUTH_URL}/register`);

    const fill = async (values) => {
      for (const [field, value] of Object.entries(values)) {
        await page.fill(`input#${field}`, value);
      }
    };

    const base = { name: 'Campus Tech', email: 'tech@campus.edu', password: STRONG_PASSWORD, confirmPassword: STRONG_PASSWORD, inviteCode: 'CR-CAMPUS-2026' };
    const cases = [
      [{ ...base, name: '' }, 'Full name is required.'],
      [{ ...base, email: 'nope' }, 'Please enter a valid email format.'],
      [{ ...base, password: 'short1', confirmPassword: 'short1' }, 'Password must be at least 8 characters.'],
      [{ ...base, confirmPassword: 'DifferentPass#456' }, 'Passwords do not match.'],
      [{ ...base, inviteCode: '' }, 'Admin invite code is required.'],
    ];

    for (const [values, message] of cases) {
      await fill(values);
      await page.click('button[type="submit"]');
      await expect(page.locator('p.field-error', { hasText: message })).toBeVisible();
    }

    // Not one invalid payload reached the server.
    expect(calls).toHaveLength(0);
  });

  test('FUNC-06: resolves deep links and moves between login and register', async ({ page }) => {
    // Root redirects to the login screen.
    await page.goto(`${AUTH_URL}/`);
    await expect(page).toHaveURL(`${AUTH_URL}/login`);
    await expect(page.locator('h1')).toHaveText('Admin Login');

    // Direct navigation to a deep link works on a cold load.
    await page.goto(`${AUTH_URL}/register`);
    await expect(page.locator('h1')).toHaveText('Admin Registration');

    // Bidirectional links, no full page reload (SPA router). The sentinel on
    // window survives only if the document is never re-evaluated.
    await page.evaluate(() => { window.__spaSentinel = 'alive'; });
    const alive = () => page.evaluate(() => window.__spaSentinel);

    await page.click('a:has-text("Sign in")');
    await expect(page).toHaveURL(`${AUTH_URL}/login`);
    await expect(page.locator('h1')).toHaveText('Admin Login');
    expect(await alive()).toBe('alive');

    await page.click('a:has-text("Register for an account")');
    await expect(page).toHaveURL(`${AUTH_URL}/register`);
    await expect(page.locator('h1')).toHaveText('Admin Registration');
    expect(await alive()).toBe('alive');
  });

  test('FUNC-07: drives the session lifecycle across the REST API and the UI', async ({ page, request }) => {
    // real API only. Every assertion below is about rejecting anonymous
    // callers, which the dev bypass stops doing and the stub cannot demonstrate.
    skipIfAuthBypassed(test);
    skipIfStubbed(test);

    for (const path of ['/auth/me', '/network/nodes', '/network/stats', '/admins']) {
      const res = await request.get(`${API_BASE}${path}`);
      expect(res.status(), `${path} must require a session`).toBe(401);
    }
    expect((await request.post(`${API_BASE}/network/nodes`, { data: { name: 'x', location: 'x', ip: '10.0.0.1' } })).status()).toBe(401);

    // Wrong credentials create no session.
    const rejected = await request.post(`${API_BASE}/auth/login`, { data: { ...ADMIN_CREDENTIALS, password: 'wrong-password' } });
    expect(rejected.status()).toBe(401);
    expect((await request.get(`${API_BASE}/auth/me`)).status()).toBe(401);

    // Correct credentials issue a session cookie.
    await loginAsAdmin(page);
    const session = (await page.context().cookies()).find(c => c.name === 'connect.sid');
    expect(session, 'login must set connect.sid').toBeTruthy();
    expect(session.httpOnly).toBe(true);
    expect(session.path).toBe('/');

    // The session identifies the seeded super admin and stamps lastLogin.
    const { admin } = await apiBody(page, 'GET', '/auth/me');
    expect(admin.email).toBe(ADMIN_CREDENTIALS.email);
    expect(admin.role).toBe('super_admin');
    expect(admin).not.toHaveProperty('password');
    expect(admin.lastLogin).toBeTruthy();

    // The dashboard reflects the authenticated identity.
    await expect(page.locator('aside')).toContainText('Campus System Admin');
    await expect(page.locator('aside')).toContainText('super admin');

    // Signing out destroys the session server-side and returns to auth.
    await page.click('button:has-text("Sign Out")');
    await page.waitForURL(`${AUTH_URL}/login`, { timeout: 20000 });
    expect((await apiRequest(page, 'GET', '/auth/me')).status).toBe(401);
  });

  test('FUNC-08: switches dashboard views client-side and falls back for unknown routes', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(`${DASHBOARD_URL}/`);

    // A marker on window proves the router never reloaded the document.
    await page.evaluate(() => { window.__noReload = true; });
    const noReload = () => page.evaluate(() => window.__noReload);

    const views = [
      { link: 'Admins', url: '/admins', heading: 'Campus Administrators' },
      { link: 'Network', url: '/network', heading: 'Campus Network Infrastructure' },
      { link: 'Dashboard', url: '/', heading: 'Campus Network Dashboard' },
    ];

    for (const { link, url, heading } of views) {
      await page.click(`aside a:has-text("${link}")`);
      await expect(page).toHaveURL(`${DASHBOARD_URL}${url}`);
      await expect(page.locator('h1')).toHaveText(heading);
      expect(await noReload()).toBe(true);
    }

    // The active nav item is tracked, and unknown routes redirect home.
    await expect(page.locator('aside a.bg-secondary')).toContainText('Dashboard');
    await page.goto(`${DASHBOARD_URL}/no-such-page`);
    await expect(page).toHaveURL(`${DASHBOARD_URL}/`);
    await expect(page.locator('h1')).toHaveText('Campus Network Dashboard');
  });

  test('FUNC-09: issues a single-use invite code and completes a real registration', async ({ page }) => {
    // real API only. Single-use consumption and replay rejection are API rules.
    skipIfStubbed(test);

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await loginAsAdmin(page);
    await page.goto(`${DASHBOARD_URL}/admins`);

    // Generate a code and capture the copy confirmation properly.
    await page.click('button:has-text("Create Invite Code")');
    const banner = page.locator('div.border-secondary', { hasText: 'Single-use invite code' });
    await expect(banner).toBeVisible({ timeout: 15000 });

    const code = (await banner.locator('p.font-mono').innerText()).trim();
    expect(code, 'invite codes use the CR-XXXX-XXXX format').toMatch(/^CR-[0-9A-F]{4}-[0-9A-F]{4}$/);

    // The code is persisted server-side and still unconsumed.
    const { invites } = await apiBody(page, 'GET', '/admins/invites');
    expect(invites[0].code).toBe(code);
    expect(invites[0].isUsed).toBe(false);

    // Copy writes the code to the clipboard and confirms with an alert.
    let dialogMessage = null;
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });
    await page.click('button:has-text("Copy")');
    await expect.poll(() => dialogMessage).toBe('Copied to clipboard!');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);

    // Redeem the code through the public registration form.
    const email = `e2e-${uniqueSuffix()}@campus.edu`;
    const registration = await page.context().newPage();
    await registration.goto(`${AUTH_URL}/register`);
    await registration.fill('input#name', 'E2E Test Admin');
    await registration.fill('input#email', email);
    await registration.fill('input#password', STRONG_PASSWORD);
    await registration.fill('input#confirmPassword', STRONG_PASSWORD);
    await registration.fill('input#inviteCode', code);
    await registration.click('button[type="submit"]');
    await expect(registration.locator('[role="alert"]')).toContainText('Account created successfully!');
    await registration.waitForURL(`${AUTH_URL}/login`, { timeout: 15000 });
    await registration.close();

    // The new account is a real, active administrator.
    const created = (await apiBody(page, 'GET', '/admins')).admins.find(a => a.email === email);
    expect(created, 'registered admin must be persisted').toBeTruthy();
    expect(created.role).toBe('admin');
    expect(created.isActive).toBe(true);
    expect(created).not.toHaveProperty('password');

    // And it shows up in the staff table.
    await page.reload();
    const row = page.locator('table.data-table tbody tr', { hasText: email });
    await expect(row).toBeVisible();
    await expect(row).toContainText('E2E Test Admin');
    await expect(row.locator('.chip', { hasText: 'Active' })).toBeVisible();

    // The code cannot be redeemed twice.
    const replay = await page.request.post(`${API_BASE}/auth/register`, {
      data: { name: 'Replay Attempt', email: `replay-${uniqueSuffix()}@campus.edu`, password: STRONG_PASSWORD, inviteCode: code },
    });
    expect(replay.status()).toBe(400);
    expect((await replay.json()).error).toMatch(/Invalid or expired invite code/);

    // Cleanup so the suite leaves the database as it found it.
    await apiBody(page, 'DELETE', `/admins/${created._id}`);
    expect((await apiBody(page, 'GET', '/admins')).admins.some(a => a.email === email)).toBe(false);
  });

  test('FUNC-10: registers a network node, toggles its status and removes it', async ({ page, request }) => {
    // real API only. Load zeroing/clamping and duplicate-IP rejection are API rules.
    skipIfStubbed(test);

    await loginAsAdmin(page);
    await page.goto(`${DASHBOARD_URL}/network`);

    const ip = uniqueIp();
    const name = `AP-Lab-${uniqueSuffix()}`;

    // Create through the modal.
    await page.click('button:has-text("Register Device")');
    await expect(page.locator('h2', { hasText: 'Register Campus Network Device' })).toBeVisible();
    await page.fill('input[placeholder="e.g. CS Lab AP 03"]', name);
    await page.fill('input[placeholder="e.g. Science Bldg 3F"]', 'Engineering Center 3F');
    await page.fill('input[placeholder="192.168.1.120"]', ip);
    await page.selectOption('select', 'switch');
    await page.click('button[type="submit"]:has-text("Add Device")');

    // The card appears in the UI...
    const card = page.locator('.stat-card', { hasText: name });
    const toggle = card.locator('button', { hasText: /^Toggle/ });
    await expect(card).toBeVisible({ timeout: 15000 });
    await expect(card).toContainText(ip);
    await expect(card).toContainText('Engineering Center 3F');
    await expect(card.locator('.chip')).toHaveText('Online');
    await expect(toggle).toHaveText('Toggle Offline');

    // ...and the API agrees.
    const created = (await apiBody(page, 'GET', '/network/nodes')).nodes.find(n => n.ip === ip);
    expect(created, 'node must be persisted').toBeTruthy();
    expect(created.name).toBe(name);
    expect(created.type).toBe('switch');
    expect(created.status).toBe('Online');

    // The IP is unique at the API level too.
    expect((await apiError(page, 'POST', '/network/nodes', 400, { name: 'Dup', location: 'Dup', ip })).error)
      .toMatch(/already exists/);

    // Toggling drives a state change that is visible in the UI and the API.
    await toggle.click();
    await expect(card.locator('.chip')).toHaveText('Offline');
    await expect(toggle).toHaveText('Toggle Online');

    const { nodes: counted } = await apiBody(page, 'GET', '/network/nodes');
    const toggled = counted.find(n => n.ip === ip);
    expect(toggled.status).toBe('Offline');
    expect(toggled.load, 'going offline must zero the reported load').toBe(0);

    // Summary statistics are recomputed from the new state.
    const stats = await apiBody(page, 'GET', '/network/stats');
    expect(stats.totalNodes).toBe(counted.length);
    expect(stats.offlineNodes).toBe(counted.filter(n => n.status === 'Offline').length);
    expect(stats.activeNodes).toBe(counted.filter(n => n.status === 'Online').length);

    // The zeroing rule lives in the API, not just in the UI payload. Patching
    // the status on its own must still reset the load server-side.
    const patch = (p) => apiBody(page, 'PATCH', `/network/nodes/${created._id}/status`, p).then(r => r.node);

    expect((await patch({ load: 90 })).load).toBe(90);
    const forced = await patch({ status: 'Offline' });
    expect(forced.status).toBe('Offline');
    expect(forced.load, 'patching status alone must zero the load server-side').toBe(0);

    // Reported load is clamped into a sane range and unknown statuses ignored.
    expect((await patch({ load: 250 })).load).toBe(100);
    expect((await patch({ load: -20 })).load).toBe(0);
    const bogus = await apiRequest(page, 'PATCH', `/network/nodes/${created._id}/status`, { status: 'Compromised' });
    expect(bogus.status).toBe(200);
    expect(bogus.body.node.status, 'unknown status values are rejected').toBe('Offline');

    // Deleting through the API removes it everywhere, then leaves no residue.
    await apiBody(page, 'DELETE', `/network/nodes/${created._id}`);
    await apiError(page, 'DELETE', `/network/nodes/${created._id}`, 404);
    expect((await apiBody(page, 'GET', '/network/nodes')).nodes.some(n => n.ip === ip)).toBe(false);

    // Unknown node ids are rejected rather than silently ignored.
    // Skipped under the dev bypass, where a forged cookie is let through.
    if (!AUTH_BYPASS) {
      expect((await request.get(`${API_BASE}/network/nodes`, { headers: { cookie: 'connect.sid=forged' } })).status()).toBe(401);
    }
  });
});
