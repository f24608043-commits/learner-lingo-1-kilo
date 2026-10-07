import { test, expect } from '@playwright/test';

const ACCOUNTS = [
  { email: 'bilal@gmail.com', password: 'BilalUsmanJunaid@1221', role: 'tutor', land: /\/tutoring\/dashboard/ },
  { email: 'usman@gmail.com', password: 'BilalUsmanJunaid@1221', role: 'admin', land: /\/admin/ },
  { email: 'junaid@gmail.com', password: 'BilalUsmanJunaid@1221', role: 'learner', land: /\/path/ },
];

/** The Supabase auth call intermittently returns "fetch failed", so a sign-in
 * that lands on the error page is retried instead of failing the role check. */
async function signIn(page: any, email: string, password: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto('/sign-in');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for the submit to resolve - either a redirect or an error page.
    await page.waitForURL(/\/(tutoring|admin|path|onboarding|sign-in\?error)/, { timeout: 25000 });
    if (!page.url().includes('error=')) return;
    await page.waitForTimeout(1500);
  }
}

test.describe('Bilal / Usman / Junaid role verification', () => {
  for (const a of ACCOUNTS) {
    test(`${a.role} ${a.email} signs in and lands on their dashboard`, async ({ page }) => {
      await signIn(page, a.email, a.password);

      // Sign-in either redirects or lands on the error page with a query param.
      await expect(page).toHaveURL(a.land, { timeout: 30000 });

      // Each role must see its own nav entry.
      await expect(page.locator('a[href="/groups"]').first()).toBeVisible({ timeout: 30000 });
    });
  }

  test('admin can open the admin surface', async ({ page }) => {
    await signIn(page, 'usman@gmail.com', 'BilalUsmanJunaid@1221');
    await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });
    await expect(page.getByText('Full Control').first()).toBeVisible({ timeout: 30000 });
  });

  test('learner can reach the path or the onboarding flow', async ({ page }) => {
    await signIn(page, 'junaid@gmail.com', 'BilalUsmanJunaid@1221');

    // A fresh learner has no active enrollment, so the path page sends them to
    // onboarding - both are valid landing points for the learner role.
    await expect(page).toHaveURL(/\/(path|onboarding)/, { timeout: 30000 });
    await expect(page.locator('a[href="/groups"]').first()).toBeVisible({ timeout: 30000 });
  });

test('admin can manage users and see the user table', async ({ page }) => {
    await signIn(page, 'usman@gmail.com', 'BilalUsmanJunaid@1221');
    await expect(page).toHaveURL(/\/admin/, { timeout: 30000 });
    await page.goto('/admin/users');
    await expect(page.getByText('View and manage user roles').first()).toBeVisible({ timeout: 30000 });

    // Wait for the user table to be visible (indicates data loaded)
    await page.locator('table').waitFor({ state: 'visible', timeout: 30000 });

    // Verify the table has the expected columns
    await expect(page.locator('th', { hasText: 'Name' }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('th', { hasText: 'Role' }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('th', { hasText: 'XP' }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('th', { hasText: 'Streak' }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('th', { hasText: 'Actions' }).first()).toBeVisible({ timeout: 30000 });

    // Verify at least one user row is present (Bilal should be in first 50)
    await expect(page.locator('td', { hasText: 'Bilal' }).first()).toBeVisible({ timeout: 30000 });

    // Verify role badges are rendered
    await expect(page.locator('span', { hasText: 'Tutor' }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('span', { hasText: 'Admin' }).first()).toBeVisible({ timeout: 30000 });
    await expect(page.locator('span', { hasText: 'Learner' }).first()).toBeVisible({ timeout: 30000 });
  });

  test('tutor and learner can both reach the groups hub', async ({ page }) => {
    await signIn(page, 'bilal@gmail.com', 'BilalUsmanJunaid@1221');
    await page.goto('/groups');
    await expect(page.getByTestId('groups-page')).toBeVisible({ timeout: 30000 });

    await signIn(page, 'junaid@gmail.com', 'BilalUsmanJunaid@1221');
    await page.goto('/groups');
    await expect(page.getByTestId('groups-page')).toBeVisible({ timeout: 30000 });
    await expect(page.getByTestId('group-code-input')).toBeVisible({ timeout: 30000 });
  });
});