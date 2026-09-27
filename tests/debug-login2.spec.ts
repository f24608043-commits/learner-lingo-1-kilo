import { test, expect } from '@playwright/test';

test.describe('Debug Login 2', () => {
  test('admin login exact copy of working test', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', 'admin@gmail.com');
    await page.fill('input[name="password"]', 'admin@1221');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
  });

  test('orphix login exact copy of working test', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', 'orphix.itsolutions@gmail.com');
    await page.fill('input[name="password"]', 'Qasim.11');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/tutoring\/dashboard|\/path/, { timeout: 15000 });
  });
});
