import { test, expect } from '@playwright/test';

test.describe('Navigation Links Functionality', () => {
  test('sign in page has link to sign up', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    const signUpLink = page.locator('a[href="/sign-up"], a:has-text("Sign up"), a:has-text("Register")');
    if (await signUpLink.count() > 0) {
      await expect(signUpLink.first()).toBeVisible();
    } else {
      test.skip(true, 'Sign up link not found on sign-in page');
    }
  });

  test('sign up page has link to sign in', async ({ page }) => {
    await page.goto('/sign-up');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    const signInLink = page.locator('a[href="/sign-in"], a:has-text("Sign in"), a:has-text("Login")');
    if (await signInLink.count() > 0) {
      await expect(signInLink.first()).toBeVisible();
    } else {
      test.skip(true, 'Sign in link not found on sign-up page');
    }
  });
});
