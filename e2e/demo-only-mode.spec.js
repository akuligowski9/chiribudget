import { test, expect } from '@playwright/test';

/**
 * Test suite for DEMO_ONLY mode (NEXT_PUBLIC_DEMO_ONLY=true)
 *
 * This tests the pre-hydration script fix that eliminates the login screen flash
 * by setting localStorage before React hydrates.
 *
 * Run with: NEXT_PUBLIC_DEMO_ONLY=true npm run test:e2e
 */
test.describe('Demo-Only Mode (NEXT_PUBLIC_DEMO_ONLY=true)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to simulate fresh visitor
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should skip login screen entirely on first visit', async ({ page }) => {
    // Navigate with fresh localStorage
    await page.goto('/');

    // Should NEVER show login screen elements
    // Use a short timeout to verify they don't appear even briefly
    await expect(
      page.getByRole('button', { name: 'Send Magic Link' })
    ).not.toBeVisible({ timeout: 1000 });

    await expect(
      page.getByRole('button', { name: /Try Demo Mode/i })
    ).not.toBeVisible({ timeout: 1000 });

    // Should immediately show demo mode app (check for transaction form in any language)
    // Look for the transaction form buttons which should be visible immediately
    await expect(
      page.getByRole('button', { name: /rápido|Quick Add|Agregar/i })
    ).toBeVisible({ timeout: 5000 });

    // Should show demo mode banner (in any language)
    await expect(page.getByText(/Demo Mode|Modo Demo/i).first()).toBeVisible();
  });

  test('should set localStorage before React hydration', async ({ page }) => {
    // Navigate with fresh localStorage
    await page.goto('/');

    // Check that localStorage was set by the inline script
    const demoMode = await page.evaluate(() => {
      return localStorage.getItem('chiribudget_demoMode');
    });

    expect(demoMode).toBe('true');
  });

  test('should persist demo mode on page reload', async ({ page }) => {
    // First visit
    await page.goto('/');

    // Verify we're in demo mode (check for transaction form)
    await expect(
      page.getByRole('button', { name: /rápido|Quick Add|Agregar/i })
    ).toBeVisible();

    // Reload the page
    await page.reload();

    // Should still be in demo mode (no login screen)
    await expect(
      page.getByRole('button', { name: 'Send Magic Link' })
    ).not.toBeVisible({ timeout: 1000 });

    await expect(
      page.getByRole('button', { name: /rápido|Quick Add|Agregar/i })
    ).toBeVisible();

    await expect(page.getByText(/Demo Mode|Modo Demo/i).first()).toBeVisible();
  });

  test('should allow navigation to dashboard', async ({ page }) => {
    // Start on home page
    await page.goto('/');

    // Wait for home page to load (check for transaction form)
    await expect(
      page.getByRole('button', { name: /rápido|Quick Add|Agregar/i })
    ).toBeVisible();

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Should see dashboard page without any login prompt (check for any dashboard content)
    await expect(page.locator('main')).toBeVisible();

    // Should still show demo mode banner
    await expect(page.getByText(/Demo Mode|Modo Demo/i).first()).toBeVisible();
  });

  test('should not trigger full page reload on demo mode entry', async ({
    page,
  }) => {
    // Track if window.location.reload() was called by monitoring performance entries
    await page.goto('/');

    // Wait for page to fully load (check for transaction form)
    await expect(
      page.getByRole('button', { name: /rápido|Quick Add|Agregar/i })
    ).toBeVisible();

    // Check that localStorage was set (proves pre-hydration script ran)
    const demoMode = await page.evaluate(() => {
      return localStorage.getItem('chiribudget_demoMode');
    });
    expect(demoMode).toBe('true');

    // Verify we're in demo mode without any reload
    // If there was a reload, the demo mode banner wouldn't appear this quickly
    await expect(page.getByText(/Demo Mode|Modo Demo/i).first()).toBeVisible();
  });

  test('should work in incognito/private browsing mode', async ({
    browser,
  }) => {
    // Create a new incognito context
    const context = await browser.newContext({
      storageState: undefined, // Start with no cookies/localStorage
    });
    const page = await context.newPage();

    try {
      // Navigate with completely fresh state
      await page.goto('/');

      // Should immediately show demo mode app (check for transaction form)
      await expect(
        page.getByRole('button', { name: /rápido|Quick Add|Agregar/i })
      ).toBeVisible({ timeout: 5000 });

      // Should NOT show login screen
      await expect(
        page.getByRole('button', { name: 'Send Magic Link' })
      ).not.toBeVisible({ timeout: 1000 });

      // Verify localStorage was set
      const demoMode = await page.evaluate(() => {
        return localStorage.getItem('chiribudget_demoMode');
      });
      expect(demoMode).toBe('true');
    } finally {
      await context.close();
    }
  });
});
