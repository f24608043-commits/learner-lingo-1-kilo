import { test, expect } from '@playwright/test';

const ACCOUNTS = {
  admin: { email: 'admin@gmail.com', password: 'admin@1221' },
  tutor: { email: 'tutor@gmail.com', password: 'tutor@1221' },
  learner: { email: 'learner@gmail.com', password: 'learner@1221' },
};

async function loginAs(page: any, role: 'admin' | 'tutor' | 'learner') {
  const acc = ACCOUNTS[role];
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');
  await page.fill('input[name="email"]', acc.email);
  await page.fill('input[name="password"]', acc.password);
  await page.click('button[type="submit"]');
  if (role === 'admin') {
    await page.waitForURL(/\/admin/, { timeout: 20000 });
  } else if (role === 'tutor') {
    await page.waitForURL(/\/tutoring/, { timeout: 20000 });
  } else {
    await page.waitForURL(/\/path|\/onboarding/, { timeout: 20000 });
  }
}

test.describe('Comprehensive Manual Verification Report', () => {
  test('ADMIN: Login and dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toContainText('Admin', { timeout: 10000 });
  });

  test('ADMIN: Users management', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('ADMIN: Courses management', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/courses');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('ADMIN: Badges management', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/badges');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('ADMIN: Tutoring management', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin/tutoring');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('ADMIN: Can access messages', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toContainText('Messages', { timeout: 10000 });
  });

  test('TUTOR: Login and dashboard', async ({ page }) => {
    await loginAs(page, 'tutor');
    await page.goto('/tutoring/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('TUTOR: Tutoring hub', async ({ page }) => {
    await loginAs(page, 'tutor');
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toContainText(/Tutoring|Hub/, { timeout: 10000 });
  });

  test('TUTOR: History', async ({ page }) => {
    await loginAs(page, 'tutor');
    await page.goto('/tutoring/history');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('TUTOR: Messages', async ({ page }) => {
    await loginAs(page, 'tutor');
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toContainText('Messages', { timeout: 10000 });
  });

  test('TUTOR: Cannot access admin', async ({ page }) => {
    await loginAs(page, 'tutor');
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/admin');
  });

  test('LEARNER: Login and path', async ({ page }) => {
    await loginAs(page, 'learner');
    await page.goto('/path');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('LEARNER: Library', async ({ page }) => {
    await loginAs(page, 'learner');
    await page.goto('/library');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toContainText(/Library|Video/, { timeout: 10000 });
  });

  test('LEARNER: Friends', async ({ page }) => {
    await loginAs(page, 'learner');
    await page.goto('/friends');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('LEARNER: Leaderboard', async ({ page }) => {
    await loginAs(page, 'learner');
    await page.goto('/leaderboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toContainText(/Leaderboard|Rank/, { timeout: 10000 });
  });

  test('LEARNER: Messages', async ({ page }) => {
    await loginAs(page, 'learner');
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1').first()).toContainText('Messages', { timeout: 10000 });
  });

  test('LEARNER: Cannot access admin', async ({ page }) => {
    await loginAs(page, 'learner');
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).not.toContain('/admin');
  });

  test('LEARNER: Cannot access tutoring dashboard', async ({ page }) => {
    await loginAs(page, 'learner');
    await page.goto('/tutoring/dashboard');
    await page.waitForURL(/\/tutoring(\?.*)?$/, { timeout: 15000 });
    expect(page.url()).not.toContain('/tutoring/dashboard');
  });
});
