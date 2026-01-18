import { test, expect } from '@playwright/test';

test.describe('Transactions', () => {
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

  test('can add a transaction via QuickAdd form', async ({ page }) => {
    // Fill in the form
    await page.getByLabel('Amount').fill('50.00');
    await page
      .getByLabel('Description (optional)')
      .fill('Test transaction from E2E');

    // Submit the form
    await page.getByRole('button', { name: 'Save Transaction' }).click();

    // Should show success toast
    await expect(page.getByText('Saved (demo)')).toBeVisible();

    // Form should be cleared
    await expect(page.getByLabel('Amount')).toHaveValue('');
  });

  test('validates required amount field', async ({ page }) => {
    // Try to submit without amount
    await page.getByRole('button', { name: 'Save Transaction' }).click();

    // Should show error
    await expect(page.getByText('Amount is required')).toBeVisible();
  });

  test('validates amount must be positive', async ({ page }) => {
    await page.getByLabel('Amount').fill('-50');
    await page.getByRole('button', { name: 'Save Transaction' }).click();

    await expect(page.getByText('Amount must be greater than 0')).toBeVisible();
  });

  test('validates date cannot be in the future', async ({ page }) => {
    // Set a future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const futureDateStr = futureDate.toISOString().slice(0, 10);

    await page.getByLabel('Date').fill(futureDateStr);
    await page.getByLabel('Amount').fill('50');
    await page.getByRole('button', { name: 'Save Transaction' }).click();

    await expect(page.getByText('Date cannot be in the future')).toBeVisible();
  });

  test('can switch between expense and income', async ({ page }) => {
    // Default category should be Food (shown in the combobox)
    await expect(page.getByRole('combobox', { name: 'Category' })).toHaveText(
      'Food'
    );

    // Open type selector and change to income
    await page.locator('[aria-labelledby="type-label"]').click();
    await page.getByRole('option', { name: 'Income' }).click();

    // Category options should include income categories
    await page.locator('[aria-labelledby="category-label"]').click();
    await expect(page.getByRole('option', { name: 'Salary' })).toBeVisible();
  });

  test('can switch currency', async ({ page }) => {
    // Default currency info should be visible
    await expect(page.getByText(/Threshold:/)).toBeVisible();

    // Change currency to PEN
    await page.locator('#currency-select').selectOption('PEN');

    // Threshold should update for PEN (check the hint text specifically)
    await expect(page.locator('#amount-hint')).toContainText('PEN');
  });

  test('shows description character count', async ({ page }) => {
    // Character counter should show
    await expect(page.getByText('0/200')).toBeVisible();

    // Type some text
    await page.getByLabel('Description (optional)').fill('Test');
    await expect(page.getByText('4/200')).toBeVisible();
  });
});
