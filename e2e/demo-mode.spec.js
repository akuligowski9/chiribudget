import { test, expect } from '@playwright/test';

test.describe('Demo Mode', () => {
  test('shows login screen on first visit', async ({ page }) => {
    await page.goto('/');

    // Should show login screen elements
    await expect(
      page.getByRole('heading', { name: 'ChiriBudget' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Send Magic Link' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Try Demo Mode/i })
    ).toBeVisible();
  });

  test('can enter demo mode', async ({ page }) => {
    await page.goto('/');

    // Click "Try Demo Mode" button
    await page.getByRole('button', { name: /Try Demo Mode/i }).click();

    // Reload to pick up localStorage change
    await page.reload();

    // Wait for the page to update
    await expect(
      page.getByRole('heading', { name: 'Add Transaction' })
    ).toBeVisible({ timeout: 10000 });

    // Should show demo mode banner
    await expect(
      page.getByRole('strong').filter({ hasText: 'Demo Mode' })
    ).toBeVisible();
  });

  test('demo mode persists on page reload', async ({ page }) => {
    await page.goto('/');

    // Enter demo mode via localStorage
    await page.evaluate(() => {
      localStorage.setItem('chiribudget_demoMode', 'true');
    });
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Add Transaction' })
    ).toBeVisible({ timeout: 10000 });

    // Reload page
    await page.reload();

    // Should still be in demo mode
    await expect(
      page.getByRole('heading', { name: 'Add Transaction' })
    ).toBeVisible();
    await expect(
      page.getByRole('strong').filter({ hasText: 'Demo Mode' })
    ).toBeVisible();
  });

  test('can navigate to dashboard in demo mode', async ({ page }) => {
    await page.goto('/');

    // Enter demo mode via localStorage
    await page.evaluate(() => {
      localStorage.setItem('chiribudget_demoMode', 'true');
    });
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Add Transaction' })
    ).toBeVisible({ timeout: 10000 });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Should see dashboard page
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible();
  });

  test('magic link form validates email', async ({ page }) => {
    await page.goto('/');

    // Try to submit without email
    await page.getByRole('button', { name: 'Send Magic Link' }).click();

    // Should show error message
    await expect(page.getByText('Please enter your email')).toBeVisible();
  });
});
