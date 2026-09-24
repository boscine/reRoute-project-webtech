import { test, expect } from '@playwright/test';
import { AUTH_URL, DASHBOARD_URL, loginAsAdmin } from './helpers.js';

test.describe('ReRoute Campus Platform - UI Test Suite (10 Test Cases)', () => {
  // Test Case 1: Login Page Branding & Typography
  test('UI-01: Displays admin login branding, router icon, and title', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    await expect(page).toHaveTitle(/Reroute/i);
    await expect(page.locator('h1')).toContainText('Admin Login');
    await expect(page.locator('text=ReRoute Campus Network')).toBeVisible();
    await expect(page.locator('span.material-symbols-outlined:has-text("router")')).toBeVisible();
  });

  // Test Case 2: Login Page Form Layout & Controls
  test('UI-02: Displays login input fields, placeholders, and buttons', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'admin@campus.edu');

    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('placeholder', '••••••••');

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Sign in');

    await expect(page.locator('a:has-text("Forgot?")')).toBeVisible();
  });

  // Test Case 3: Registration Page Branding & Header
  test('UI-03: Displays admin registration branding, header, and icon', async ({ page }) => {
    await page.goto(`${AUTH_URL}/register`);

    await expect(page).toHaveTitle(/Reroute/i);
    await expect(page.locator('h1')).toContainText('Admin Registration');
    await expect(page.locator('text=ReRoute Campus Network')).toBeVisible();
    await expect(page.locator('span.material-symbols-outlined:has-text("manage_accounts")')).toBeVisible();
  });

  // Test Case 4: Registration Page Form Fields Structure
  test('UI-04: Displays all registration input fields with correct placeholders', async ({ page }) => {
    await page.goto(`${AUTH_URL}/register`);

    const nameInput = page.locator('input#name');
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute('placeholder', 'Jane Doe');

    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'jane@university.edu');

    const passwordInput = page.locator('input#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('placeholder', '••••••••');

    const confirmPasswordInput = page.locator('input#confirmPassword');
    await expect(confirmPasswordInput).toBeVisible();
    await expect(confirmPasswordInput).toHaveAttribute('placeholder', '••••••••');

    const inviteCodeInput = page.locator('input#inviteCode');
    await expect(inviteCodeInput).toBeVisible();
    await expect(inviteCodeInput).toHaveAttribute('placeholder', 'CR-XXXX-XXXX');

    await expect(page.locator('button[type="submit"]')).toContainText('Create Account');
  });

  // Test Case 5: Registration Footer & Return Link
  test('UI-05: Displays registration footer and back to sign in link', async ({ page }) => {
    await page.goto(`${AUTH_URL}/register`);

    await expect(page.locator('text=Already have an account?')).toBeVisible();
    const signInLink = page.locator('a:has-text("Sign in")');
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute('href', '/login');
  });

  // Test Case 6: Dashboard Sidebar Brand & Navigation Items
  test('UI-06: Displays dashboard sidebar brand, nav links, and sign-out button', async ({ page }) => {
    await loginAsAdmin(page);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toContainText('ReRoute');
    await expect(sidebar).toContainText('Admin Portal');

    await expect(sidebar.locator('a:has-text("Dashboard")')).toBeVisible();
    await expect(sidebar.locator('a:has-text("Admins")')).toBeVisible();
    await expect(sidebar.locator('a:has-text("Network")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Sign Out")')).toBeVisible();
  });

  // Test Case 7: Dashboard Overview Metrics Stat Cards
  test('UI-07: Displays overview header and all four KPI metric cards', async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.locator('h1')).toContainText('Campus Network Dashboard');
    await expect(page.locator('text=Real-time status and telemetry')).toBeVisible();

    await expect(page.locator('text=Total Admins')).toBeVisible();
    await expect(page.locator('text=Active Nodes')).toBeVisible();
    await expect(page.locator('text=Offline Nodes')).toBeVisible();
    await expect(page.locator('text=Avg Network Load')).toBeVisible();
  });

  // Test Case 8: Dashboard Device Telemetry Table Layout
  test('UI-08: Displays device health table headers and telemetry badge', async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.locator('h2:has-text("Campus Device Health")')).toBeVisible();
    await expect(page.locator('text=Live Telemetry')).toBeVisible();

    const headers = page.locator('table.data-table thead th');
    await expect(headers.nth(0)).toContainText('Device Name');
    await expect(headers.nth(1)).toContainText('Location');
    await expect(headers.nth(2)).toContainText('IP Address');
    await expect(headers.nth(3)).toContainText('Type');
    await expect(headers.nth(4)).toContainText('Uptime');
    await expect(headers.nth(5)).toContainText('Load');
    await expect(headers.nth(6)).toContainText('Status');
  });

  // Test Case 9: Campus Administrators Page & Staff Table Layout
  test('UI-09: Displays administrators page title, create button, and staff table headers', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${DASHBOARD_URL}/admins`);

    await expect(page.locator('h1')).toContainText('Campus Administrators');
    await expect(page.locator('button:has-text("Create Invite Code")')).toBeVisible();

    await expect(page.locator('h2:has-text("Authorized Staff")')).toBeVisible();
    const headers = page.locator('table.data-table thead th');
    await expect(headers.nth(0)).toContainText('Admin Name');
    await expect(headers.nth(1)).toContainText('Email Address');
    await expect(headers.nth(2)).toContainText('Assigned Role');
    await expect(headers.nth(3)).toContainText('Registered Date');
    await expect(headers.nth(4)).toContainText('Account Status');
    await expect(headers.nth(5)).toContainText('Actions');
  });

  // Test Case 10: Network Infrastructure Page & Device Modal Layout
  test('UI-10: Displays network infrastructure page header and registration modal layout', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${DASHBOARD_URL}/network`);

    await expect(page.locator('h1')).toContainText('Campus Network Infrastructure');
    const registerBtn = page.locator('button:has-text("Register Device")');
    await expect(registerBtn).toBeVisible();

    // Open modal to verify dialog UI structure
    await registerBtn.click();
    await expect(page.locator('h2:has-text("Register Campus Network Device")')).toBeVisible();

    await expect(page.locator('label:has-text("Device Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Campus Location")')).toBeVisible();
    await expect(page.locator('label:has-text("Static IP Address")')).toBeVisible();
    await expect(page.locator('label:has-text("Device Type")')).toBeVisible();

    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Add Device")')).toBeVisible();
  });
});
