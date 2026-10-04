import { test, expect } from '@playwright/test';
import { loginAs, gotoRedirectSafe } from './auth';
import {
  seedClassroom,
  cleanupClassroomData,
  TEST_CODE,
  TEST_GROUP_NAME,
} from './classroom-seed';

test.describe.configure({ mode: 'serial' });

let groupId = '';
let code = '';

test.beforeAll(async () => {
  const seeded = await seedClassroom();
  groupId = seeded.groupId;
  code = seeded.code;
});

test.afterAll(async () => {
  await cleanupClassroomData();
});

/*
 * These assertions deliberately target durable UI state rather than toasts.
 * react-hot-toast auto-dismisses after ~4s, so asserting on toast text makes
 * the suite depend on timing.
 */

test.describe('Groups hub', () => {
  test('groups is linked from the navigation for every role', async ({ page }) => {
    // The classroom feature has to be reachable from the shell, not just by URL.
    for (const role of ['learner', 'tutor', 'admin'] as const) {
      await loginAs(page, role);
      await expect(page.locator('a[href="/groups"]').first()).toBeVisible({ timeout: 60000 });
    }
  });

  test('tutor sees their group listed', async ({ page }) => {
    await loginAs(page, 'tutor', '/groups');

    await expect(page.getByTestId('groups-page')).toBeVisible();
    await expect(page.getByText(TEST_GROUP_NAME).first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByTestId('group-card').first()).toBeVisible();
  });

  test('group code join box is present', async ({ page }) => {
    await loginAs(page, 'learner', '/groups');

    await expect(page.getByTestId('group-code-input')).toBeVisible();
    await expect(page.getByTestId('join-group-submit')).toBeVisible();
  });

  test('unknown group code does not create a request', async ({ page }) => {
    await loginAs(page, 'learner', '/groups');

    const input = page.getByTestId('group-code-input');
    await input.fill('NOPE00');

    // The field is controlled, so the value only sticks once React has
    // hydrated and captured the change. Clicking earlier submits the form
    // natively, which reloads the page and empties the field regardless.
    await expect(input).toHaveValue('NOPE00', { timeout: 30000 });

    await page.getByTestId('join-group-submit').click();

    // The input is only cleared on success, so it still holding the code
    // proves the request failed, and no pending section may appear.
    await expect(input).toHaveValue('NOPE00', { timeout: 30000 });
    await expect(page.getByTestId('my-requests')).toHaveCount(0);
  });
});

test.describe('Enrollment flow', () => {
  test('learner requests enrollment by group code', async ({ page }) => {
    await loginAs(page, 'learner', '/groups');

    await page.getByTestId('group-code-input').fill(code);
    await page.getByTestId('join-group-submit').click();

    // The input clears only on success.
    await expect(page.getByTestId('group-code-input')).toHaveValue('', { timeout: 45000 });
    await expect(page.getByTestId('my-requests')).toBeVisible({ timeout: 45000 });
  });

  test('tutor approves the request and the learner joins the roster', async ({ page }) => {
    await loginAs(page, 'tutor', `/groups/${groupId}/people`);

    const item = page.getByTestId('pending-request-item').first();
    await expect(item).toBeVisible({ timeout: 60000 });

    await item.getByTestId('approve-request').click();

    // Durable outcome: the request is gone and the roster gained a member.
    await expect(page.getByTestId('no-pending-requests')).toBeVisible({ timeout: 45000 });
    await expect(page.getByTestId('member-item').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByTestId('pending-requests-badge')).toHaveCount(0);
  });

  test('enrolled learner can open the group and sees every tab', async ({ page }) => {
    await loginAs(page, 'learner', '/groups');

    await expect(page.getByText(TEST_GROUP_NAME).first()).toBeVisible({ timeout: 45000 });
    await page.getByTestId('group-card').first().click();

    await expect(page.getByTestId('group-title')).toHaveText(TEST_GROUP_NAME, { timeout: 45000 });
    await expect(page.getByTestId('group-role-badge')).toHaveText(/student/i);

    for (const tab of ['stream', 'classwork', 'people', 'grades']) {
      await expect(page.getByTestId(`group-tab-${tab}`)).toBeVisible();
    }
  });
});

