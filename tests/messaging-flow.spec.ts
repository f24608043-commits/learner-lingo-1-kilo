import { test, expect } from '@playwright/test';
import { loginAs, gotoRedirectSafe } from './auth';
import {
  seedMessaging,
  cleanupMessaging,
  getConversationIdByKey,
  countMessages,
  getMemberIds,
  ensureGroupConversation,
  TEST_GROUP_TITLE,
} from './messaging-seed';

const TEXT = 'PW messaging round trip';

test.describe.configure({ mode: 'serial' });

test.describe('Messaging', () => {
  let learnerId: string;
  let tutorId: string;
  let tutor2Id: string;
  let conversationId: string;

  test.beforeAll(async () => {
    const seeded = await seedMessaging();
    learnerId = seeded.learnerId;
    tutorId = seeded.tutorId;
    tutor2Id = seeded.tutor2Id;
  });

  test.afterAll(async () => {
    await cleanupMessaging();
  });

  test('message button on a tutor card opens that conversation', async ({ page }) => {
    await loginAs(page, 'learner', '/tutoring');

    const card = page.getByTestId('tutor-card').filter({ hasText: 'Master Tutor' });
    await expect(card).toBeVisible({ timeout: 60000 });

    await card.getByTestId('tutor-message-button').click();

    // The button has to land inside the thread, not merely create a conversation.
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 60000 });
    await expect(page.getByRole('heading', { name: 'Direct Message' })).toBeVisible({
      timeout: 60000,
    });

    conversationId = (await getConversationIdByKey(learnerId, tutorId))!;
    expect(page.url().split('/messages/')[1]).toBe(conversationId);
    expect(await getMemberIds(conversationId)).toEqual(
      expect.arrayContaining([learnerId, tutorId])
    );
  });

  test('a sent message is stored and stays visible in the thread', async ({ page }) => {
    // sendMessage reports failures through alert(); capture it so a broken send
    // surfaces the server's message instead of a bare timeout.
    const dialogs: string[] = [];
    page.on('dialog', async (d) => {
      dialogs.push(d.message());
      await d.dismiss();
    });

    await loginAs(page, 'learner', `/messages/${conversationId}`);

    const input = page.getByTestId('message-input');
    await expect(input).toBeVisible({ timeout: 60000 });

    await input.fill(TEXT);
    await page.getByTestId('message-send').click();

    // Confirm with the database first. Asserting the bubble beforehand would
    // pass on the optimistic copy even if the server action then failed.
    await expect
      .poll(async () => countMessages(conversationId), { timeout: 90000 })
      .toBe(1);

    expect(dialogs).toEqual([]);

    // The bubble must survive the send, otherwise the message disappears
    // because Realtime deliberately ignores your own inserts.
    await expect(page.getByTestId('message-bubble').filter({ hasText: TEXT })).toBeVisible({
      timeout: 60000,
    });
    await expect(input).toHaveValue('');
  });

  test('the recipient sees the message in their thread', async ({ page }) => {
    await loginAs(page, 'tutor', `/messages/${conversationId}`);

    await expect(page.getByTestId('message-bubble').filter({ hasText: TEXT })).toBeVisible({
      timeout: 60000,
    });
  });

  test('the conversation shows up in the recipient list with its last message', async ({ page }) => {
    await loginAs(page, 'tutor', '/messages');

    // The tutor may have other conversations, so match our own thread rather
    // than counting rows.
    const entry = page.locator(`a[href="/messages/${conversationId}"]`);
    await expect(entry).toBeVisible({ timeout: 60000 });
    await expect(entry).toContainText(TEXT);
  });

  test('chat button on a friends card opens the conversation', async ({ page }) => {
    await loginAs(page, 'learner', '/friends');

    const card = page.getByTestId('friend-card').filter({ hasText: 'Master Tutor' });
    await expect(card).toBeVisible({ timeout: 60000 });

    await card.getByTestId('friend-chat-button').click();
    await expect(page).toHaveURL(new RegExp(`/messages/${conversationId}$`), { timeout: 60000 });
  });

  test('message button on a friend profile opens the conversation', async ({ page }) => {
    await loginAs(page, 'learner', `/profile/${tutorId}`);

    const button = page.getByTestId('profile-message-button');
    await expect(button).toBeVisible({ timeout: 60000 });
    await button.click();

    await expect(page).toHaveURL(new RegExp(`/messages/${conversationId}$`), { timeout: 60000 });
  });

  test('a learner who is not a friend is offered add, never chat', async ({ page }) => {
    await loginAs(page, 'tutor2', '/friends?query=LEGO%20Learner');

    const result = page.getByTestId('friend-search-result').filter({ hasText: 'LEGO Learner' });
    await expect(result).toBeVisible({ timeout: 60000 });

    // Without a friendship the only entry point is add: there is no chat button.
    await expect(result.getByTestId('friend-add-button')).toBeVisible();
    await expect(result.getByTestId('friend-chat-button')).toHaveCount(0);
  });

  test('add button on a friends card sends a friend request', async ({ page }) => {
    // tutor2 has no friendship with the learner, so the learner is still
    // addable from tutor2's search results.
    await loginAs(page, 'tutor2', '/friends?query=LEGO%20Learner');

    const result = page.getByTestId('friend-search-result').filter({ hasText: 'LEGO Learner' });
    await expect(result).toBeVisible({ timeout: 60000 });

    // These buttons submit a server action as a real form post, so the click
    // navigates. Waiting for the load keeps the next goto from cancelling it.
    await Promise.all([
      page.waitForLoadState('load'),
      result.getByTestId('friend-add-button').click(),
    ]);

    // The requester no longer sees them as addable.
    await gotoRedirectSafe(page, '/friends?query=LEGO%20Learner', 60000);
    await expect(
      page.getByTestId('friend-search-result').filter({ hasText: 'LEGO Learner' })
    ).toHaveCount(0, { timeout: 60000 });

    // The recipient sees it in the pending queue, with both actions offered.
    await loginAs(page, 'learner', '/friends');
    const pending = page.getByTestId('pending-request').filter({ hasText: 'Second Tutor' });
    await expect(pending).toBeVisible({ timeout: 60000 });
    await expect(pending.getByRole('button', { name: 'Accept' })).toBeVisible();
    await expect(pending.getByRole('button', { name: 'Decline' })).toBeVisible();
  });

  test('accepting a request turns the two into friends with a working chat button', async ({
    page,
  }) => {
    await loginAs(page, 'learner', '/friends');

    const pending = page.getByTestId('pending-request').filter({ hasText: 'Second Tutor' });
    await expect(pending).toBeVisible({ timeout: 60000 });
    await Promise.all([
      page.waitForLoadState('load'),
      pending.getByRole('button', { name: 'Accept' }).click(),
    ]);

    const card = page.getByTestId('friend-card').filter({ hasText: 'Second Tutor' });
    await expect(card).toBeVisible({ timeout: 60000 });
    await card.getByTestId('friend-chat-button').click();

    // Learner -> tutor is allowed without a session request, so this opens.
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}/, { timeout: 60000 });
    expect(page.url().split('/messages/')[1]).toBe(
      await getConversationIdByKey(learnerId, tutor2Id)
    );
  });

  test('a direct thread shows no class controls', async ({ page }) => {
    await loginAs(page, 'learner', `/messages/${conversationId}`);

    await expect(page.getByRole('heading', { name: 'Direct Message' })).toBeVisible({
      timeout: 60000,
    });
    await expect(page.getByRole('link', { name: /Join Class/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Leave' })).toHaveCount(0);
  });

  test('a group thread shows its title with join and leave controls', async ({ page }) => {
    const groupConversationId = await ensureGroupConversation([tutorId, learnerId]);

    await loginAs(page, 'learner', `/messages/${groupConversationId}`);

    // Previously the header never learned the conversation type, so every group
    // chat claimed to be a direct message and hid these controls.
    await expect(page.getByRole('heading', { name: TEST_GROUP_TITLE })).toBeVisible({
      timeout: 60000,
    });

    const join = page.getByRole('link', { name: /Join Class/ });
    await expect(join).toBeVisible();
    await expect(join).toHaveAttribute('href', /meet\.jit\.si\/lego-class-pw-/);

    await expect(page.getByRole('button', { name: 'Leave' })).toBeVisible();
  });
});
