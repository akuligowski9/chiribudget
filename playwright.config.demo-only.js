import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for testing DEMO_ONLY mode
 *
 * This config starts the dev server with NEXT_PUBLIC_DEMO_ONLY=true
 * to test the pre-hydration script fix.
 *
 * Run with: npx playwright test --config=playwright.config.demo-only.js
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/demo-only-mode.spec.js', // Only run demo-only tests
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'NEXT_PUBLIC_DEMO_ONLY=true npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false, // Always start fresh for demo-only tests
    timeout: 120000,
  },
});