test.describe('Classwork', () => {
  test('tutor creates a draft assignment', async ({ page }) => {
    await loginAs(page, 'tutor', `/groups/${groupId}/classwork`);

    await expect(page.getByTestId('classwork-page')).toBeVisible({ timeout: 45000 });
    await page.getByTestId('toggle-assignment-form').click();

    await page.getByTestId('assignment-title-input').fill('Algebra practice');
    await page.getByTestId('assignment-description-input').fill('Complete the worksheet.');
    await page.getByTestId('assignment-submit').click();

    const item = page.getByTestId('assignment-item').filter({ hasText: 'Algebra practice' });
    await expect(item).toBeVisible({ timeout: 45000 });
    await expect(item.getByTestId('assignment-status')).toHaveText(/draft/i);
  });

  test('learner cannot see a draft assignment', async ({ page }) => {
    await loginAs(page, 'learner', `/groups/${groupId}/classwork`);

    await expect(page.getByTestId('classwork-empty')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Algebra practice')).toHaveCount(0);
  });

  test('tutor publishes the assignment', async ({ page }) => {
    await loginAs(page, 'tutor', `/groups/${groupId}/classwork`);

    const item = page.getByTestId('assignment-item').filter({ hasText: 'Algebra practice' });
    await expect(item).toBeVisible({ timeout: 45000 });

    await item.getByTestId('toggle-assignment-status').click();
    await expect(item.getByTestId('assignment-status')).toHaveText(/published/i, { timeout: 45000 });
  });

  test('learner sees the published assignment', async ({ page }) => {
    await loginAs(page, 'learner', `/groups/${groupId}/classwork`);

    const item = page.getByTestId('assignment-item').filter({ hasText: 'Algebra practice' });
    await expect(item).toBeVisible({ timeout: 45000 });
    await expect(item.getByTestId('assignment-status')).toHaveText(/published/i);
  });

  test('learner opens the assignment and submits work', async ({ page }) => {
    await loginAs(page, 'learner', `/groups/${groupId}/classwork`);

    await page
      .getByTestId('assignment-item')
      .filter({ hasText: 'Algebra practice' })
      .getByTestId('assignment-link')
      .click();

    await expect(page.getByTestId('assignment-detail')).toBeVisible({ timeout: 45000 });
    await expect(page.getByTestId('submission-form')).toBeVisible();

    await page.getByTestId('submission-text-input').fill('My answer to the worksheet.');
    await page.getByTestId('submit-work').click();

    // The form switches to a read-only view once the work is graded, so before
    // that the submitted status line is the durable signal.
    await expect(page.getByText(/Current status: submitted/i)).toBeVisible({ timeout: 45000 });
  });

  test('tutor sees the submission in the grading panel', async ({ page }) => {
    await loginAs(page, 'tutor', `/groups/${groupId}/classwork`);

    await page
      .getByTestId('assignment-item')
      .filter({ hasText: 'Algebra practice' })
      .getByTestId('assignment-link')
      .click();

    await expect(page.getByTestId('grading-panel')).toBeVisible({ timeout: 45000 });

    const gradeItem = page.getByTestId('grading-item').first();
    await expect(gradeItem).toBeVisible({ timeout: 45000 });
    await expect(gradeItem).toContainText('My answer to the worksheet.');
  });

  test('tutor grades the submission', async ({ page }) => {
    await loginAs(page, 'tutor', `/groups/${groupId}/classwork`);

    await page
      .getByTestId('assignment-item')
      .filter({ hasText: 'Algebra practice' })
      .getByTestId('assignment-link')
      .click();

    const gradeItem = page.getByTestId('grading-item').first();
    await expect(gradeItem).toBeVisible({ timeout: 45000 });

    await gradeItem.locator('[data-testid^="grade-score-"]').fill('85');
    await gradeItem.locator('[data-testid^="grade-feedback-"]').fill('Nice work.');
    await gradeItem.getByRole('button', { name: /save grade/i }).click();

    await expect(gradeItem).toContainText(/graded/i, { timeout: 45000 });
  });

  test('learner sees the grade on their assignment', async ({ page }) => {
    await loginAs(page, 'learner', `/groups/${groupId}/classwork`);

    await page
      .getByTestId('assignment-item')
      .filter({ hasText: 'Algebra practice' })
      .getByTestId('assignment-link')
      .click();

    await expect(page.getByTestId('my-grade')).toBeVisible({ timeout: 45000 });
    await expect(page.getByTestId('my-grade-points')).toHaveText('85/100');
    // Feedback is rendered alongside the score, not inside the read-only
    // submission summary.
    await expect(page.getByTestId('my-grade')).toContainText('Nice work.');
  });

  test('grades tab reflects the graded submission', async ({ page }) => {
    await loginAs(page, 'tutor', `/groups/${groupId}/grades`);

    await expect(page.getByTestId('gradebook-table')).toBeVisible({ timeout: 45000 });
    const row = page.getByTestId('gradebook-row').first();
    await expect(row.getByTestId('grade-cell').first()).toHaveText('85', { timeout: 45000 });
  });
});

test.describe('Group stream', () => {
  test('tutor posts an announcement', async ({ page }) => {
    await loginAs(page, 'tutor', `/groups/${groupId}`);

    await expect(page.getByTestId('group-content')).toBeVisible({ timeout: 45000 });
    await page.getByTestId('toggle-announcement-form').click();

    await page.getByTestId('announcement-title-input').fill('Week 3 topics');
    await page.getByTestId('announcement-body-input').fill('We cover quadratic equations.');
    await page.getByTestId('announcement-submit').click();

    const item = page.getByTestId('announcement-item').filter({ hasText: 'Week 3 topics' });
    await expect(item).toBeVisible({ timeout: 45000 });
    await expect(item).toContainText('We cover quadratic equations.');
  });

  test('learner sees the announcement and can comment', async ({ page }) => {
    await loginAs(page, 'learner', `/groups/${groupId}`);

    await expect(page.getByTestId('announcement-item').filter({ hasText: 'Week 3 topics' })).toBeVisible({
      timeout: 25000,
    });

    await page.getByTestId('comment-input').fill('Looking forward to it!');
    await page.getByTestId('comment-submit').click();

    const comment = page.getByTestId('comment-item').filter({ hasText: 'Looking forward to it!' });
    await expect(comment).toBeVisible({ timeout: 45000 });
    // The composer clears only on success.
    await expect(page.getByTestId('comment-input')).toHaveValue('');
  });

  test('learner can reply in a thread', async ({ page }) => {
    await loginAs(page, 'learner', `/groups/${groupId}`);

    const comment = page.getByTestId('comment-item').filter({ hasText: 'Looking forward to it!' });
    await expect(comment).toBeVisible({ timeout: 45000 });

    await comment.getByTestId('reply-comment').click();
    await expect(page.getByText(/Replying to/i)).toBeVisible();

    await page.getByTestId('comment-input').fill('Adding to that.');
    await page.getByTestId('comment-submit').click();

    await expect(page.getByTestId('comment-reply').filter({ hasText: 'Adding to that.' })).toBeVisible({
      timeout: 45000,
    });
  });

  test('group chat accepts a message', async ({ page }) => {
    await loginAs(page, 'learner', `/groups/${groupId}`);

    await page.getByTestId('chat-input').fill('Hello group');
    await page.getByTestId('chat-send').click();

    await expect(page.getByTestId('chat-messages')).toContainText('Hello group', { timeout: 45000 });
    await expect(page.getByTestId('chat-input')).toHaveValue('');
  });
});

test.describe('Quiz builder', () => {
  test('tutor builds a quiz with auto-graded questions', async ({ page }) => {
    await loginAs(page, 'tutor', `/groups/${groupId}/classwork`);

    await page.getByTestId('assignment-item').filter({ hasText: 'Algebra practice' }).getByTestId('assignment-link').click();
    await expect(page.getByTestId('assignment-detail')).toBeVisible({ timeout: 45000 });

    await page.getByTestId('open-quiz-builder').click();
    await expect(page.getByTestId('quiz-builder')).toBeVisible();

    await page.getByTestId('quiz-question-text-0').fill('What is 7 x 6?');
    await page.getByTestId('quiz-option-text-0-0').fill('36');
    await page.getByTestId('quiz-option-text-0-1').fill('42');

    // Make the second option the correct answer.
    await page.getByTestId('quiz-option-correct-0-1').check();

    await page.getByTestId('quiz-add-question').click();
    await page.getByTestId('quiz-question-text-1').fill('Explain why 2 + 2 = 4.');
    await page.getByTestId('quiz-question-type-1').selectOption('essay');

    await page.getByTestId('quiz-save').click();

    await expect(page.getByTestId('quiz-exists')).toBeVisible({ timeout: 45000 });
    await expect(page.getByTestId('quiz-question-preview')).toContainText('What is 7 x 6?');
    await expect(page.getByTestId('quiz-question-preview')).toContainText('42 (correct)');
  });

  test('learner never receives the answer key', async ({ page }) => {
    await loginAs(page, 'learner', `/groups/${groupId}/classwork`);

    await page.getByTestId('assignment-item').filter({ hasText: 'Algebra practice' }).getByTestId('assignment-link').click();

    await expect(page.getByTestId('quiz-taker')).toBeVisible({ timeout: 45000 });

    const preview = page.getByTestId('quiz-taker');
    // The learner sees both question texts...
    await expect(preview).toContainText('What is 7 x 6?');
    await expect(preview).toContainText('Explain why 2 + 2 = 4.');
    // ...but nothing that reveals which option is correct, and no model answer.
    await expect(preview).not.toContainText('(correct)');
    await expect(preview).not.toContainText('42 (correct)');
  });

  test('learner submits the quiz and objective answers auto-grade', async ({ page }) => {
    await loginAs(page, 'learner', `/groups/${groupId}/classwork`);

    await page.getByTestId('assignment-item').filter({ hasText: 'Algebra practice' }).getByTestId('assignment-link').click();
    await expect(page.getByTestId('quiz-taker')).toBeVisible({ timeout: 45000 });

    // Answer the multiple-choice question wrongly; the essay is left for the tutor.
    const questions = page.getByTestId('quiz-taker-question');
    await questions.nth(0).locator('input[type="radio"]').first().check();
    await questions.nth(1).locator('textarea').fill('Because of how numbers combine.');

    await page.getByTestId('quiz-submit').click();

    await expect(page.getByTestId('quiz-result')).toBeVisible({ timeout: 45000 });
    // The multiple choice is worth 1 and was answered wrong; the essay (1 pt)
    // is not auto-graded, so it cannot contribute. Total stays 2.
    await expect(page.getByTestId('quiz-result')).toContainText('0/2');
  });
});

test.describe('Authorization', () => {
  test('a user with no access is redirected away from the group', async ({ page }) => {
    await loginAs(page, 'tutor2', '/groups');

    // tutor2 runs no groups, so the list is empty for them.
    await expect(page.getByTestId('groups-empty')).toBeVisible({ timeout: 45000 });

    await gotoRedirectSafe(page, `/groups/${groupId}`);
    await expect(page).not.toHaveURL(new RegExp(`/groups/${groupId}$`), { timeout: 45000 });
  });

  test('unauthenticated visitors are sent to sign-in', async ({ page }) => {
    await gotoRedirectSafe(page, '/groups');
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 45000 });
  });
});