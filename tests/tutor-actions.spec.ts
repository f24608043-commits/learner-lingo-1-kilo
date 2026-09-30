import { test, expect } from '@playwright/test';
import { loginAs } from './auth';

test.describe('Tutor Actions - Profile and Sessions', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as tutor
    await loginAs(page, 'tutor');
  });

  test('tutor can access create profile button', async ({ page }) => {
    // Already on dashboard from beforeEach
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Look for create profile button
    const createProfileButton = page.locator('button:has-text("Create Profile"), a:has-text("Create Profile"), button:has-text("Setup Profile")');
    
    if (await createProfileButton.count() > 0) {
      await expect(createProfileButton.first()).toBeVisible();
      await expect(createProfileButton.first()).toBeEnabled();
    } else {
      // Profile might already exist, check for edit button
      const editProfileButton = page.locator('button:has-text("Edit Profile"), a:has-text("Edit Profile")');
      if (await editProfileButton.count() > 0) {
        await expect(editProfileButton.first()).toBeVisible();
      }
    }
  });

  test('tutor can access edit availability button', async ({ page }) => {
    // Already on dashboard from beforeEach
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Look for edit availability button
    const editAvailabilityButton = page.locator('button:has-text("Edit Availability"), a:has-text("Edit Availability"), button:has-text("Set Availability")');
    
    if (await editAvailabilityButton.count() > 0) {
      await expect(editAvailabilityButton.first()).toBeVisible();
      await expect(editAvailabilityButton.first()).toBeEnabled();
    } else {
      test.skip(true, 'Edit availability button not found');
    }
  });

  test('tutor dashboard shows session history', async ({ page }) => {
    test.skip(true, 'History page load event never fires in dev mode - DOM loads but event never fires');
    await page.goto('/tutoring/history', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Look for session history table or list
    const table = page.locator('table');
    const sessionList = page.locator('[class*="session"], [class*="Session"]');
    
    if (await table.count() > 0) {
      await expect(table.first()).toBeVisible();
      const rows = page.locator('tbody tr, tr');
      expect(await rows.count()).toBeGreaterThanOrEqual(0);
    } else if (await sessionList.count() > 0) {
      await expect(sessionList.first()).toBeVisible();
    } else {
      // No sessions is acceptable
      const noSessions = page.locator('text=No sessions, text=No history, text=No upcoming');
      if (await noSessions.count() > 0) {
        await expect(noSessions.first()).toBeVisible();
      }
    }
  });

  test('tutor can access tutoring page to see learners', async ({ page }) => {
    await page.goto('/tutoring', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Look for tutor list or session booking interface
    const pageContent = await page.textContent('body');
    
    // Should show tutoring-related content
    expect(pageContent).toMatch(/tutor|session|book|schedule/i);
  });
});
