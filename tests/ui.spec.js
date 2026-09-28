import { test, expect } from '@playwright/test';
import {
  AUTH_URL,
  DASHBOARD_URL,
  apiBody,
  box,
  css,
  domTexts,
  expectCentred,
  expectCss,
  expectCssSettles,
  expectNoOverflow,
  loginAsAdmin,
  passwordToggle,
  strengthSegments,
} from './helpers.js';

/**
 * UI coverage: visual rendering, element visibility, styling, responsive
 * layout and component states.
 *
 * Where a value is only *rendered* as uppercase because of CSS
 * `text-transform`, the assertion checks the computed style rather than the
 * DOM text, so the test fails if the visual treatment regresses.
 */
test.describe('ReRoute — UI Validation (10 checks)', () => {
  test('UI-01: renders login branding, iconography and typography', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    await expect(page).toHaveTitle(/reroute/i);
    await expect(page.locator('h1')).toHaveText('Admin Login');
    await expect(page.locator('p', { hasText: 'ReRoute Campus Network' })).toBeVisible();
    await expect(page.locator('span.material-symbols-outlined', { hasText: 'router' })).toBeVisible();

    // The card is the centred visual container.
    const card = page.locator('.auth-card');
    await expect(card).toBeVisible();
    await expectCss(card, { borderRadius: '12px', borderTopWidth: '1px' });
    expect((await css(card, 'boxShadow')).boxShadow).not.toBe('none');

    // Design-system typography: Inter, 24px semibold heading.
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain('Inter');
    await expectCss(page.locator('h1'), { fontSize: '24px', fontWeight: '600', textAlign: 'center' });

    // The brand line is tracked and uppercased.
    const brand = page.locator('p', { hasText: 'ReRoute Campus Network' });
    const brandStyle = await css(brand, 'textTransform', 'letterSpacing');
    expect(brandStyle.textTransform).toBe('uppercase');
    expect(parseFloat(brandStyle.letterSpacing)).toBeGreaterThan(0);
  });

  test('UI-02: renders the login form controls with correct labels and styling', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    // Labels are programmatically associated with their inputs. The login
    // screen renders its own "Password" label next to the field component's
    // empty one, so target the labelled copy.
    await expect(page.locator('label[for="email"]')).toHaveText('Email');
    await expect(page.locator('label[for="password"]', { hasText: 'Password' })).toHaveText('Password');

    for (const [id, placeholder, type] of [['email', 'admin@campus.edu', 'email'], ['password', '••••••••', 'password']]) {
      const field = page.locator(`input#${id}`);
      await expect(field).toBeVisible();
      await expect(field).toHaveAttribute('placeholder', placeholder);
      await expect(field).toHaveAttribute('type', type);
    }

    // The reveal toggle is exposed to assistive technology.
    await expect(passwordToggle(page, 'password')).toBeVisible();

    // Primary button treatment.
    const submit = page.locator('button[type="submit"]');
    await expect(submit).toBeVisible();
    await expect(submit).toHaveText('Sign in');
    await expectCss(submit, {
      height: '48px', borderRadius: '8px', display: 'flex', backgroundColor: 'rgb(0, 81, 213)',
    });

    // Secondary affordances.
    const forgot = page.locator('a', { hasText: 'Forgot?' });
    await expect(forgot).toBeVisible();
    await expect(forgot).toHaveAttribute('href', '#');
    await expect(page.locator('a', { hasText: 'Register for an account' })).toBeVisible();

    // Error styling: red border on the control, red helper text beneath it.
    await page.click('button[type="submit"]');
    const fieldError = page.locator('p.field-error').first();
    await expect(fieldError).toBeVisible();
    await expectCss(fieldError, 'color', 'rgb(186, 26, 26)');
    await expectCssSettles(page.locator('input#email'), 'borderTopColor', 'rgb(186, 26, 26)');
  });

  test('UI-03: renders registration branding and header block', async ({ page }) => {
    await page.goto(`${AUTH_URL}/register`);

    await expect(page).toHaveTitle(/reroute/i);
    await expect(page.locator('h1')).toHaveText('Admin Registration');
    await expect(page.locator('p', { hasText: 'ReRoute Campus Network' })).toBeVisible();
    await expect(page.locator('span.material-symbols-outlined', { hasText: 'manage_accounts' })).toBeVisible();

    // The header block stacks the icon above the heading above the brand line.
    const header = page.locator('.auth-card > div').first();
    const y = async (sel) => (await box(header.locator(sel).first())).y;
    const [icon, heading, brand] = [await y('span.material-symbols-outlined'), await y('h1'), await y('p')];
    expect(icon).toBeLessThan(heading);
    expect(heading).toBeLessThan(brand);

    // Same card treatment as the login screen.
    await expectCss(page.locator('.auth-card'), 'borderRadius', '12px');
  });

  test('UI-04: renders every registration field and its component states', async ({ page }) => {
    await page.goto(`${AUTH_URL}/register`);

    const fields = [
      ['name', 'Full Name', 'Jane Doe', 'text'],
      ['email', 'Email Address', 'jane@university.edu', 'email'],
      ['password', 'Password', '••••••••', 'password'],
      ['confirmPassword', 'Confirm Password', '••••••••', 'password'],
      ['inviteCode', 'Admin Invite Code', 'CR-XXXX-XXXX', 'text'],
    ];
    for (const [id, label, placeholder, type] of fields) {
      await expect(page.locator(`label[for="${id}"]`)).toHaveText(label);
      const input = page.locator(`input#${id}`);
      await expect(input).toBeVisible();
      await expect(input).toHaveAttribute('placeholder', placeholder);
      await expect(input).toHaveAttribute('type', type);
    }

    const submit = page.locator('button[type="submit"]');
    await expect(submit).toHaveText('Create Account');
    await expectCss(submit, 'height', '48px');

    // Both password fields expose an independent reveal toggle.
    for (const id of ['password', 'confirmPassword']) {
      await expect(passwordToggle(page, id)).toBeVisible();
    }

    // Component state: the strength meter is hidden while empty, then appears.
    await expect(strengthSegments(page)).toHaveCount(0);
    await page.locator('input#password').fill('Abcdefgh12');
    await expect(strengthSegments(page)).toHaveCount(4);
    await expect(page.locator('p.text-label-sm', { hasText: 'Good password' })).toBeVisible();
    await page.locator('input#password').fill('');
    await expect(strengthSegments(page)).toHaveCount(0);

    // Component state: fields enter a disabled style while the form submits.
    await page.route('**/api/auth/register', async route => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.abort();
    });
    for (const [id, value] of Object.entries({
      name: 'State Check', email: 'state@campus.edu', password: 'Str0ng!Pass#2026',
      confirmPassword: 'Str0ng!Pass#2026', inviteCode: 'CR-CAMPUS-2026',
    })) {
      await page.fill(`input#${id}`, value);
    }
    await page.click('button[type="submit"]');

    await expect(submit).toBeDisabled();
    await expect(submit).toContainText('Creating Account');
    await expectCss(submit, 'opacity', '0.7');
    await expect(page.locator('input#email')).toBeDisabled();
    await expect(page.locator('span.material-symbols-outlined.animate-spin')).toBeVisible();

    // Footer link returns to the login screen.
    const signIn = page.locator('a', { hasText: 'Sign in' });
    await expect(signIn).toBeVisible();
    await expect(signIn).toHaveAttribute('href', '/login');
    await expect(page.locator('p', { hasText: 'Already have an account?' })).toBeVisible();
  });

  test('UI-05: lays out the auth screens responsively from mobile to desktop', async ({ page }) => {
    const card = page.locator('.auth-card');

    // Desktop: the card is capped at 440px and horizontally centred.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${AUTH_URL}/login`);
    await expect(page.locator('h1')).toHaveText('Admin Login');
    expect((await box(card)).width).toBe(440);
    await expectCentred(card, 1280);
    await expectNoOverflow(page, 1280);

    // Mobile: the card shrinks to the viewport gutters, nothing overflows.
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${AUTH_URL}/login`, { waitUntil: 'networkidle' });
    const mobile = await box(card);
    expect(mobile.x).toBeGreaterThanOrEqual(0);
    expect(mobile.x + mobile.width).toBeLessThanOrEqual(375);
    await expectNoOverflow(page, 375);
    // Controls stay large enough to tap.
    expect((await box(page.locator('button[type="submit"]'))).height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('input#email')).toBeVisible();

    // The tallest form is the registration screen — it must not overflow either.
    await page.goto(`${AUTH_URL}/register`, { waitUntil: 'networkidle' });
    const mobileCard = await box(card);
    expect(mobileCard.x + mobileCard.width).toBeLessThanOrEqual(375);
    await expectNoOverflow(page, 375);
    await expect(page.locator('input#inviteCode')).toBeVisible();

    // Tablet: the card stays centred and within the gutter.
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${AUTH_URL}/login`);
    expect((await box(card)).width).toBe(440);
    await expectCentred(card, 768);
  });

  test('UI-06: renders the dashboard sidebar with active and idle nav states', async ({ page }) => {
    await loginAsAdmin(page);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toContainText('ReRoute');
    await expect(sidebar).toContainText('Admin Portal');

    // The sidebar is a fixed 256px rail.
    expect((await box(sidebar)).width).toBe(256);
    await expectCss(sidebar, { position: 'fixed', backgroundColor: 'rgb(19, 27, 46)' });

    for (const label of ['Dashboard', 'Admins', 'Network']) {
      await expect(sidebar.locator('a', { hasText: label })).toBeVisible();
    }

    // Active state is visually distinct from the idle state.
    const active = sidebar.locator('a.bg-secondary');
    await expect(active).toHaveCount(1);
    await expect(active).toContainText('Dashboard');
    await expectCss(active, 'backgroundColor', 'rgb(0, 81, 213)');
    const idle = sidebar.locator('a', { hasText: 'Admins' });
    await expectCss(idle, 'backgroundColor', 'rgba(0, 0, 0, 0)');

    // The active highlight follows the route.
    await idle.click();
    await expect(sidebar.locator('a.bg-secondary')).toContainText('Admins');

    // Identity badge reflects the live session.
    await expect(sidebar.locator('p', { hasText: 'Logged In As' })).toBeVisible();
    await expect(sidebar).toContainText('Campus System Admin');
    await expect(sidebar).toContainText('super admin');

    // Sign out control.
    const signOut = sidebar.locator('button', { hasText: 'Sign Out' });
    await expect(signOut).toBeVisible();
    expect((await box(signOut)).width).toBeGreaterThan(180);
  });

  test('UI-07: renders the four KPI cards with live values and load bar', async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.locator('h1')).toHaveText('Campus Network Dashboard');
    await expect(page.locator('p', { hasText: 'Real-time status and telemetry' })).toBeVisible();

    const cards = page.locator('main .stat-card');
    await expect(cards).toHaveCount(4);

    for (const label of ['TOTAL ADMINS', 'ACTIVE NODES', 'OFFLINE NODES', 'AVG NETWORK LOAD']) {
      await expect(page.locator('.stat-card p', { hasText: label })).toBeVisible();
    }

    // KPI numbers are rendered from the API, so cross-check them.
    const stats = await apiBody(page, 'GET', '/network/stats');
    const admins = await apiBody(page, 'GET', '/admins');
    const texts = (await cards.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
    expect(texts[0]).toContain(String(Math.max(admins.admins.length, 1)));
    expect(texts[1]).toContain(String(stats.activeNodes));
    expect(texts[2]).toContain(String(stats.offlineNodes));
    expect(texts[3]).toContain(`${stats.networkLoad}%`);

    // The average-load meter is sized proportionally to the value.
    const bar = cards.nth(3).locator('div.h-1\\.5 > div');
    expect(await bar.evaluate(el => el.style.width)).toBe(`${stats.networkLoad}%`);
    await expectCss(bar, 'height', '6px');

    // Cards share a consistent surface treatment.
    const radius = (await css(cards.first(), 'borderRadius')).borderRadius;
    for (let i = 0; i < 4; i++) {
      expect((await css(cards.nth(i), 'borderRadius')).borderRadius).toBe(radius);
    }
  });

  test('UI-08: renders the device health table with styled headers and hover state', async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.locator('h2', { hasText: 'Campus Device Health' })).toBeVisible();
    await expect(page.locator('span.chip', { hasText: 'Live Telemetry' })).toBeVisible();

    // Header labels and order.
    const headers = page.locator('table.data-table thead th');
    await expect(headers).toHaveCount(7);
    expect(await domTexts(headers)).toEqual([
      'Device Name', 'Location', 'IP Address', 'Type', 'Uptime', 'Load', 'Status',
    ]);

    // Header cells are visually styled as uppercase micro-labels.
    await expectCss(headers.first(), {
      textTransform: 'uppercase', fontSize: '12px', backgroundColor: 'rgb(242, 244, 246)',
    });

    // Telemetry badge uses the online chip treatment.
    await expectCss(page.locator('span.chip', { hasText: 'Live Telemetry' }), 'backgroundColor', 'rgb(220, 252, 231)');

    // Rows render real data, and gain a highlight on hover.
    const rows = page.locator('table.data-table tbody tr');
    await expect(rows.first()).toBeVisible();
    await expect(rows).toHaveCount(Math.max((await apiBody(page, 'GET', '/network/stats')).totalNodes, 1));

    const firstCell = rows.first().locator('td').first();
    const before = (await css(firstCell, 'backgroundColor')).backgroundColor;
    await rows.first().hover();
    await expectCssSettles(firstCell, 'backgroundColor', 'rgb(242, 244, 246)');
    expect(before).not.toBe('rgb(242, 244, 246)');

    // Status cells are uppercased visually via text-transform.
    await expectCss(rows.first().locator('.chip'), 'textTransform', 'uppercase');
  });

  test('UI-09: renders the administrators table with role and status treatments', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${DASHBOARD_URL}/admins`);

    await expect(page.locator('h1')).toHaveText('Campus Administrators');
    await expect(page.locator('p', { hasText: 'Maintain authorized accounts' })).toBeVisible();

    const createBtn = page.locator('button', { hasText: 'Create Invite Code' });
    await expect(createBtn).toBeVisible();
    await expectCss(createBtn, 'backgroundColor', 'rgb(0, 81, 213)');

    await expect(page.locator('h2', { hasText: 'Authorized Staff' })).toBeVisible();
    const headers = page.locator('table.data-table thead th');
    await expect(headers).toHaveCount(6);
    expect(await domTexts(headers)).toEqual([
      'Admin Name', 'Email Address', 'Assigned Role', 'Registered Date', 'Account Status', 'Actions',
    ]);

    const { admins } = await apiBody(page, 'GET', '/admins');
    const rows = page.locator('table.data-table tbody tr');
    await expect(rows).toHaveCount(admins.length);

    // Rows follow the API ordering (newest registration first).
    await expect(rows.locator('td:nth-child(2)')).toHaveText(admins.map(a => a.email));

    const superAdmin = admins.find(a => a.role === 'super_admin');
    const superRow = page.locator('table.data-table tbody tr', { hasText: superAdmin.email });
    await expect(superRow).toHaveCount(1);

    // Initials avatar is derived from the account name.
    const avatar = superRow.locator('td div.rounded-full');
    await expect(avatar).toHaveText(superAdmin.name.slice(0, 2).toUpperCase());
    await expectCss(avatar, 'borderRadius', '9999px');

    // Role chip is a neutral surface, uppercased visually.
    const roleChip = superRow.locator('.chip').first();
    await expect(roleChip).toHaveText('super admin');
    await expectCss(roleChip, { textTransform: 'uppercase', backgroundColor: 'rgb(236, 238, 240)' });

    // Account status chip is colour-coded green for an enabled account.
    await expectCss(superRow.locator('.chip').nth(1), {
      backgroundColor: 'rgb(220, 252, 231)', color: 'rgb(21, 128, 61)',
    });

    // The super admin row offers no self-revoke control; regular admins do.
    await expect(superRow.locator('button')).toHaveCount(0);
    for (const admin of admins.filter(a => a.role !== 'super_admin')) {
      await expect(page.locator('table.data-table tbody tr', { hasText: admin.email }).locator('button')).toHaveCount(1);
    }
  });

  test('UI-10: renders network device cards, status colours and the registration modal', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${DASHBOARD_URL}/network`);

    await expect(page.locator('h1')).toHaveText('Campus Network Infrastructure');
    await expect(page.locator('p', { hasText: 'Access point routers' })).toBeVisible();

    // Cards are laid out in a responsive grid.
    const cards = page.locator('.stat-card');
    await expect(cards.first()).toBeVisible();
    await expectCss(page.locator('div.grid').first(), 'display', 'grid');

    // Every device card shows its identifying details and a load meter.
    const first = cards.first();
    for (const label of ['IP Address', 'Hardware Type', 'Uptime', 'Current Load']) {
      await expect(first.locator('span', { hasText: label })).toBeVisible();
    }
    const meter = first.locator('div.h-1\\.5');
    await expect(meter).toBeVisible();
    await expectCss(meter, 'borderRadius', '9999px');

    // Status chips are uppercased visually and colour-coded.
    const statusChips = cards.locator('.chip');
    await expect(statusChips.first()).toBeVisible();
    for (let i = 0; i < await statusChips.count(); i++) {
      await expectCss(statusChips.nth(i), 'textTransform', 'uppercase');
    }

    // The register action is present on the page header.
    const registerBtn = page.locator('button', { hasText: 'Register Device' });
    await expect(registerBtn).toBeVisible();

    // Opening the modal reveals a fixed, dimmed overlay.
    await registerBtn.click();
    const overlay = page.locator('div.fixed.inset-0');
    await expect(overlay).toBeVisible();
    await expectCss(overlay, { position: 'fixed', backgroundColor: 'rgba(0, 0, 0, 0.4)' });

    const modal = page.locator('div.fixed h2', { hasText: 'Register Campus Network Device' });
    await expect(modal).toBeVisible();
    for (const label of ['Device Name', 'Campus Location', 'Static IP Address', 'Device Type']) {
      await expect(page.locator('div.fixed label', { hasText: label })).toBeVisible();
    }
    await expect(page.locator('div.fixed input[placeholder="e.g. CS Lab AP 03"]')).toBeVisible();
    await expect(page.locator('div.fixed input[placeholder="192.168.1.120"]')).toBeVisible();
    expect(await page.locator('div.fixed select option').allInnerTexts()).toEqual([
      'Access Point (Wi-Fi)', 'Managed Switch', 'Core Gateway', 'Border Router',
    ]);

    // Cancel dismisses the modal without creating anything.
    await page.locator('div.fixed button', { hasText: 'Cancel' }).click();
    await expect(overlay).toHaveCount(0);
    await expect(page.locator('h2', { hasText: 'Register Campus Network Device' })).toHaveCount(0);
  });
});

