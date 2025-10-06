import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    headless: process.env.PLAYWRIGHT_HEADLESS !== 'false',
  },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
});
