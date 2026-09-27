import { test, expect } from '@playwright/test';

test.describe('Create Demo Accounts via UI', () => {
  test('create learner account', async ({ page }) => {
    const email = `learner.demo.${Date.now()}@test.com`;
    await page.goto('/sign-up');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Demo@1221');
    await page.fill('input[name="displayName"]', 'Demo Learner');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/onboarding|\/path/, { timeout: 15000 });
    console.log('Created learner:', email);
  });

  test('create tutor account', async ({ page }) => {
    const email = `tutor.demo.${Date.now()}@test.com`;
    await page.goto('/sign-up');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Demo@1221');
    await page.fill('input[name="displayName"]', 'Demo Tutor');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/onboarding|\/tutoring/, { timeout: 15000 });
    console.log('Created tutor:', email);
  });

  test('create admin account', async ({ page }) => {
    const email = `admin.demo.${Date.now()}@test.com`;
    await page.goto('/sign-up');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Demo@1221');
    await page.fill('input[name="displayName"]', 'Demo Admin');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/onboarding|\/admin/, { timeout: 15000 });
    console.log('Created admin:', email);
  });
});
