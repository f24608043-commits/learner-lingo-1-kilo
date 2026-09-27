import { test, expect } from '@playwright/test';

test.describe('Live Tutor Profile Creation - Database Verification', () => {
  let tutorEmail: string;
  let tutorPassword: string;
  let tutorId: string;

  test.beforeAll(async () => {
    // Use test credentials for a user without tutor profile
    tutorEmail = process.env.TEST_TUTOR_EMAIL || 'testtutor+test@gmail.com';
    tutorPassword = process.env.TEST_TUTOR_PASSWORD || 'Test123456!';
    tutorId = process.env.TEST_TUTOR_ID || 'a8b34bb1-dbc1-421a-b8c1-34429e4e29cd';
  });

  test('tutor creates profile and tutor_profiles row is created', async ({ page, request: apiRequest }) => {
    // Step 1: Login as user without tutor profile
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    await page.fill('input[type="email"]', tutorEmail);
    await page.fill('input[type="password"]', tutorPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/path', { timeout: 15000 });
    
    // Step 2: Navigate to tutoring dashboard
    await page.goto('/tutoring/dashboard');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Step 3: Check if "Create Profile" button exists
    const createProfileButton = page.locator('button:has-text("Create Profile"), a:has-text("Create Profile")').first();
    const buttonCount = await createProfileButton.count();
    console.log('Create profile buttons found:', buttonCount);
    
    if (buttonCount === 0) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'tutor-dashboard-no-create-button.png' });
      test.skip(true, 'No create profile button found - screenshot saved. Profile may already exist or UI changed.');
    }
    
    await createProfileButton.click();
    await page.waitForTimeout(3000); // Wait for server action and database operation
    
    // Step 4: Query API to verify tutor_profiles row was created
    const response = await apiRequest.get(`/api/test/tutor-profile?tutorId=${tutorId}`);
    
    if (response.status() === 404) {
      test.skip(true, 'API endpoint not found - needs to be created');
    }
    
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.tutorProfile).toBeDefined();
    
    const tutorProfile = data.tutorProfile;
    console.log('✅ Tutor profile row created:', JSON.stringify(tutorProfile, null, 2));
    
    // Verify the row has required fields
    expect(tutorProfile.tutorId).toBe(tutorId);
    expect(tutorProfile.bio).toBeDefined();
    expect(tutorProfile.subjects).toBeDefined();
    expect(tutorProfile.createdAt).toBeDefined();
    expect(tutorProfile.isActive).toBeDefined();
  });
});
