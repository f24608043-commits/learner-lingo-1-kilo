import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control & Navigation Verification', () => {
  // Test Credentials
  const ADMIN = { email: 'admin@gmail.com', password: 'admin@1221' };
  const TUTOR = { email: 'tutor@gmail.com', password: 'tutor@1221' };
  const LEARNER = { email: 'learner@gmail.com', password: 'learner@1221' };

  test('1. Admin role access verification', async ({ page }) => {
    // Sign in as Admin
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });
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
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', TUTOR.email);
    await page.fill('input[type="password"]', TUTOR.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tutoring/, { timeout: 15000 });

    // Tutor can access tutoring views
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/tutoring/);

    // Tutor CANNOT access /admin -> should redirect away
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    const url = page.url();
    expect(url).not.toContain('/admin');
  });

  test('3. Learner role access verification', async ({ page }) => {
    // Sign in as Learner
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', LEARNER.email);
    await page.fill('input[type="password"]', LEARNER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/path|\/onboarding/, { timeout: 15000 });

    // Learner can access path & library
    await page.goto('/path');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/path/);

    // Learner CANNOT access /admin -> should redirect
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/admin');

    // Learner CANNOT access /tutoring/dashboard -> should redirect
    await page.goto('/tutoring/dashboard');
    await page.waitForURL(/\/tutoring(\?.*)?$/, { timeout: 15000 });
    expect(page.url()).not.toContain('/tutoring/dashboard');
  });
});
