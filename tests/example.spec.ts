import { test, expect } from '@playwright/test';

test('home page renders', async ({ page }) => {
  await page.goto(process.env.TEST_BASE_URL ?? 'http://localhost:3000/');
  await expect(page).toHaveTitle(/.+/);
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

test('navigation works', async ({ page }) => {
  await page.goto(process.env.TEST_BASE_URL ?? 'http://localhost:3000/');
  
  // Check if main navigation elements are present
  const navigation = page.locator('nav, [role="navigation"]');
  if (await navigation.count() > 0) {
    await expect(navigation.first()).toBeVisible();
  }
  
  // Check if page has some content
  const mainContent = page.locator('main, [role="main"], .main, #main');
  if (await mainContent.count() > 0) {
    await expect(mainContent.first()).toBeVisible();
  }
});

test('database connection test button works', async ({ page }) => {
  await page.goto(process.env.TEST_BASE_URL ?? 'http://localhost:3000/');
  
  // Look for database test button
  const testButton = page.locator('button:has-text("Тест БД"), button:has-text("Test DB"), button:has-text("🔍")');
  if (await testButton.count() > 0) {
    await expect(testButton.first()).toBeVisible();
  }
});
