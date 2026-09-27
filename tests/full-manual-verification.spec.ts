import { test, expect } from '@playwright/test';

test.describe('Full Platform Manual Verification', () => {
  const CREATED_ACCOUNTS: { email: string; password: string; role: string }[] = [];

  test.afterAll(async () => {
    console.log('\n=== DEMO ACCOUNTS CREATED ===');
    for (const acc of CREATED_ACCOUNTS) {
      console.log(`${acc.role.toUpperCase()}: ${acc.email} / ${acc.password}`);
    }
  });

  test('1. Sign-up and login flow works for all roles', async ({ page }) => {
    const timestamp = Date.now();

    const accounts = [
      { role: 'learner', name: `Learner ${timestamp}` },
      { role: 'tutor', name: `Tutor ${timestamp}` },
      { role: 'admin', name: `Admin ${timestamp}` },
    ];

    for (const acc of accounts) {
      const email = `${acc.role}.${timestamp}@test.com`;
      const password = 'Demo@1221';

      await page.goto('/sign-up');
      await page.waitForLoadState('networkidle');
      await page.fill('input[name="displayName"]', acc.name);
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');

      const currentUrl = page.url();
      console.log(`Sign-up ${acc.role} result: ${currentUrl}`);

      if (currentUrl.includes('/onboarding') || currentUrl.includes('/path')) {
        CREATED_ACCOUNTS.push({ email, password, role: acc.role });
      }
    }
  });

  test('2. Learner flow verification', async ({ page }) => {
    const learner = CREATED_ACCOUNTS.find(a => a.role === 'learner');
    if (!learner) {
      test.skip(true, 'No learner account created');
      return;
    }

    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', learner.email);
    await page.fill('input[name="password"]', learner.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/path|\/onboarding/, { timeout: 15000 });

    await page.goto('/path');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText(/Python|Streak|XP/, { timeout: 10000 });

    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText(/Library|Video/, { timeout: 10000 });

    await page.goto('/friends');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    await page.goto('/leaderboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText(/Leaderboard|Rank/, { timeout: 10000 });

    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText('Messages', { timeout: 10000 });
  });

  test('3. Tutor flow verification', async ({ page }) => {
    const tutor = CREATED_ACCOUNTS.find(a => a.role === 'tutor');
    if (!tutor) {
      test.skip(true, 'No tutor account created');
      return;
    }

    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', tutor.email);
    await page.fill('input[name="password"]', tutor.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tutoring/, { timeout: 15000 });

    await page.goto('/tutoring');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText(/Tutoring|Hub/, { timeout: 10000 });

    await page.goto('/tutoring/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    await page.goto('/messages');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText('Messages', { timeout: 10000 });
  });

  test('4. Admin flow verification', async ({ page }) => {
    const admin = CREATED_ACCOUNTS.find(a => a.role === 'admin');
    if (!admin) {
      test.skip(true, 'No admin account created');
      return;
    }

    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', admin.email);
    await page.fill('input[name="password"]', admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText('Admin', { timeout: 10000 });

    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText(/Users|Admin/, { timeout: 10000 });

    await page.goto('/admin/courses');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText(/Courses|Admin/, { timeout: 10000 });

    await page.goto('/admin/badges');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1').first()).toContainText(/Badges|Admin/, { timeout: 10000 });
  });
});
