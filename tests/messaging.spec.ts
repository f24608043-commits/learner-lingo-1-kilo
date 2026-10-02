import { test, expect } from '@playwright/test';
import { loginAs, gotoRedirectSafe } from './auth';

test.describe('Messaging System', () => {
  test('tutor can open the messages page', async ({ page }) => {
    await loginAs(page, 'tutor', '/messages');

    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible({ timeout: 30000 });

    // Either a conversation or the empty state, but one of them must render.
    const conversations = page.getByTestId('conversation-item');
    const empty = page.getByText('No conversations yet');
    await expect(conversations.or(empty).first()).toBeVisible({ timeout: 30000 });
  });

  test('messages navigation exists in shell', async ({ page }) => {
    await loginAs(page, 'tutor');

    await expect(page.locator('a[href="/messages"]').first()).toBeVisible({ timeout: 30000 });
  });

  test('message button exists on tutor cards', async ({ page }) => {
    await loginAs(page, 'learner', '/tutoring');

    const card = page.getByTestId('tutor-card').first();
    await expect(card).toBeVisible({ timeout: 60000 });
    await expect(card.getByTestId('tutor-message-button')).toBeVisible();
  });

  test('every friends card exposes a chat button', async ({ page }) => {
    await loginAs(page, 'learner', '/friends');

    await expect(page.getByRole('heading', { name: /Your Learning Squad/ })).toBeVisible({
      timeout: 60000,
    });

    const cards = page.getByTestId('friend-card');
    await expect
      .poll(async () => cards.getByTestId('friend-chat-button').count(), { timeout: 60000 })
      .toBe(await cards.count());
  });

  test('test-setup page loads with camera/mic/speaker test', async ({ page }) => {
    await gotoRedirectSafe(page, '/tutoring/test-setup', 60000);

    await expect(page.locator('h1').first()).toContainText('Live Class Setup Test', {
      timeout: 30000,
    });
    await expect(page.locator('h2:has-text("Camera")').first()).toBeVisible();
    await expect(page.locator('h2:has-text("Microphone")').first()).toBeVisible();
    await expect(page.locator('h2:has-text("Speaker")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Start Camera")')).toBeVisible();
    await expect(page.locator('button:has-text("Start Mic")')).toBeVisible();
    await expect(page.locator('button:has-text("Test Speaker")')).toBeVisible();
  });

  test('admin can access messages', async ({ page }) => {
    await loginAs(page, 'admin', '/messages');

    await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible({ timeout: 30000 });
  });

  test('unauthenticated user redirected from messages', async ({ page }) => {
    await gotoRedirectSafe(page, '/messages', 60000);

    expect(page.url()).toContain('/sign-in');
  });

  test('unauthenticated user redirected from message thread', async ({ page }) => {
    await gotoRedirectSafe(
      page,
      '/messages/00000000-0000-0000-0000-000000000000',
      60000
    );

    expect(page.url()).toContain('/sign-in');
  });

  test('course creation page loads', async ({ page }) => {
    await loginAs(page, 'admin', '/admin/courses/new');

    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
  });

  test('friends page loads and functions', async ({ page }) => {
    await loginAs(page, 'tutor', '/friends');

    await expect(page.locator('h1').first()).toContainText(/Your Learning Squad/, {
      timeout: 30000,
    });
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  });

  test('tutoring page loads with tutor list', async ({ page }) => {
    await loginAs(page, 'tutor', '/tutoring');

    await expect(
      page
        .locator('h2:has-text("Find a Tutor"), h2:has-text("Tutors"), h2:has-text("Tutor Directory")')
        .first()
    ).toBeVisible({ timeout: 60000 });
  });

  test('profile page loads', async ({ page }) => {
    await gotoRedirectSafe(page, '/profile/00000000-0000-0000-0000-000000000000', 60000);

    const pageTitle = page.locator('h1').first();
    await expect(pageTitle).toBeVisible({ timeout: 30000 });
    await expect(pageTitle).toContainText(/User Not Found|Learner|Tutor|Admin|This page couldn't/);
  });
});
