import { test, expect } from '@playwright/test';

const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:3000';

test.describe('Developer Playground', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth state for all playground tests
    await page.route('/api/v1/workflows*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, page: 1, limit: 20, pages: 0 }),
      });
    });

    // Mock auth to allow dashboard access
    await page.route('/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accessToken: 'mock-token',
          user: { id: 'u-1', email: 'dev@quorvexa.io', firstName: 'Dev', lastName: 'User', role: 'admin', tenantId: 't-1' },
        }),
      });
    });

    // Login to get past auth guard
    await page.goto(`${BASE_URL}/auth/login`);
    await page.getByLabel('Email address').fill('dev@quorvexa.io');
    await page.getByLabel('Password').fill('DevPass123!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard', { timeout: 5000 }).catch(() => {});
  });

  test('dev playground page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/dev`);
    await expect(page.getByRole('heading', { name: 'Developer Playground' })).toBeVisible();
  });

  test('all tab buttons are visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/dev`);
    await expect(page.getByRole('button', { name: 'Auth & Users' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Workflows' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI Agents' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preferences' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Simulation Guide' })).toBeVisible();
  });

  test('switching tabs shows correct content', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/dev`);

    // Default tab should show Auth & Users
    await expect(page.getByText('Auth — Register')).toBeVisible();

    // Switch to Workflows
    await page.getByRole('button', { name: 'Workflows' }).click();
    await expect(page.getByText('Create Workflow')).toBeVisible();

    // Switch to Notifications
    await page.getByRole('button', { name: 'Notifications' }).click();
    await expect(page.getByText('Send Notification')).toBeVisible();

    // Switch to AI Agents
    await page.getByRole('button', { name: 'AI Agents' }).click();
    await expect(page.getByText('Run Agent')).toBeVisible();

    // Switch to Preferences
    await page.getByRole('button', { name: 'Preferences' }).click();
    await expect(page.getByText('User Preferences')).toBeVisible();
  });

  test('simulation guide tab shows all steps', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/dev`);
    await page.getByRole('button', { name: 'Simulation Guide' }).click();
    await expect(page.getByText('Simulation Guide')).toBeVisible();
    await expect(page.getByText('Register a test user')).toBeVisible();
    await expect(page.getByText('Login as the test user')).toBeVisible();
    await expect(page.getByText('View your profile')).toBeVisible();
    await expect(page.getByText('Create a workflow')).toBeVisible();
    await expect(page.getByText('Activate the workflow')).toBeVisible();
    await expect(page.getByText('Trigger the workflow')).toBeVisible();
    await expect(page.getByText('Send a notification')).toBeVisible();
    await expect(page.getByText('Run an AI agent')).toBeVisible();
  });

  test('clear responses button works', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/dev`);
    const clearButton = page.getByRole('button', { name: 'Clear Responses' });
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    // Should show no-response placeholders again
    await expect(page.getByText(/No response yet/).first()).toBeVisible();
  });

  test('pre-filled forms show default values', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/dev`);
    // Auth panel should be visible by default with pre-filled values
    const emailInput = page.getByLabel('Email');
    await expect(emailInput).toHaveValue('dev@quorvexa.io');
  });

  test('sidebar shows dev playground link', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/dev`);
    const sidebarLink = page.getByRole('link', { name: 'Dev Playground' });
    await expect(sidebarLink).toBeVisible();
  });
});