/**
 * Defects found while building the suite. These encode the *expected*
 * behaviour and are marked `fixme`, so they document the bug without
 * reddening the run. Flip them to `test` once the app is corrected.
 */
test.describe('Known defects (expected behaviour, currently unimplemented)', () => {
  test.fixme('DEFECT-01: dashboard collapses below desktop — the fixed 256px sidebar is not collapsible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${DASHBOARD_URL}/`);
    await expect(page.locator('h1')).toBeInViewport();

    // Expected: sidebar becomes an overlay/hamburger and the content column
    // uses the full viewport width. Actual: main is pushed to x=256 and
    // shrinks to ~119px, so the heading and cards sit off-screen.
    const main = await box(page.locator('main'));
    expect(main.x).toBe(0);
    expect(main.width).toBeGreaterThanOrEqual(375);
  });

  test.fixme('DEFECT-02: pending-status chips are unstyled because .chip-pending never reaches the CSS bundle', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${DASHBOARD_URL}/network`);

    const pending = page.locator('.chip', { hasText: /pending/i }).first();
    await expect(pending).toBeVisible();

    // Expected: the yellow "pending" treatment declared in index.css.
    await expectCss(pending, { backgroundColor: 'rgb(254, 249, 195)', color: 'rgb(161, 98, 7)' });
  });
});
