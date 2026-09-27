import { test, expect } from '@playwright/test';

test.describe('Duolingo-Style Claymorphism Visual Verification', () => {
  test('Capture screenshots of key pages', async ({ page }) => {
    // 1. Sign In Page
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'screenshots/sign-in-desktop.png', fullPage: true });

    // Login as learner
    await page.fill('input[type="email"]', 'learner@gmail.com');
    await page.fill('input[type="password"]', 'learner@1221');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');

    // 2. Learning Path (/path)
    await page.goto('/path');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'screenshots/path-desktop.png', fullPage: true });

    // 3. Lesson Page (/lesson/[id])
    await page.goto('/lesson/dd4e5ae3-5f37-4bdc-ae1d-13239a226a0f');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'screenshots/lesson-desktop.png', fullPage: true });

    // 4. Tutoring Page (/tutoring)
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'screenshots/tutoring-desktop.png', fullPage: true });

    // 5. Friends Page (/friends)
    await page.goto('/friends');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'screenshots/friends-desktop.png', fullPage: true });

    // 5b. Leaderboard Page (/leaderboard)
    await page.goto('/leaderboard');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'screenshots/leaderboard-desktop.png', fullPage: true });

    // 6. Mobile Viewport (390x844) on Path
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/path');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'screenshots/path-mobile-390.png', fullPage: true });

    // 7. Sign in as Admin and capture Admin Dashboard
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', 'admin@gmail.com');
    await page.fill('input[type="password"]', 'admin@1221');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');

    await page.goto('/admin');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: 'screenshots/admin-desktop.png', fullPage: true });
  });
});
