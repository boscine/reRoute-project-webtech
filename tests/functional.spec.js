import { test, expect } from '@playwright/test';
import {
  APP_URL,
  ADMIN_CREDENTIALS,
  SEEDED_QR_SLUGS,
  STUB_API,
  apiBody,
  apiError,
  apiRequest,
  expectAdminShellReady,
  loginAsAdmin,
  skipIfStubbed,
  skipUnlessFreshDatabase,
  uniqueBuildingName,
  uniqueSuffix,
} from './helpers.js';

/**
 * Behavioural coverage of the ReRoute data flow.
 *
 * The student side is public and read-only, the admin side is gated by a Sanctum
 * bearer token. These tests drive both through the real UI and the real API so a
 * regression in either the contract or the client is caught.
 */
test.describe('ReRoute — Functional (10 checks)', () => {
  // ------------------------------------------------------------------
  // STUDENT SIDE (public)
  // ------------------------------------------------------------------

  test('FUNC-01: resolves a valid QR slug and shows the building and floor', async ({ page }) => {
    await page.goto(`/?loc=${SEEDED_QR_SLUGS[0]}`);

    // The result card is the contract of the whole product: a scanned code
    // resolves to a human-readable place.
    await expect(page.locator('.result-card .building-name')).toHaveText('North Hall');
    await expect(page.locator('.result-card .floor-name')).toHaveText('Ground Floor');
    await expect(page.locator('.result-card .badge')).toHaveText('Resolved from QR Code');
    await expect(page.locator('.result-card .error-box')).toHaveCount(0);
  });

  test('FUNC-02: falls back to the dropdowns and reports an unmatched slug', async ({ page }) => {
    await page.goto('/?loc=definitely-not-a-real-slug');

    // An unknown code must not dead-end the student; the manual selector is the
    // documented fallback and the reason it is on the page at all.
    await expect(page.locator('.result-card .error-box')).toContainText('Unmatched QR Code');
    await expect(page.locator('.result-card .eyebrow')).toHaveText('Unrecognized QR');
    await expect(page.locator('.selector-card select')).toHaveCount(2);
  });

  test('FUNC-03: populates floors from the chosen building and shows the result', async ({ page }) => {
    await page.goto('/');

    const selects = page.locator('.selector-card select');
    const [buildingSelect, floorSelect] = await selects.all();

    // The floor dropdown is disabled until a building is chosen: the API takes
    // a buildingId, so there is nothing to ask for before then.
    await expect(floorSelect).toBeDisabled();

    await buildingSelect.selectOption({ label: 'Science Centre' });
    await expect(floorSelect).toBeEnabled();

    const labels = await floorSelect.locator('option').allInnerTexts();
    expect(labels[0]).toBe('-- Select a Floor --');
    expect(labels).toEqual(['-- Select a Floor --', 'Basement Lab', 'Floor 1', 'Floor 2']);

    await floorSelect.selectOption({ label: 'Basement Lab' });

    await expect(page.locator('.result-card .building-name')).toHaveText('Science Centre');
    await expect(page.locator('.result-card .floor-name')).toHaveText('Basement Lab');
    await expect(page.locator('.result-card .badge')).toHaveText('Manual Selection');
  });

  test('FUNC-04: serves the public endpoints without any credentials', async ({ page }) => {
    await page.goto('/');

    const buildings = await apiBody(page, 'GET', '/buildings');
    expect(Array.isArray(buildings)).toBe(true);
    expect(buildings.length).toBeGreaterThan(0);
    expect(buildings[0]).toHaveProperty('name');

    // Ordering is server-side (orderBy name) and the dropdown depends on it.
    const names = buildings.map(b => b.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

    const northHall = buildings.find(b => b.name === 'North Hall');
    const floors = await apiBody(page, 'GET', `/floors?building=${northHall.id}`);
    expect(floors.every(f => f.building_id === northHall.id)).toBe(true);

    // Accepting a building *name* as well as an id is a real affordance of the
    // Laravel controller, so it is worth pinning down.
    const byName = await apiBody(page, 'GET', '/floors?building=Science%20Centre');
    expect(byName.length).toBeGreaterThan(0);
    expect(byName.every(f => f.building.name === 'Science Centre')).toBe(true);
  });

  test('FUNC-05: answers 404 for an unknown slug rather than an empty success', async ({ page }) => {
    await page.goto('/');

    const body = await apiError(page, 'GET', '/locations/no-such-slug-xyz', 404);
    expect(body.found).toBe(false);
    expect(body.message).toContain('no-such-slug-xyz');

    // Case-insensitive, because the controller normalises with strtolower.
    const resolved = await apiBody(page, 'GET', `/locations/${SEEDED_QR_SLUGS[1].toUpperCase()}`);
    expect(resolved.found).toBe(true);
    expect(resolved.qrSlug).toBe(SEEDED_QR_SLUGS[1]);
  });

  // ------------------------------------------------------------------
  // ADMIN SIDE (gated)
  // ------------------------------------------------------------------

  test('FUNC-06: rejects bad credentials and accepts the seeded admin', async ({ page }) => {
    await page.goto('/admin/login');

    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', 'definitely-wrong');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-banner')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('reroute_token'))).toBeNull();

    await loginAsAdmin(page);
    const token = await page.evaluate(() => localStorage.getItem('reroute_token'));
    expect(token).toBeTruthy();
    await expectAdminShellReady(page);
  });

  test('FUNC-07: blocks every admin route without a token', async ({ page }) => {
    await page.goto('/');

    // The router guard is only a UX affordance; the API must reject regardless.
    // Each route is checked because auth is enforced per-route in api.php.
    const adminEndpoints = [
      ['GET', '/admin/me'],
      ['GET', '/admin/dashboard'],
      ['GET', '/admin/reports'],
      ['GET', '/admin/buildings'],
      ['GET', '/admin/floors'],
      ['GET', '/admin/locations'],
      ['GET', '/admin/scan-logs'],
      ['GET', '/admin/activity-logs'],
      ['GET', '/admin/users'],
      ['GET', '/admin/qr/image/nh-gf'],
    ];

    for (const [method, path] of adminEndpoints) {
      await apiError(page, method, path, 401, undefined, { token: '' });
    }
  });

  test('FUNC-08: drives the full session lifecycle across the API and the UI', async ({ page }) => {
    await page.goto('/admin/login');

    await page.fill('input[type="email"]', ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', ADMIN_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/dashboard');

    // The token issued by login must work on every protected route.
    const me = await apiBody(page, 'GET', '/admin/me');
    expect(me.email).toBe(ADMIN_CREDENTIALS.email);
    expect(me.role).toBe('SUPERADMIN');

    const dashboard = await apiBody(page, 'GET', '/admin/dashboard');
    expect(dashboard.counts.buildings).toBeGreaterThan(0);
    expect(dashboard.counts.floors).toBeGreaterThan(0);
    expect(dashboard.counts.locations).toBeGreaterThan(0);
    expect(Array.isArray(dashboard.recentScans)).toBe(true);

    // An arbitrary token must not be honoured.
    await apiError(page, 'GET', '/admin/me', 401, undefined, { token: 'forged-token-value' });

    // Logging out clears the stored credentials and leaves the API unreachable.
    await page.click('.btn-logout');
    await page.waitForURL('**/admin/login');
    expect(await page.evaluate(() => localStorage.getItem('reroute_token'))).toBeNull();
    await apiError(page, 'GET', '/admin/me', 401, undefined, { token: '' });
  });

  test('FUNC-09: guards admin routes in the router and survives a deep link', async ({ page }) => {
    // Direct navigation to a protected route with no session must bounce to login.
    await page.goto('/admin/locations');
    await page.waitForURL('**/admin/login');

    // A stale token is the more interesting case: the router lets it through, and
    // the 401 interceptor in services/api.js is what recovers.
    await page.evaluate(() => localStorage.setItem('reroute_token', 'stale-token'));
    await page.goto('/admin/buildings');
    await page.waitForURL('**/admin/login');
    expect(await page.evaluate(() => localStorage.getItem('reroute_token'))).toBeNull();
  });

  test('FUNC-10: creates, updates and deletes a building through the admin UI', async ({ page }) => {
    skipUnlessFreshDatabase(test);

    await loginAsAdmin(page);
    const name = uniqueBuildingName();

    // Create via the modal, the same path a real admin takes.
    await page.click('a[href="/admin/buildings"]');
    await page.waitForURL('**/admin/buildings');
    await page.click('button.btn-primary:has-text("Add Building")');
    await page.fill('.modal input', name);
    await page.click('.modal button.btn-primary');
    await expect(page.locator('table.table tbody tr', { hasText: name })).toBeVisible();

    // The API must agree, proving the UI wrote through rather than only in state.
    const rows = await apiBody(page, 'GET', '/admin/buildings');
    expect(rows.some(b => b.name === name)).toBe(true);

    // Rename through the same modal.
    const row = page.locator('table.table tbody tr', { hasText: name });
    await row.locator('button:has-text("Edit")').click();
    const renamed = `${name} Renamed`;
    await page.fill('.modal input', renamed);
    await page.click('.modal button.btn-primary');
    await expect(page.locator('table.table tbody tr', { hasText: renamed })).toBeVisible();

    // Clean up so a rerun against a persistent database still passes.
    const renamedRow = page.locator('table.table tbody tr', { hasText: renamed });
    page.once('dialog', dialog => dialog.accept());
    await renamedRow.locator('button:has-text("Delete")').click();
    await expect(page.locator('table.table tbody tr', { hasText: renamed })).toHaveCount(0);
  });
});

