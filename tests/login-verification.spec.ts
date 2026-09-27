import { test, expect } from '@playwright/test';

test.describe('Login Verification', () => {
  test('learner can log in', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'learner@gmail.com');
    await page.fill('input[name="password"]', 'learner@1221');
    await page.click('button[type="submit"]');
    
    // Learner should land on /path or /onboarding
    await expect(page).toHaveURL(/\/path|\/onboarding/, { timeout: 15000 });
  });

  test('tutor can log in', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'tutor@gmail.com');
    await page.fill('input[name="password"]', 'tutor@1221');
    await page.click('button[type="submit"]');
    
    // Tutor should land on /tutoring/dashboard or /path
    await expect(page).toHaveURL(/\/tutoring\/dashboard|\/path/, { timeout: 15000 });
  });

  test('admin can log in', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'admin@gmail.com');
    await page.fill('input[name="password"]', 'admin@1221');
    await page.click('button[type="submit"]');
    
    // Admin should land on /admin
    await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });
  });
});
