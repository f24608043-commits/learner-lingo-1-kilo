import { test, expect } from '@playwright/test';

test.describe('Debug Tutoring Page', () => {
  test('check tutoring page content', async ({ page }) => {
    const learnerEmail = 'testlearner+test@gmail.com';
    const learnerPassword = 'Test123456!';
    
    // Login
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', learnerEmail);
    await page.fill('input[type="password"]', learnerPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/path', { timeout: 15000 });
    
    // Navigate to tutoring
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Check for tutor cards
    const tutorCards = page.locator('.tutor-card, [class*="tutor"], [class*="Tutor"]');
    const cardCount = await tutorCards.count();
    console.log('Tutor cards found:', cardCount);
    
    // Check for book buttons
    const bookButtons = page.locator('button:has-text("Book"), button:has-text("Schedule")');
    const buttonCount = await bookButtons.count();
    console.log('Book buttons found:', buttonCount);
    
    // Take screenshot
    await page.screenshot({ path: 'tutoring-page-debug.png' });
    console.log('Screenshot saved to tutoring-page-debug.png');
    
    // Get page content
    const bodyText = await page.textContent('body');
    console.log('Page content preview:', bodyText?.substring(0, 500));
  });
});