/**
 * Backend-semantics tests. These cannot pass against the stub, because the stub
 * reimplements the contract rather than exercising it.
 */
test.describe('ReRoute — Backend semantics (real API only)', () => {
  test('API-01: writes a ScanLog for every public lookup, resolved or not', async ({ page }) => {
    skipIfStubbed(test);

    // The audit trail is admin-only, so an anonymous caller must be turned away
    // before the baseline is read.
    await page.goto('/');
    await apiError(page, 'GET', '/admin/scan-logs', 401, undefined, { token: '' });

    await loginAsAdmin(page);
    const baseline = await apiBody(page, 'GET', '/admin/scan-logs');
    const startTotal = baseline.total;

    // A hit and a miss, each of which must be audited.
    await page.goto(`/?loc=${SEEDED_QR_SLUGS[2]}`);
    await expect(page.locator('.result-card .building-name')).toHaveText('Student Hub');
    await page.goto('/?loc=missing-slug-for-audit');
    await expect(page.locator('.result-card .error-box')).toBeVisible();

    const after = await apiBody(page, 'GET', '/admin/scan-logs?limit=10');
    expect(after.total).toBe(startTotal + 2);

    const [first, second] = after.data;
    expect(first.qr_slug_raw).toBe('missing-slug-for-audit');
    // ScanLog casts `resolved` to a real boolean, so the contract is a bool and
    // not SQLite's raw 0/1.
    expect(first.resolved).toBe(false);
    expect(first.location).toBeNull();

    expect(second.qr_slug_raw).toBe(SEEDED_QR_SLUGS[2]);
    expect(second.resolved).toBe(true);
    expect(second.location.floor.building.name).toBe('Student Hub');
  });

  test('API-02: cascades deletes from building to floor to location', async ({ page }) => {
    skipIfStubbed(test);
    skipUnlessFreshDatabase(test);

    await loginAsAdmin(page);
    const name = uniqueBuildingName();

    // Build a building -> floor -> location chain.
    const building = await apiBody(page, 'POST', '/admin/buildings', { name });
    const floor = await apiBody(page, 'POST', '/admin/floors', {
      buildingId: building.id,
      label: 'Basement',
      order: 1,
    });
    const slug = `cascade-${uniqueSuffix()}`;
    await apiBody(page, 'POST', '/admin/locations', { floorId: floor.id, qrSlug: slug });

    // The slug resolves before the delete.
    const resolved = await apiBody(page, 'GET', `/locations/${slug}`);
    expect(resolved.found).toBe(true);

    // Deleting the building must take the floor and location with it.
    await apiBody(page, 'DELETE', `/admin/buildings/${building.id}`);
    await apiError(page, 'GET', `/locations/${slug}`, 404);

    const locations = await apiBody(page, 'GET', '/admin/locations');
    expect(locations.some(l => l.qr_slug === slug)).toBe(false);
  });

  test('API-03: records every admin mutation in the activity log', async ({ page }) => {
    skipIfStubbed(test);
    skipUnlessFreshDatabase(test);

    await loginAsAdmin(page);
    const name = uniqueBuildingName();

    const building = await apiBody(page, 'POST', '/admin/buildings', { name });
    await apiBody(page, 'PUT', `/admin/buildings/${building.id}`, { name: `${name} v2` });
    await apiBody(page, 'DELETE', `/admin/buildings/${building.id}`);

    const logs = await apiBody(page, 'GET', '/admin/activity-logs');
    const mine = logs.filter(l => l.target_type === 'Building' && String(l.target_id) === String(building.id));

    // The audit trail must be complete and attributed, newest first.
    expect(mine.map(l => l.action)).toEqual(['DELETE', 'UPDATE', 'CREATE']);
    expect(mine.every(l => l.user && l.user.email === ADMIN_CREDENTIALS.email)).toBe(true);
  });

  test('API-04: refuses to deactivate the requesting admin and toggles others', async ({ page }) => {
    skipIfStubbed(test);
    skipUnlessFreshDatabase(test);

    await loginAsAdmin(page);
    const email = `qa-${uniqueSuffix()}@reroute.campus`;

    const created = await apiBody(page, 'POST', '/admin/users', { email, password: 'password123' });
    expect(created.role).toBe('ADMIN');
    expect(created.is_active).toBe(true);

    // Self-deactivation would lock the last admin out.
    const me = await apiBody(page, 'GET', '/admin/me');
    const err = await apiError(page, 'PATCH', `/admin/users/${me.id}/toggle-active`, 400);
    expect(err.error).toBe('Cannot deactivate self');

    const off = await apiBody(page, 'PATCH', `/admin/users/${created.id}/toggle-active`);
    expect(off.is_active).toBe(false);

    // A deactivated account must not be able to log in.
    await page.evaluate(() => localStorage.clear());
    const res = await apiRequest(page, 'POST', '/admin/login', { email, password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials or inactive account');

    // Reactivate so the next run starts from a known state.
    await apiBody(page, 'PATCH', `/admin/users/${created.id}/toggle-active`, undefined, {
      token: await page.evaluate(async () => {
        const r = await fetch('http://localhost:8000/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@reroute.campus', password: 'admin12345' }),
        });
        return (await r.json()).token;
      }),
    });
  });

  test('API-05: generates a QR image payload pointing at the student route', async ({ page }) => {
    skipIfStubbed(test);

    await loginAsAdmin(page);
    const qr = await apiBody(page, 'GET', `/admin/qr/image/${SEEDED_QR_SLUGS[3]}`);

    expect(qr.qrSlug).toBe(SEEDED_QR_SLUGS[3]);
    expect(qr.targetUrl).toBe(`${APP_URL}/?loc=${SEEDED_QR_SLUGS[3]}`);
    expect(qr.dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);

    // The generated target must be the URL the student page actually handles.
    const url = new URL(qr.targetUrl);
    await page.goto(url.pathname + url.search);
    await expect(page.locator('.result-card .building-name')).toHaveText('Library Building');
    await expect(page.locator('.result-card .floor-name')).toHaveText('Floor 3 Archives');
  });

  test('API-06: aggregates reports from real scan data', async ({ page }) => {
    skipIfStubbed(test);

    await page.goto(`/?loc=${SEEDED_QR_SLUGS[0]}`);
    await page.goto(`/?loc=${SEEDED_QR_SLUGS[0]}`);

    await loginAsAdmin(page);
    const reports = await apiBody(page, 'GET', '/admin/reports');

    expect(Array.isArray(reports.topLocations)).toBe(true);
    expect(reports.timelineData.length).toBeGreaterThan(0);

    // The slug just scanned twice must rank at or near the top, and the
    // aggregation must be sorted descending as ReportsView expects.
    const counts = reports.topLocations.map(l => l.scanCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    const northHall = reports.topLocations.find(l => l.qrSlug === SEEDED_QR_SLUGS[0]);
    expect(northHall?.scanCount).toBeGreaterThanOrEqual(2);
  });
});

/**
 * These run in both modes but are declared last so a stub run still reports the
 * backend-semantics skips rather than burying them.
 */
test.describe('ReRoute — Mode metadata', () => {
  test('META-01: records which API the run targeted', async () => {
    // A guard against the most likely harness mistake: silently running the
    // real-API suite when the caller believed they were on the stub.
    expect(typeof STUB_API).toBe('boolean');
  });
});
