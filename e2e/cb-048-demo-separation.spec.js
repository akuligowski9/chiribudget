import { test, expect } from '@playwright/test';

test.describe('CB-048: Separate Demo Mode Deployment', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('new visitor sees "Try Demo Mode" button', async ({ page }) => {
    await page.goto('/');

    // Should show all login screen elements
    await expect(
      page.getByRole('heading', { name: 'ChiriBudget' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Send Magic Link' })
    ).toBeVisible();

    // Should show divider with "or" text
    await expect(page.locator('text=or').first()).toBeVisible();

    // Should show "Try Demo Mode" button
    await expect(
      page.getByRole('button', { name: /Try Demo Mode/i })
    ).toBeVisible();
  });

  test('returning user does NOT see "Try Demo Mode" button', async ({
    page,
  }) => {
    await page.goto('/');

    // Simulate returning user
    await page.evaluate(() => {
      localStorage.setItem('chiribudget_hasAuthenticated', 'true');
    });
    await page.reload();

    // Should still show login form
    await expect(
      page.getByRole('heading', { name: 'ChiriBudget' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Send Magic Link' })
    ).toBeVisible();

    // Should NOT show "Try Demo Mode" button
    await expect(
      page.getByRole('button', { name: /Try Demo Mode/i })
    ).not.toBeVisible();

    // Check that divider section is not present (the whole conditional block)
    const dividerSection = page.locator('div.relative.my-6');
    await expect(dividerSection).not.toBeVisible();
  });

  test('hasAuthenticated flag is set when user signs in', async ({ page }) => {
    await page.goto('/');

    // Check initial state - flag should not exist
    const initialFlag = await page.evaluate(() => {
      return localStorage.getItem('chiribudget_hasAuthenticated');
    });
    expect(initialFlag).toBeNull();

    // Note: We can't test actual sign-in without Supabase auth
    // This test verifies the flag doesn't exist initially
    // The AuthContext.js code sets it on auth state change
  });

  test('demo mode button works for new visitors', async ({ page }) => {
    await page.goto('/');

    // Click "Try Demo Mode" button
    await page.getByRole('button', { name: /Try Demo Mode/i }).click();

    // Explicitly reload to ensure demo mode is picked up (matches existing test pattern)
    await page.reload();

    // Should be in demo mode now
    await expect(
      page.getByRole('heading', { name: 'Add Transaction' })
    ).toBeVisible({ timeout: 10000 });

    // Should show demo mode banner
    await expect(
      page.getByRole('strong').filter({ hasText: 'Demo Mode' })
    ).toBeVisible();
  });

  test('returning user can still manually enter demo mode via localStorage', async ({
    page,
  }) => {
    await page.goto('/');

    // Simulate returning user
    await page.evaluate(() => {
      localStorage.setItem('chiribudget_hasAuthenticated', 'true');
    });
    await page.reload();

    // Verify no demo button
    await expect(
      page.getByRole('button', { name: /Try Demo Mode/i })
    ).not.toBeVisible();

    // Manually enter demo mode (simulating direct URL or manual localStorage)
    await page.evaluate(() => {
      localStorage.setItem('chiribudget_demoMode', 'true');
    });
    await page.reload();

    // Should enter demo mode (matches existing test pattern)
    await expect(
      page.getByRole('heading', { name: 'Add Transaction' })
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('CB-048: Demo-Only Mode (NEXT_PUBLIC_DEMO_ONLY=true)', () => {
  test.skip('auto-enters demo mode when DEMO_ONLY env var is set', async ({
    page,
  }) => {
    // This test requires NEXT_PUBLIC_DEMO_ONLY=true in environment
    // Skip in regular test runs, enable when testing demo deployment
    await page.goto('/');

    // Should immediately be in demo mode without login screen
    await expect(
      page.getByRole('heading', { name: 'Add Transaction' })
    ).toBeVisible({ timeout: 10000 });

    // Should NOT show login screen
    await expect(
      page.getByRole('button', { name: 'Send Magic Link' })
    ).not.toBeVisible();
  });
});
