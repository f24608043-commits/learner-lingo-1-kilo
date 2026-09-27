import { test, expect } from '@playwright/test';

test.describe('Sign-up Flow Debug', () => {
  test('sign-up learner with waitForURL', async ({ page }) => {
    const email = `learner.debug.${Date.now()}@test.com`;
    await page.goto('/sign-up');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="displayName"]', 'Debug Learner');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Demo@1221');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/onboarding|\/path|\/sign-in/, { timeout: 15000 });
    console.log('Final URL:', page.url());
  });
});
