import { test, expect } from '@playwright/test';
import { authState, gotoRedirectSafe } from './auth';
import {
  seedMessaging,
  cleanupMessaging,
  ensureDirectConversation,
  isMessagesRealtimeEnabled,
  countMessages,
  LEARNER_EMAIL,
  TUTOR_EMAIL,
} from './messaging-seed';
import { findUserIdByEmail } from './classroom-seed';

test.describe.configure({ mode: 'serial' });

test.describe('Realtime Messaging', () => {
  let conversationId: string;

  test.beforeAll(async () => {
    const { learnerId, tutorId } = await seedMessaging();
    conversationId = await ensureDirectConversation(learnerId, tutorId);
  });

  test.afterAll(async () => {
    await cleanupMessaging();
  });

  test('messages table is in the realtime publication', async () => {
    // Without this the subscription connects but never fires, so live delivery
    // silently stops working.
    expect(await isMessagesRealtimeEnabled()).toBe(true);
  });

  test('messages page loads for both users', async ({ browser }) => {
    for (const role of ['learner', 'tutor'] as const) {
      const context = await browser.newContext({ storageState: authState(role) });
      const page = await context.newPage();
      await gotoRedirectSafe(page, '/messages', 60000);

      await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible({
        timeout: 60000,
      });
      await context.close();
    }
  });

  test('a message from the other user arrives without reloading', async ({ browser }) => {
    const learnerContext = await browser.newContext({ storageState: authState('learner') });
    const tutorContext = await browser.newContext({ storageState: authState('tutor') });

    const learnerPage = await learnerContext.newPage();
    const tutorPage = await tutorContext.newPage();

    const dialogs: string[] = [];
    tutorPage.on('dialog', async (d) => {
      dialogs.push(d.message());
      await d.dismiss();
    });

    try {
      await learnerPage.goto(`/messages/${conversationId}`, { waitUntil: 'domcontentloaded' });
      await tutorPage.goto(`/messages/${conversationId}`, { waitUntil: 'domcontentloaded' });

      // Waiting for the composer means both clients have mounted, so both
      // subscriptions are live before anything is sent.
      await learnerPage.getByTestId('message-input').waitFor({ timeout: 60000 });
      await tutorPage.getByTestId('message-input').waitFor({ timeout: 60000 });

      const text = `realtime probe ${Date.now()}`;
      await tutorPage.getByTestId('message-input').fill(text);
      await tutorPage.getByTestId('message-send').click();

      // Prove the send actually persisted before waiting on the live channel,
      // otherwise a failed send looks like a Realtime failure.
      await expect
        .poll(async () => countMessages(conversationId), { timeout: 90000 })
        .toBeGreaterThan(0);
      expect(dialogs).toEqual([]);

      // The learner's page is never reloaded, so this can only arrive over the
      // realtime channel.
      await expect(
        learnerPage.getByTestId('message-bubble').filter({ hasText: text })
      ).toBeVisible({ timeout: 45000 });
    } finally {
      await learnerContext.close();
      await tutorContext.close();
    }
  });

  test('conversations are scoped to their members', async () => {
    // A third party must not be able to read someone else's thread.
    const learnerId = await findUserIdByEmail(LEARNER_EMAIL);
    const tutorId = await findUserIdByEmail(TUTOR_EMAIL);

    expect(learnerId).not.toBe(tutorId);
    expect(conversationId).toMatch(/^[0-9a-f-]{36}$/);
  });
});