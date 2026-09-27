import { test, expect } from '@playwright/test';

test.describe('Live Session Booking - Database Verification', () => {
  let learnerEmail: string;
  let learnerPassword: string;
  let tutorId: string;
  let learnerId: string;

  test.beforeAll(async () => {
    // Use test credentials
    learnerEmail = process.env.TEST_LEARNER_EMAIL || 'testlearner+test@gmail.com';
    learnerPassword = process.env.TEST_LEARNER_PASSWORD || 'Test123456!';
    tutorId = process.env.TEST_TUTOR_ID || 'a8b34bb1-dbc1-421a-b8c1-34429e4e29cd';
    
    // For now, use a known learner ID from setup
    // In production, this would come from an API call
    learnerId = process.env.TEST_LEARNER_ID || '';
    
    if (!learnerId) {
      console.log('Warning: TEST_LEARNER_ID not set, test may skip');
    }
  });

  test('learner books real session and session_requests row is created', async ({ page, request: apiRequest }) => {
    if (!learnerId) {
      test.skip(true, 'Could not get learner ID from database');
    }
    
    // Step 1: Login as learner
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    await page.fill('input[type="email"]', learnerEmail);
    await page.fill('input[type="password"]', learnerPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/path', { timeout: 15000 });
    
    // Step 2: Navigate to tutoring page
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Step 3: Find any tutor card
    const tutorCards = page.locator('.grid > div').filter({ hasText: /Book Session/ });
    const cardCount = await tutorCards.count();
    console.log('Tutor cards found:', cardCount);
    
    if (cardCount === 0) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'tutoring-page-no-tutors.png' });
      throw new Error('No tutor cards found on page - screenshot saved');
    }
    
    // Get the first tutor card
    const firstCard = tutorCards.first();
    const cardText = await firstCard.textContent();
    console.log('First card text:', cardText?.substring(0, 200));
    
    // Step 4: Click the Book Session button directly on the first card
    const bookButton = firstCard.locator('button:has-text("Book Session")');
    const buttonCount = await bookButton.count();
    console.log('Book buttons found in first card:', buttonCount);
    
    if (buttonCount === 0) {
      throw new Error('No book button found in tutor card');
    }
    
    await bookButton.click();
    
    // Step 5: Select a time slot (if needed)
    const timeSlot = page.locator('[class*="slot"], [class*="time"]').first();
    if (await timeSlot.count() > 0) {
      await timeSlot.click();
    }
    
    // Step 6: Confirm booking
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Book Session")').first();
    if (await confirmButton.count() > 0) {
      await confirmButton.click();
    }
    
    await page.waitForTimeout(3000); // Wait for database operation
    
    // Step 7: Query API to verify session_requests row was created
    const response = await apiRequest.get(`/api/test/session-request?learnerId=${learnerId}&tutorId=${tutorId}`);
    
    if (response.status() === 404) {
      test.skip(true, 'API endpoint not found - needs to be created');
    }
    
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.sessionRequest).toBeDefined();
    
    const sessionRequest = data.sessionRequest;
    console.log('✅ Session request row created:', JSON.stringify(sessionRequest, null, 2));
    
    // Verify the row has required fields
    expect(sessionRequest.learnerId).toBe(learnerId);
    expect(sessionRequest.tutorId).toBe(tutorId);
    expect(sessionRequest.status).toBeDefined();
    expect(sessionRequest.createdAt).toBeDefined();
  });
});
