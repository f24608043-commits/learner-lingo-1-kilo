import { test, expect } from '@playwright/test';

test.describe('Page Screenshots', () => {
  const pages = [
    { path: '/path', name: 'path' },
    { path: '/library', name: 'library' },
    { path: '/friends', name: 'friends' },
    { path: '/leaderboard', name: 'leaderboard' },
    { path: '/notifications', name: 'notifications' },
    { path: '/tutoring', name: 'tutoring' },
  ];

  pages.forEach(({ path, name }) => {
    test(`screenshot ${name} page - desktop`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await page.screenshot({ 
        path: `screenshots/desktop/${name}.png`,
        fullPage: true 
      });
    });

    test(`screenshot ${name} page - mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
      await page.screenshot({ 
        path: `screenshots/mobile/${name}.png`,
        fullPage: true 
      });
    });
  });
});
