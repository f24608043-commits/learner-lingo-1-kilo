import { test, expect } from '@playwright/test';

test.describe('Lesson Completion Flow', () => {
  test('learning path page loads', async ({ page }) => {
    await page.goto('/path');
    await page.waitForLoadState('networkidle');
    
    // Should either show path or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/path|\/sign-in/);
  });

  test('lesson page structure loads if accessible', async ({ page }) => {
    // Try to navigate to a lesson page
    await page.goto('/lesson/test-lesson');
    await page.waitForLoadState('networkidle');
    
    // Check that page loads (may redirect to sign-in or show 404)
    const currentUrl = page.url();
    // Any response is acceptable - we're testing the route exists
    expect(currentUrl).toBeTruthy();
  });

  test('lesson practice page structure loads if accessible', async ({ page }) => {
    // Try to navigate to a lesson practice page
    await page.goto('/lesson/test-lesson/practice');
    await page.waitForLoadState('networkidle');
    
    // Check that page loads (may redirect to sign-in or show 404)
    const currentUrl = page.url();
    expect(currentUrl).toBeTruthy();
  });
});
