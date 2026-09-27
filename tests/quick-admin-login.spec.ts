import { test, expect } from '@playwright/test';

test('Quick admin login check', async ({ page }) => {
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', 'admin@gmail.com');
  await page.fill('input[name="password"]', 'admin@1221');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 20000 });
  await expect(page).toHaveURL(/\/admin/);
});
