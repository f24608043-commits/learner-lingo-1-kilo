import { test, expect } from '@playwright/test';

test.describe('Live Tutor Availability Edit - Database Verification', () => {
  let tutorEmail: string;
  let tutorPassword: string;
  let tutorId: string;

  test.beforeAll(async () => {
    // Use test credentials for a tutor with existing profile
    tutorEmail = process.env.TEST_TUTOR_EMAIL || 'testtutor+test@gmail.com';
    tutorPassword = process.env.TEST_TUTOR_PASSWORD || 'Test123456!';
    tutorId = process.env.TEST_TUTOR_ID || 'a8b34bb1-dbc1-421a-b8c1-34429e4e29cd';
  });

  test('tutor availability exists in database', async ({ request: apiRequest }) => {
    // Query API to verify tutor_availability row exists
    const response = await apiRequest.get(`/api/test/tutor-availability?tutorId=${tutorId}`);
    
    if (response.status() === 404) {
      test.skip(true, 'API endpoint not found');
    }
    
    const data = await response.json();
    
    expect(data.success).toBe(true);
    
    const availability = data.availability;
    console.log('✅ Tutor availability row found:', JSON.stringify(availability, null, 2));
    
    // Verify the row exists
    expect(availability).toBeDefined();
    if (availability) {
      expect(availability.tutorId).toBe(tutorId);
      expect(availability.createdAt).toBeDefined();
      expect(availability.dayOfWeek).toBeDefined();
      expect(availability.startTime).toBeDefined();
      expect(availability.endTime).toBeDefined();
    }
  });
});
