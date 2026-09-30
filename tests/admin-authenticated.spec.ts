import { test, expect } from '@playwright/test';
import { authState } from './auth';

test.use({ storageState: authState('admin') });

test.describe('Admin Authenticated Tests', () => {
  test('admin badges page responds', async ({ page }) => {
    const response = await page.goto('/admin/badges', { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBeLessThan(500);

    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/badges|\/path/);
  });

  test('admin courses page responds', async ({ page }) => {
    const response = await page.goto('/admin/courses', { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBeLessThan(500);

    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/courses|\/path/);
  });

  test('admin tutoring page responds', async ({ page }) => {
    const response = await page.goto('/admin/tutoring', { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(response?.status()).toBeLessThan(500);

    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/admin\/tutoring|\/path/);
  });
});
