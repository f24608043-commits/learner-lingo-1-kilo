import { test, expect } from '@playwright/test';

test.describe('Login Verification', () => {
  test('learner can log in', async ({ page }) => {
    test.skip(true, 'Learner account password is incorrect - needs password reset in Supabase');
  });

  test('tutor can log in', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'orphix.itsolutions@gmail.com');
    await page.fill('input[name="password"]', 'Qasim.11');
    await page.click('button[type="submit"]');
    
    // Tutor should land on /tutoring/dashboard or /path
    await expect(page).toHaveURL(/\/tutoring\/dashboard|\/path/, { timeout: 15000 });
  });

  test('admin can log in', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', 'alexabraham587@gmail.com');
    await page.fill('input[name="password"]', 'Qasim.11');
    await page.click('button[type="submit"]');
    
    // Admin should land on /admin
    await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });
  });
});
