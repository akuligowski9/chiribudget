import { test, expect } from '@playwright/test';

test.describe('Export', () => {
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

  test('shows export panel when clicking Export tab', async ({ page }) => {
    // Click the Export tab
    await page.getByRole('button', { name: 'Export' }).click();

    // Should show export controls
    await expect(page.getByText('Month')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Download CSV' })
    ).toBeVisible();
  });

  test('can select month for export', async ({ page }) => {
    await page.getByRole('button', { name: 'Export' }).click();

    // Month input should be visible and editable
    const monthInput = page.locator('input[type="month"]');
    await expect(monthInput).toBeVisible();

    // Current month should be pre-selected
    const currentMonth = new Date().toISOString().slice(0, 7);
    await expect(monthInput).toHaveValue(currentMonth);
  });

  test('can trigger CSV download', async ({ page }) => {
    await page.getByRole('button', { name: 'Export' }).click();

    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');

    // Click download button
    await page.getByRole('button', { name: 'Download CSV' }).click();

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download filename format
    expect(download.suggestedFilename()).toMatch(
      /ChiriBudget_\d{4}-\d{2}_(USD|PEN)\.csv/
    );
  });

  test('shows success toast after export', async ({ page }) => {
    await page.getByRole('button', { name: 'Export' }).click();

    // Handle download
    page.on('download', () => {});

    // Click download
    await page.getByRole('button', { name: 'Download CSV' }).click();

    // Should show success toast
    await expect(page.getByText(/Exported/)).toBeVisible();
  });
});
