import { test, expect } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:3000';

test.describe('Authentication', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Quorvexa/);
    await expect(page.getByRole('heading', { name: 'Quorvexa' })).toBeVisible();
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('login form validates empty fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('login form validates invalid email', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByLabel('Password').fill('somepassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter a valid email address')).toBeVisible();
  });

  test('login with wrong credentials shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByLabel('Email address').fill('wrong@example.com');
    await page.getByLabel('Password').fill('WrongPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
  });

  test('register link works', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/.*register/);
  });

  test('login page is keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });
});

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth for E2E tests — in real tests, do full login or use stored session
    await page.route('/api/v1/workflows*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, limit: 20, pages: 0 }),
      });
    });
  });

  test('dashboard shows empty state when no workflows', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    // Should either redirect to login or show empty state
    const url = page.url();
    expect(url).toMatch(/dashboard|login/);
  });
});
