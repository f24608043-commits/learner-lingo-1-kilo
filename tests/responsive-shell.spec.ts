import { test, expect } from '@playwright/test';

test.describe('Responsive Shell - Viewport & Layout Tests', () => {
  // 1. Mobile Viewport (390x844 - iPhone 12/13/14)
  test.describe('Mobile Viewport (390x844)', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('sign-in page renders without horizontal scrollbar', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForLoadState('domcontentloaded');

      const isNoHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(isNoHorizontalOverflow).toBe(true);

      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
    });

    test('sign-up page renders without horizontal scrollbar', async ({ page }) => {
      await page.goto('/sign-up');
      await page.waitForLoadState('domcontentloaded');

      const isNoHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(isNoHorizontalOverflow).toBe(true);

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
    });

    test('landing page renders cleanly at 390px', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const isNoHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(isNoHorizontalOverflow).toBe(true);
    });
  });

  // 2. Tablet Viewport (768x1024)
  test.describe('Tablet Viewport (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('sign-in page renders cleanly on tablet', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForLoadState('domcontentloaded');

      const isNoHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(isNoHorizontalOverflow).toBe(true);
    });

    test('sign-up page renders cleanly on tablet', async ({ page }) => {
      await page.goto('/sign-up');
      await page.waitForLoadState('domcontentloaded');

      const isNoHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(isNoHorizontalOverflow).toBe(true);
    });
  });

  // 3. Desktop Viewport (1440x900)
  test.describe('Desktop Viewport (1440x900)', () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test('sign-in page renders full desktop view without horizontal scroll', async ({ page }) => {
      await page.goto('/sign-in');
      await page.waitForLoadState('domcontentloaded');

      const isNoHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(isNoHorizontalOverflow).toBe(true);
    });

    test('landing page renders full desktop view', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const isNoHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth <= window.innerWidth;
      });
      expect(isNoHorizontalOverflow).toBe(true);
    });
  });
});
