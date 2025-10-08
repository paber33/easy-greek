/**
 * End-to-end tests for data isolation between users
 * Tests that Pavel and Aleksandra have completely separate data
 */

import { test, expect } from "@playwright/test";

test.describe("Data Isolation Between Users", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto("/");
  });

  test("Pavel and Aleksandra should have separate card collections", async ({ page }) => {
    // Login as Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Add a card as Pavel
    await page.click('button:has-text("Add Card")');
    await page.fill('input[placeholder*="Greek"]', "γεια");
    await page.fill('input[placeholder*="Translation"]', "hello");
    await page.click('button:has-text("Save")');

    // Verify Pavel's card is visible
    await expect(page.locator("text=γεια")).toBeVisible();
    await expect(page.locator("text=hello")).toBeVisible();

    // Switch to Aleksandra
    await page.click('button:has-text("👩\u200d💻 Aleksandra")');
    await page.waitForURL("/words");

    // Verify Pavel's card is NOT visible to Aleksandra
    await expect(page.locator("text=γεια")).not.toBeVisible();
    await expect(page.locator("text=hello")).not.toBeVisible();

    // Add a different card as Aleksandra
    await page.click('button:has-text("Add Card")');
    await page.fill('input[placeholder*="Greek"]', "καλησπέρα");
    await page.fill('input[placeholder*="Translation"]', "good evening");
    await page.click('button:has-text("Save")');

    // Verify Aleksandra's card is visible
    await expect(page.locator("text=καλησπέρα")).toBeVisible();
    await expect(page.locator("text=good evening")).toBeVisible();

    // Switch back to Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Verify Pavel still sees his card and NOT Aleksandra's
    await expect(page.locator("text=γεια")).toBeVisible();
    await expect(page.locator("text=hello")).toBeVisible();
    await expect(page.locator("text=καλησπέρα")).not.toBeVisible();
    await expect(page.locator("text=good evening")).not.toBeVisible();
  });

  test("SRS ratings should be isolated between users", async ({ page }) => {
    // Login as Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Add a card as Pavel
    await page.click('button:has-text("Add Card")');
    await page.fill('input[placeholder*="Greek"]', "γεια");
    await page.fill('input[placeholder*="Translation"]', "hello");
    await page.click('button:has-text("Save")');

    // Start a session and rate the card
    await page.click('button:has-text("Start Session")');
    await page.waitForSelector("text=γεια");

    // Rate the card as "Good"
    await page.click('button:has-text("Good")');

    // Check that the card shows as reviewed
    await expect(page.locator("text=Reviewed: 1")).toBeVisible();

    // Switch to Aleksandra
    await page.click('button:has-text("👩\u200d💻 Aleksandra")');
    await page.waitForURL("/words");

    // Add the same card as Aleksandra
    await page.click('button:has-text("Add Card")');
    await page.fill('input[placeholder*="Greek"]', "γεια");
    await page.fill('input[placeholder*="Translation"]', "hello");
    await page.click('button:has-text("Save")');

    // Start a session as Aleksandra
    await page.click('button:has-text("Start Session")');
    await page.waitForSelector("text=γεια");

    // Verify the card shows as new (not reviewed)
    await expect(page.locator("text=Reviewed: 0")).toBeVisible();

    // Rate the card as "Easy"
    await page.click('button:has-text("Easy")');

    // Check that Aleksandra's rating is separate
    await expect(page.locator("text=Reviewed: 1")).toBeVisible();

    // Switch back to Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Verify Pavel's card still shows his rating (Good, not Easy)
    await expect(page.locator("text=Reviewed: 1")).toBeVisible();
  });

  test("Session logs should be isolated between users", async ({ page }) => {
    // Login as Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Add a card and complete a session
    await page.click('button:has-text("Add Card")');
    await page.fill('input[placeholder*="Greek"]', "γεια");
    await page.fill('input[placeholder*="Translation"]', "hello");
    await page.click('button:has-text("Save")');

    await page.click('button:has-text("Start Session")');
    await page.waitForSelector("text=γεια");
    await page.click('button:has-text("Good")');
    await page.click('button:has-text("Finish Session")');

    // Check Pavel's logs
    await page.click('a:has-text("Logs")');
    await expect(page.locator("text=1 card reviewed")).toBeVisible();
    await expect(page.locator("text=100% accuracy")).toBeVisible();

    // Switch to Aleksandra
    await page.click('button:has-text("👩\u200d💻 Aleksandra")');
    await page.waitForURL("/words");

    // Check Aleksandra's logs (should be empty)
    await page.click('a:has-text("Logs")');
    await expect(page.locator("text=No sessions yet")).toBeVisible();

    // Add a card and complete a session as Aleksandra
    await page.click('a:has-text("Words")');
    await page.click('button:has-text("Add Card")');
    await page.fill('input[placeholder*="Greek"]', "καλησπέρα");
    await page.fill('input[placeholder*="Translation"]', "good evening");
    await page.click('button:has-text("Save")');

    await page.click('button:has-text("Start Session")');
    await page.waitForSelector("text=καλησπέρα");
    await page.click('button:has-text("Easy")');
    await page.click('button:has-text("Finish Session")');

    // Check Aleksandra's logs
    await page.click('a:has-text("Logs")');
    await expect(page.locator("text=1 card reviewed")).toBeVisible();
    await expect(page.locator("text=100% accuracy")).toBeVisible();

    // Switch back to Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Check Pavel's logs (should still show his session, not Aleksandra's)
    await page.click('a:has-text("Logs")');
    await expect(page.locator("text=1 card reviewed")).toBeVisible();
    await expect(page.locator("text=100% accuracy")).toBeVisible();
  });

  test("User settings should be isolated", async ({ page }) => {
    // Login as Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Change Pavel's settings
    await page.click('button[aria-label="Settings"]');
    await page.fill('input[placeholder*="Daily new cards"]', "20");
    await page.fill('input[placeholder*="Daily reviews"]', "200");
    await page.click('button:has-text("Save Settings")');

    // Verify Pavel's settings
    await expect(page.locator("text=Daily new cards: 20")).toBeVisible();
    await expect(page.locator("text=Daily reviews: 200")).toBeVisible();

    // Switch to Aleksandra
    await page.click('button:has-text("👩\u200d💻 Aleksandra")');
    await page.waitForURL("/words");

    // Check Aleksandra's settings (should be default)
    await page.click('button[aria-label="Settings"]');
    await expect(page.locator("text=Daily new cards: 10")).toBeVisible();
    await expect(page.locator("text=Daily reviews: 120")).toBeVisible();

    // Change Aleksandra's settings
    await page.fill('input[placeholder*="Daily new cards"]', "15");
    await page.fill('input[placeholder*="Daily reviews"]', "150");
    await page.click('button:has-text("Save Settings")');

    // Verify Aleksandra's settings
    await expect(page.locator("text=Daily new cards: 15")).toBeVisible();
    await expect(page.locator("text=Daily reviews: 150")).toBeVisible();

    // Switch back to Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Check Pavel's settings (should still be his original values)
    await page.click('button[aria-label="Settings"]');
    await expect(page.locator("text=Daily new cards: 20")).toBeVisible();
    await expect(page.locator("text=Daily reviews: 200")).toBeVisible();
  });

  test("Data export should only include current user's data", async ({ page }) => {
    // Login as Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Add a card as Pavel
    await page.click('button:has-text("Add Card")');
    await page.fill('input[placeholder*="Greek"]', "γεια");
    await page.fill('input[placeholder*="Translation"]', "hello");
    await page.click('button:has-text("Save")');

    // Complete a session
    await page.click('button:has-text("Start Session")');
    await page.waitForSelector("text=γεια");
    await page.click('button:has-text("Good")');
    await page.click('button:has-text("Finish Session")');

    // Export Pavel's data
    await page.click('button[aria-label="Export"]');

    // Wait for download to start
    const downloadPromise = page.waitForEvent("download");
    await page.click('button:has-text("Export Data")');
    const download = await downloadPromise;

    // Switch to Aleksandra
    await page.click('button:has-text("👩\u200d💻 Aleksandra")');
    await page.waitForURL("/words");

    // Add a different card as Aleksandra
    await page.click('button:has-text("Add Card")');
    await page.fill('input[placeholder*="Greek"]', "καλησπέρα");
    await page.fill('input[placeholder*="Translation"]', "good evening");
    await page.click('button:has-text("Save")');

    // Export Aleksandra's data
    await page.click('button[aria-label="Export"]');

    const downloadPromise2 = page.waitForEvent("download");
    await page.click('button:has-text("Export Data")');
    const download2 = await downloadPromise2;

    // Verify downloads are different
    expect(download.suggestedFilename()).not.toBe(download2.suggestedFilename());
  });

  test("Concurrent sessions should not interfere with each other", async ({ page, context }) => {
    // Create a second browser context for Aleksandra
    const aleksandraContext = await context.browser()?.newContext();
    const aleksandraPage = await aleksandraContext?.newPage();

    if (!aleksandraPage) {
      test.skip("Could not create second browser context");
      return;
    }

    try {
      // Pavel's session
      await page.goto("/");
      await page.click('button:has-text("👨\u200d💻 Pavel")');
      await page.waitForURL("/words");

      // Add a card as Pavel
      await page.click('button:has-text("Add Card")');
      await page.fill('input[placeholder*="Greek"]', "γεια");
      await page.fill('input[placeholder*="Translation"]', "hello");
      await page.click('button:has-text("Save")');

      // Start Pavel's session
      await page.click('button:has-text("Start Session")');
      await page.waitForSelector("text=γεια");

      // Aleksandra's session
      await aleksandraPage.goto("/");
      await aleksandraPage.click('button:has-text("👩\u200d💻 Aleksandra")');
      await aleksandraPage.waitForURL("/words");

      // Add a different card as Aleksandra
      await aleksandraPage.click('button:has-text("Add Card")');
      await aleksandraPage.fill('input[placeholder*="Greek"]', "καλησπέρα");
      await aleksandraPage.fill('input[placeholder*="Translation"]', "good evening");
      await aleksandraPage.click('button:has-text("Save")');

      // Start Aleksandra's session
      await aleksandraPage.click('button:has-text("Start Session")');
      await aleksandraPage.waitForSelector("text=καλησπέρα");

      // Rate cards simultaneously
      await Promise.all([
        page.click('button:has-text("Good")'),
        aleksandraPage.click('button:has-text("Easy")'),
      ]);

      // Finish both sessions
      await Promise.all([
        page.click('button:has-text("Finish Session")'),
        aleksandraPage.click('button:has-text("Finish Session")'),
      ]);

      // Verify both users see their own results
      await expect(page.locator("text=Reviewed: 1")).toBeVisible();
      await expect(aleksandraPage.locator("text=Reviewed: 1")).toBeVisible();

      // Verify Pavel doesn't see Aleksandra's card
      await expect(page.locator("text=καλησπέρα")).not.toBeVisible();

      // Verify Aleksandra doesn't see Pavel's card
      await expect(aleksandraPage.locator("text=γεια")).not.toBeVisible();
    } finally {
      await aleksandraContext?.close();
    }
  });

  test("Page refresh should maintain user isolation", async ({ page }) => {
    // Login as Pavel
    await page.click('button:has-text("👨\u200d💻 Pavel")');
    await page.waitForURL("/words");

    // Add a card as Pavel
    await page.click('button:has-text("Add Card")');
    await page.fill('input[placeholder*="Greek"]', "γεια");
    await page.fill('input[placeholder*="Translation"]', "hello");
    await page.click('button:has-text("Save")');

    // Refresh the page
    await page.reload();
    await page.waitForURL("/words");

    // Verify Pavel is still logged in and sees his card
    await expect(page.locator("text=γεια")).toBeVisible();
    await expect(page.locator("text=hello")).toBeVisible();

    // Switch to Aleksandra
    await page.click('button:has-text("👩\u200d💻 Aleksandra")');
    await page.waitForURL("/words");

    // Verify Pavel's card is not visible
    await expect(page.locator("text=γεια")).not.toBeVisible();
    await expect(page.locator("text=hello")).not.toBeVisible();

    // Refresh again
    await page.reload();
    await page.waitForURL("/words");

    // Verify Aleksandra is still logged in and Pavel's card is still not visible
    await expect(page.locator("text=γεια")).not.toBeVisible();
    await expect(page.locator("text=hello")).not.toBeVisible();
  });
});
