import { test, expect } from '@playwright/test';
import { loginAs, gotoRedirectSafe } from './auth';
import { seedMessaging, cleanupMessaging, ensureDirectConversation } from './messaging-seed';

test.describe.configure({ mode: 'serial' });

test.describe('Performance Measurement - Messaging Impact', () => {
  let conversationId: string;

  test.beforeAll(async () => {
    const { learnerId, tutorId } = await seedMessaging();
    conversationId = await ensureDirectConversation(learnerId, tutorId);
  });

  test.afterAll(async () => {
    await cleanupMessaging();
  });

  test('measure /messages page load time', async ({ page }) => {
    await loginAs(page, 'tutor');

    const started = Date.now();
    await gotoRedirectSafe(page, '/messages', 60000);
    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible({ timeout: 60000 });
    const elapsed = Date.now() - started;

    console.log(`/messages rendered in ${elapsed} ms`);
  });

  test('measure /messages/[id] page load time', async ({ page }) => {
    await loginAs(page, 'tutor');

    const started = Date.now();
    await gotoRedirectSafe(page, `/messages/${conversationId}`, 60000);
    await expect(page.getByTestId('message-input')).toBeVisible({ timeout: 60000 });
    const elapsed = Date.now() - started;

    console.log(`/messages/[id] rendered in ${elapsed} ms`);
  });

  test('measure /tutoring/test-setup page load time', async ({ page }) => {
    await loginAs(page, 'tutor');

    const started = Date.now();
    await gotoRedirectSafe(page, '/tutoring/test-setup', 60000);
    await expect(page.locator('h1').first()).toContainText('Live Class Setup Test', {
      timeout: 60000,
    });
    const elapsed = Date.now() - started;

    console.log(`/tutoring/test-setup rendered in ${elapsed} ms`);
  });

  test('measure bundle size impact', async ({ page }) => {
    await loginAs(page, 'tutor');

    // Navigate to messages and capture network requests
    const jsRequests: any[] = [];

    page.on('response', async (response) => {
      const url = response.url();
      if (url.endsWith('.js') || url.includes('webpack') || url.includes('next')) {
        const headers = response.headers();
        const contentLength = headers['content-length'];
        if (contentLength) {
          jsRequests.push({
            url,
            size: parseInt(contentLength, 10),
          });
        }
      }
    });

    await page.goto('/messages');
    // 'networkidle' never settles: the shell polls /api/tutoring/reminders.
    await page.waitForLoadState('load');
    await page.waitForTimeout(3000);

    // Calculate total JS size
    const totalSize = jsRequests.reduce((sum, req) => sum + req.size, 0);
    const totalSizeKB = (totalSize / 1024).toFixed(2);

    console.log(`Total JavaScript bundle size for /messages: ${totalSizeKB} KB`);
    console.log(`Number of JS requests: ${jsRequests.length}`);

    jsRequests.forEach(req => {
      console.log(`  - ${req.url.split('/').pop()}: ${(req.size / 1024).toFixed(2)} KB`);
    });

    // Bundle size should be reasonable (< 500 KB for initial load)
    expect(totalSize).toBeLessThan(500 * 1024);
  });

  test('measure navigation shell performance', async ({ page }) => {
    await loginAs(page, 'learner');

    const started = Date.now();
    await gotoRedirectSafe(page, '/path', 60000);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 60000 });
    const elapsed = Date.now() - started;

    console.log(`/path shell rendered in ${elapsed} ms`);
  });
});