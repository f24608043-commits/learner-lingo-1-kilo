import { test } from '@playwright/test';
import { loginAs } from './auth';

const SHOTS = 'screenshots';

/**
 * `fullPage` captures intermittently fail in dev with
 * "Page.captureScreenshot: Unable to capture screenshot" while a route is
 * still settling. Retry briefly instead of failing the evidence run.
 */
async function shot(page: import('@playwright/test').Page, name: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.screenshot({ path: `${SHOTS}/${name}`, fullPage: true });
      return;
    } catch (err) {
      if (attempt === 3) throw err;
      await page.waitForLoadState('load').catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
}

test.describe('Duolingo-Style Claymorphism Visual Verification', () => {
  test('Capture screenshots of key pages', async ({ page }) => {
    // 1. Sign In Page
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded');
    await shot(page, 'sign-in-desktop.png');

    // 2. Learning Path (/path)
    await loginAs(page, 'learner');
    await page.goto('/path');
    await page.waitForLoadState('domcontentloaded');
    await shot(page, 'path-desktop.png');

    // 3. Lesson Page (/lesson/[id])
    await page.goto('/lesson/dd4e5ae3-5f37-4bdc-ae1d-13239a226a0f');
    await page.waitForLoadState('domcontentloaded');
    await shot(page, 'lesson-desktop.png');

    // 4. Tutoring Page (/tutoring)
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded');
    await shot(page, 'tutoring-desktop.png');

    // 5. Friends Page (/friends)
    await page.goto('/friends');
    await page.waitForLoadState('domcontentloaded');
    await shot(page, 'friends-desktop.png');

    // 5b. Leaderboard Page (/leaderboard)
    await page.goto('/leaderboard');
    await page.waitForLoadState('domcontentloaded');
    await shot(page, 'leaderboard-desktop.png');

    // 6. Mobile Viewport (390x844) on Path
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/path');
    await page.waitForLoadState('domcontentloaded');
    await shot(page, 'path-mobile-390.png');

    // 7. Admin Dashboard
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await shot(page, 'admin-desktop.png');
  });
});
