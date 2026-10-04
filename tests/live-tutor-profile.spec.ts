import { test, expect } from '@playwright/test';
import postgres from 'postgres';
import { config } from 'dotenv';
import { loginAs } from './auth';

config({ path: '.env.local' });

const TUTOR_ID = process.env.TEST_TUTOR_ID || 'e7882451-c1a0-4ede-ac5a-33ed6c707485';

test.describe('Live Tutor Profile Creation - Database Verification', () => {
  // The setup flow only renders when no tutor_profiles row exists, so the
  // previous run's row has to go before asserting on the "Create Profile" path.
  test.beforeAll(async () => {
    const sql = postgres(process.env.DATABASE_URL!, {
      prepare: false,
      ssl: { rejectUnauthorized: false },
      onnotice: () => {},
    });
    try {
      await sql`DELETE FROM tutor_profiles WHERE tutor_id = ${TUTOR_ID}`;
    } finally {
      await sql.end();
    }
  });

  test('tutor creates profile and tutor_profiles row is created', async ({ page }) => {
    await loginAs(page, 'tutor2');

    await page.goto('/tutoring/dashboard');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });

    const createProfileButton = page
      .locator('button:has-text("Create Profile"), a:has-text("Create Profile")')
      .first();
    await expect(createProfileButton).toBeVisible({ timeout: 15000 });

    await createProfileButton.click();

    // The action writes the row server-side, so poll the authenticated API
    // rather than sleeping a fixed 3s and calling a slow pooler a failure.
    await expect
      .poll(
        async () => {
          const probe = await page.request.get(`/api/test/tutor-profile?tutorId=${TUTOR_ID}`);
          if (!probe.ok()) return false;
          const body = await probe.json();
          return body.success === true;
        },
        { timeout: 60000 }
      )
      .toBe(true);

    // Verify the row via the authenticated API (shares the page session cookie)
    const response = await page.request.get(`/api/test/tutor-profile?tutorId=${TUTOR_ID}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.tutorProfile).toBeDefined();

    const profile = data.tutorProfile;
    console.log('Tutor profile row created:', JSON.stringify(profile, null, 2));

    expect(profile.tutorId).toBe(TUTOR_ID);
    expect(profile.bio).toBeTruthy();
    expect(profile.subjects).toBeTruthy();
    expect(profile.createdAt).toBeTruthy();
    expect(profile.isActive).toBe(true);

    // Dashboard should now show the profile instead of the setup form
    await page.goto('/tutoring/dashboard');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await expect(page.locator('button:has-text("Create Profile")')).toHaveCount(0);
  });
});
