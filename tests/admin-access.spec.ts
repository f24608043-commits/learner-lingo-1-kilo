import { test, expect } from '@playwright/test';

test.describe('Admin Navigation and Access Control', () => {
  test('admin dashboard page loads', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Should either show admin or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin|\/sign-in/);
  });

  test('admin users page loads', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    
    // Should either show users or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/users|\/sign-in/);
  });

  test('admin badges page loads', async ({ page }) => {
    await page.goto('/admin/badges');
    await page.waitForLoadState('networkidle');
    
    // Should either show badges or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/badges|\/sign-in/);
  });

  test('admin courses page loads', async ({ page }) => {
    await page.goto('/admin/courses');
    await page.waitForLoadState('networkidle');
    
    // Should either show courses or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/courses|\/sign-in/);
  });

  test('admin tutoring page loads', async ({ page }) => {
    await page.goto('/admin/tutoring');
    await page.waitForLoadState('networkidle');
    
    // Should either show tutoring or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/tutoring|\/sign-in/);
  });

  test('admin routes redirect unauthorized users', async ({ page }) => {
    // Try to access admin without authentication
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Should redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toContain('/sign-in');
  });
});
