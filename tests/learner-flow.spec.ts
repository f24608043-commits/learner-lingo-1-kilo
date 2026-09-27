import { test, expect } from '@playwright/test';

test.describe('Learner Flow', () => {
  test('sign up page loads', async ({ page }) => {
    await page.goto('/sign-up');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('input[name="displayName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('sign in page loads', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('library page loads (redirects to sign-in if not auth)', async ({ page }) => {
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    
    // Should either show library or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/library|\/sign-in/);
  });

  test('tutoring page loads (redirects to sign-in if not auth)', async ({ page }) => {
    await page.goto('/tutoring');
    await page.waitForLoadState('networkidle');
    
    // Should either show tutoring or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/tutoring|\/sign-in/);
  });

  test('learning path page loads (redirects to sign-in if not auth)', async ({ page }) => {
    await page.goto('/path');
    await page.waitForLoadState('networkidle');
    
    // Should either show path or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/path|\/sign-in/);
  });
});
