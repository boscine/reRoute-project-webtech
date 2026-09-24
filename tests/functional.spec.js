import { test, expect } from '@playwright/test';
import { AUTH_URL, DASHBOARD_URL, loginAsAdmin } from './helpers.js';

test.describe('ReRoute Campus Platform - Functional Test Suite (10 Test Cases)', () => {
  // Test Case 1: Required Field Validation on Login Form
  test('FUNC-01: Validates required email and password on empty submission', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    await page.click('button[type="submit"]');
    await expect(page.locator('text=Email address is required.')).toBeVisible();

    await page.fill('input#email', 'admin@campus.edu');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password is required.')).toBeVisible();
  });

  // Test Case 2: Email Format Validation
  test('FUNC-02: Validates invalid email format syntax', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    await page.fill('input#email', 'invalid-email-format');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid email format.')).toBeVisible();
  });

  // Test Case 3: Password Visibility Toggle
  test('FUNC-03: Toggles password input visibility between secret and plain text', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    const passwordInput = page.locator('input#password');
    const showToggle = page.locator('button[aria-label="Show password"]');

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await passwordInput.fill('SecretCampusPass#123');

    // Toggle to visible
    await showToggle.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(page.locator('button[aria-label="Hide password"]')).toBeVisible();

    // Toggle back to hidden
    await page.locator('button[aria-label="Hide password"]').click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // Test Case 4: Real-time Password Strength Calculation
  test('FUNC-04: Dynamically computes password strength rating as characters are typed', async ({ page }) => {
    await page.goto(`${AUTH_URL}/register`);

    const passwordInput = page.locator('input#password');

    // Weak level
    await passwordInput.fill('abc');
    await expect(page.locator('text=Weak password')).toBeVisible();

    // Fair level (8+ chars)
    await passwordInput.fill('abcdefgh');
    await expect(page.locator('text=Fair password')).toBeVisible();

    // Good level (8+ chars, uppercase + numbers)
    await passwordInput.fill('Abcdefgh12');
    await expect(page.locator('text=Good password')).toBeVisible();

    // Strong level (8+ chars, uppercase, number, symbol)
    await passwordInput.fill('Abcdefgh12!#$');
    await expect(page.locator('text=Strong password')).toBeVisible();
  });

  // Test Case 5: Password Mismatch & Invite Code Validation on Registration
  test('FUNC-05: Validates mismatched passwords and mandatory invite code', async ({ page }) => {
    await page.goto(`${AUTH_URL}/register`);

    await page.fill('input#name', 'Campus Tech Specialist');
    await page.fill('input#email', 'tech@campus.edu');
    await page.fill('input#password', 'CampusPass#123');
    await page.fill('input#confirmPassword', 'DifferentPass#456');
    await page.fill('input#inviteCode', 'CR-CAMPUS-2026');

    await page.click('button[type="submit"]');
    await expect(page.locator('text=Passwords do not match.')).toBeVisible();

    // Fix confirmation match, but clear invite code
    await page.fill('input#confirmPassword', 'CampusPass#123');
    await page.fill('input#inviteCode', '');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Admin invite code is required.')).toBeVisible();
  });

  // Test Case 6: Navigation Flow Between Auth Screens
  test('FUNC-06: Navigates bidirectionally between Login and Register screens', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    // Go to registration
    await page.click('a:has-text("Register for an account")');
    await expect(page).toHaveURL(/.*register/);
    await expect(page.locator('h1')).toContainText('Admin Registration');

    // Return to login
    await page.click('a:has-text("Sign in")');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('h1')).toContainText('Admin Login');
  });

  // Test Case 7: Admin Authentication & Dashboard Redirection
  test('FUNC-07: Authenticates valid credentials and redirects to Dashboard portal', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);

    await page.fill('input#email', 'admin@campus.edu');
    await page.fill('input#password', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(new RegExp(DASHBOARD_URL), { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Campus Network Dashboard');
    await expect(page.locator('aside')).toContainText('Campus System Admin');
  });

  // Test Case 8: Dashboard Client-Side Route Switching
  test('FUNC-08: Switches views using sidebar navigation without full page reload', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to Admins
    await page.click('aside a:has-text("Admins")');
    await expect(page).toHaveURL(/.*admins/);
    await expect(page.locator('h1')).toContainText('Campus Administrators');

    // Navigate to Network
    await page.click('aside a:has-text("Network")');
    await expect(page).toHaveURL(/.*network/);
    await expect(page.locator('h1')).toContainText('Campus Network Infrastructure');

    // Return to Dashboard
    await page.click('aside a:has-text("Dashboard")');
    await expect(page).toHaveURL(new RegExp(`${DASHBOARD_URL}/?$`));
    await expect(page.locator('h1')).toContainText('Campus Network Dashboard');
  });

  // Test Case 9: Invite Code Generation & Copy Interaction
  test('FUNC-09: Generates single-use registration invite code and handles copy action', async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await loginAsAdmin(page);
    await page.goto(`${DASHBOARD_URL}/admins`);

    // Listen for alert dialog triggered by Copy button
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Copied to clipboard!');
      await dialog.accept();
    });

    const createBtn = page.locator('button:has-text("Create Invite Code")');
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Verify invite banner appears
    await expect(page.locator('text=Single-use invite code')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/CR-[0-9A-F]{4}-[0-9A-F]{4}/')).toBeVisible();

    // Click Copy button
    await page.click('button:has-text("Copy")');
  });

  // Test Case 10: Register New Device and Toggle Online/Offline State
  test('FUNC-10: Registers a new network node and toggles its operational status', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${DASHBOARD_URL}/network`);

    // Open modal
    await page.click('button:has-text("Register Device")');
    await expect(page.locator('h2:has-text("Register Campus Network Device")')).toBeVisible();

    const uniqueId = Math.floor(Math.random() * 800) + 100;
    const deviceName = `AP-Lab-${uniqueId}`;
    const deviceIp = `192.168.200.${uniqueId % 250}`;

    await page.fill('input[placeholder="e.g. CS Lab AP 03"]', deviceName);
    await page.fill('input[placeholder="e.g. Science Bldg 3F"]', 'Engineering Center 3F');
    await page.fill('input[placeholder="192.168.1.120"]', deviceIp);

    await page.click('button[type="submit"]:has-text("Add Device")');

    // Verify card is added
    const deviceCard = page.locator('.stat-card', { hasText: deviceName });
    await expect(deviceCard).toBeVisible({ timeout: 10000 });
    await expect(deviceCard.locator(`text=${deviceIp}`)).toBeVisible();

    // Toggle status
    const toggleBtn = deviceCard.locator('button:has-text("Toggle")');
    const initialText = await toggleBtn.innerText();
    await toggleBtn.click();

    // Verify button text changed (e.g. Toggle Offline -> Toggle Online)
    await expect(toggleBtn).not.toHaveText(initialText, { timeout: 7000 });
  });
});
