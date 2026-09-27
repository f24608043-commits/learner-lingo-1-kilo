import { test, expect } from '@playwright/test';

test.describe('Design Verification - Claymorphism + Mobile Nav', () => {
  const pages = ['/path', '/messages', '/tutoring', '/admin'];
  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'desktop', width: 1920, height: 1080 }
  ];

  viewports.forEach(({ name, width, height }) => {
    pages.forEach((pagePath) => {
      test(`${name} - ${pagePath}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        
        // Sign in as learner for learner pages, admin for admin pages
        if (pagePath === '/admin') {
          await page.goto('/sign-in');
          await page.fill('input[type="email"]', 'alexabraham587@gmail.com');
          await page.fill('input[type="password"]', 'Qasim.11');
          await page.click('button[type="submit"]');
          await page.waitForLoadState('networkidle', { timeout: 30000 });
        } else {
          await page.goto('/sign-in');
          await page.fill('input[type="email"]', 'testlearner+test@gmail.com');
          await page.fill('input[type="password"]', 'Test123456!');
          await page.click('button[type="submit"]');
          await page.waitForLoadState('networkidle', { timeout: 30000 });
          
          // Handle onboarding redirect
          const url = page.url();
          if (url.includes('/onboarding')) {
            await page.goto('/path');
          }
        }
        
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        
        // Take screenshot
        await page.screenshot({
          path: `screenshots/${name}/${pagePath.replace('/', '')}.png`,
          fullPage: true
        });
        
        console.log(`✅ Screenshot taken: ${name} - ${pagePath}`);
      });
    });
  });
});
