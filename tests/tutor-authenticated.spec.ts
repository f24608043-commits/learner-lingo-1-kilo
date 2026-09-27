import { test, expect } from '@playwright/test';

test.describe('Tutor Authenticated Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as tutor
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', 'tutor@gmail.com');
    await page.fill('input[name="password"]', 'tutor@1221');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tutoring\/dashboard/, { timeout: 30000 });
  });

  test('tutor can access dashboard', async ({ page }) => {
    await page.goto('/tutoring/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/tutoring/dashboard');
  });

  test('tutor can access history page', async ({ page }) => {
    await page.goto('/tutoring/history', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/tutoring/history');
  });

  test('tutor can access tutoring page', async ({ page }) => {
    await page.goto('/tutoring', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/tutoring');
  });

  test('tutor is blocked from admin dashboard', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/tutoring\/dashboard|\/path|\/\?error=/, { timeout: 15000 });
    
    // Should be redirected away from admin pages
    expect(page.url()).not.toContain('/admin');
  });

  test('tutor is blocked from admin users page', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/tutoring\/dashboard|\/path|\/\?error=/, { timeout: 15000 });
    
    // Should be redirected away from admin pages
    expect(page.url()).not.toContain('/admin');
  });

  test('tutor is blocked from admin courses page', async ({ page }) => {
    await page.goto('/admin/courses', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/tutoring\/dashboard|\/path|\/\?error=/, { timeout: 15000 });
    
    // Should be redirected away from admin pages
    expect(page.url()).not.toContain('/admin');
  });
});
