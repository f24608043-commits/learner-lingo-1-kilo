import { test, expect } from '@playwright/test';

test.describe('Admin Authenticated Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as admin
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', 'alexabraham587@gmail.com');
    await page.fill('input[name="password"]', 'Qasim.11');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 30000 });
  });

  test('admin badges page responds', async ({ page }) => {
    const response = await page.goto('/admin/badges', { timeout: 30000 });
    expect(response?.status()).toBeLessThan(500);
    
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/badges|\/path/);
  });

  test('admin courses page responds', async ({ page }) => {
    const response = await page.goto('/admin/courses', { timeout: 30000 });
    expect(response?.status()).toBeLessThan(500);
    
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/courses|\/path/);
  });

  test('admin tutoring page responds', async ({ page }) => {
    const response = await page.goto('/admin/tutoring', { timeout: 30000 });
    expect(response?.status()).toBeLessThan(500);
    
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/tutoring|\/path/);
  });
});
