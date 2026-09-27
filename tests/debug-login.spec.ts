import { test, expect } from '@playwright/test';

test.describe('Debug Login', () => {
  test('admin login with name selector', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', 'admin@gmail.com');
    await page.fill('input[name="password"]', 'admin@1221');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin/);
  });

  test('tutor login with name selector', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', 'tutor@gmail.com');
    await page.fill('input[name="password"]', 'tutor@1221');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tutoring/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/tutoring/);
  });

  test('learner login with name selector', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', 'learner@gmail.com');
    await page.fill('input[name="password"]', 'learner@1221');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/path|\/onboarding/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/path|\/onboarding/);
  });
});
