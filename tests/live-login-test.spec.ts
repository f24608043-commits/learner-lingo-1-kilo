import { test, expect } from '@playwright/test';

test.describe('Live Login Test - Basic Verification', () => {
  test('learner can login successfully', async ({ page }) => {
    const learnerEmail = 'testlearner+test@gmail.com';
    const learnerPassword = 'Test123456!';
    
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    await page.fill('input[type="email"]', learnerEmail);
    await page.fill('input[type="password"]', learnerPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/path', { timeout: 15000 });
    
    console.log('✅ Login successful, redirected to /path');
    
    // Check if we're on the path page
    expect(page.url()).toContain('/path');
  });
});
