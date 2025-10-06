import { test, expect } from '@playwright/test';

test.describe('Production Site Tests', () => {
  const PRODUCTION_URL = 'https://greek-words.netlify.app/';

  test('production site loads', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if page has title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if page is not just "Загрузка..."
    const bodyText = await page.textContent('body');
    console.log('Body text:', bodyText);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'production-site-screenshot.png' });
    
    // Basic checks
    expect(title).toBeTruthy();
    expect(bodyText).toBeTruthy();
  });

  test('check for Supabase configuration error', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // Check console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit for any async errors
    await page.waitForTimeout(3000);
    
    // Check for specific Supabase error
    const hasSupabaseError = consoleErrors.some(error => 
      error.includes('Supabase not configured') || 
      error.includes('supabase') ||
      error.includes('Failed to fetch')
    );
    
    console.log('Console errors:', consoleErrors);
    
    if (hasSupabaseError) {
      console.log('❌ Supabase configuration error detected');
    } else {
      console.log('✅ No Supabase errors found');
    }
  });

  test('check page content and elements', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    // Check for common elements
    const elements = {
      body: await page.locator('body').count(),
      main: await page.locator('main, [role="main"]').count(),
      nav: await page.locator('nav, [role="navigation"]').count(),
      buttons: await page.locator('button').count(),
      inputs: await page.locator('input').count(),
      links: await page.locator('a').count()
    };
    
    console.log('Page elements found:', elements);
    
    // Check if page has meaningful content
    const bodyText = await page.textContent('body');
    const isJustLoading = bodyText === 'Загрузка...' || bodyText?.trim() === 'Загрузка...';
    
    if (isJustLoading) {
      console.log('❌ Page shows only "Загрузка..." - likely a loading issue');
    } else {
      console.log('✅ Page has content beyond loading state');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'production-content-check.png' });
  });

  test('check network requests', async ({ page }) => {
    const requests: string[] = [];
    const responses: { url: string, status: number }[] = [];
    
    page.on('request', request => {
      requests.push(request.url());
    });
    
    page.on('response', response => {
      responses.push({ url: response.url(), status: response.status() });
    });
    
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');
    
    console.log('Network requests made:', requests.length);
    console.log('Network responses received:', responses.length);
    
    // Check for failed requests
    const failedRequests = responses.filter(r => r.status >= 400);
    if (failedRequests.length > 0) {
      console.log('❌ Failed requests:', failedRequests);
    } else {
      console.log('✅ All requests successful');
    }
    
    // Check for Supabase requests
    const supabaseRequests = requests.filter(url => url.includes('supabase'));
    console.log('Supabase requests:', supabaseRequests);
  });
});
