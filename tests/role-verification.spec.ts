import { test, expect } from '@playwright/test';
import { loginAs, gotoRedirectSafe } from './auth';

test.describe('Role-Based Access Control & Navigation Verification', () => {
  test('1. Admin role access verification', async ({ page }) => {
    // Sign in as Admin
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);
    
    // Check admin pages
    await page.goto('/admin/courses');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/admin\/courses/);

    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  test('2. Tutor role access verification', async ({ page }) => {
    // Sign in as Tutor
    await loginAs(page, 'tutor');

    // Tutor can access tutoring views
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/tutoring/);

    // Tutor CANNOT access /admin -> should redirect away
    await gotoRedirectSafe(page, '/admin');
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 20000 });
  });

  test('3. Learner role access verification', async ({ page }) => {
    // Sign in as Learner
    await loginAs(page, 'learner');

    // Learner can access path & library
    await page.goto('/path');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/path/);

    // Learner CANNOT access /admin -> should redirect
    await gotoRedirectSafe(page, '/admin');
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 20000 });

    // Learner CANNOT access /tutoring/dashboard -> should redirect
    await gotoRedirectSafe(page, '/tutoring/dashboard');
    await expect(page).not.toHaveURL(/\/tutoring\/dashboard/, { timeout: 20000 });
  });
});
