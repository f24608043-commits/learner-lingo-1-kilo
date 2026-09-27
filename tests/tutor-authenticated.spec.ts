import { test, expect } from '@playwright/test';

test.describe('Tutor Authenticated Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as tutor
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', 'orphix.itsolutions@gmail.com');
    await page.fill('input[name="password"]', 'Qasim.11');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tutoring\/dashboard|\/path/, { timeout: 30000 });
  });

  test('tutor can access dashboard', async ({ page }) => {
    await page.goto('/tutoring/dashboard');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/tutoring/dashboard');
  });

  test('tutor can access history page', async ({ page }) => {
    await page.goto('/tutoring/history', { timeout: 30000 });
    await page.waitForLoadState('load', { timeout: 30000 });
    
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    expect(page.url()).toContain('/tutoring/history');
  });

  test('tutor can access tutoring page', async ({ page }) => {
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/tutoring');
  });

  test('tutor is blocked from admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/path|\/tutoring\/dashboard|\/\?error=/, { timeout: 15000 });
    
    // Should be redirected away from admin pages
    expect(page.url()).not.toContain('/admin');
  });

  test('tutor is blocked from admin users page', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForURL(/\/path|\/tutoring\/dashboard|\/\?error=/, { timeout: 15000 });
    
    // Should be redirected away from admin pages
    expect(page.url()).not.toContain('/admin');
  });

  test('tutor is blocked from admin courses page', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.waitForURL(/\/path|\/tutoring\/dashboard|\/\?error=/, { timeout: 15000 });
    
    // Should be redirected away from admin pages
    expect(page.url()).not.toContain('/admin');
  });
});
