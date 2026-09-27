import { test } from '@playwright/test';

test.describe('Login Time Measurement', () => {
  test('measure login time', async ({ page }) => {
    // Navigate to sign-in page
    const startTime = Date.now();
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'testlearner+test@gmail.com');
    await page.fill('input[type="password"]', 'Test123456!');
    
    // Click submit and measure time to reach path page
    const submitStartTime = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForURL('/path', { timeout: 15000 });
    const submitEndTime = Date.now();
    
    const loginTime = submitEndTime - submitStartTime;
    const totalTime = submitEndTime - startTime;
    
    console.log(`📊 Login Time Measurement:`);
    console.log(`   Submit to Path: ${loginTime}ms`);
    console.log(`   Total Time: ${totalTime}ms`);
    
    if (loginTime > 5000) {
      console.log(`⚠️ Login time exceeds 5 seconds: ${loginTime}ms`);
    } else {
      console.log(`✅ Login time is acceptable: ${loginTime}ms`);
    }
  });
});
