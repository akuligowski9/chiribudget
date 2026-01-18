import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  // Enter demo mode before each test using localStorage
  test.beforeEach(async ({ page }) => {
    // Set demo mode in localStorage before page load
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('chiribudget_demoMode', 'true');
    });
    await page.reload();
    // Wait for app to load in demo mode
    await expect(
      page.getByRole('heading', { name: 'Add Transaction' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows transaction list on dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Dashboard should be visible
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible();

    // Date range controls should be visible
    await expect(page.getByRole('button', { name: 'Month' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Year' })).toBeVisible();
  });

  test('can switch date range presets', async ({ page }) => {
    await page.goto('/dashboard');

    // Click on different range presets
    await page.getByRole('button', { name: 'Week' }).click();
    await expect(page.getByRole('button', { name: 'Week' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.getByRole('button', { name: 'Year' }).click();
    await expect(page.getByRole('button', { name: 'Year' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('can switch currency on dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    // Currency selector should be visible
    const currencySelect = page.locator('select').filter({ hasText: 'USD' });
    await expect(currencySelect).toBeVisible();

    // Change currency
    await currencySelect.selectOption('PEN');
    await expect(currencySelect).toHaveValue('PEN');
  });

  test('shows custom date range when Custom is selected', async ({ page }) => {
    await page.goto('/dashboard');

    // Click Custom preset
    await page.getByRole('button', { name: 'Custom' }).click();

    // Should show custom date inputs
    await expect(page.getByLabel('Start Date')).toBeVisible();
    await expect(page.getByLabel('End Date')).toBeVisible();
  });
});
