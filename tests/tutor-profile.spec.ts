import { test, expect } from '@playwright/test';

test.describe('Tutor Profile and Availability', () => {
  test('tutor dashboard page loads', async ({ page }) => {
    await page.goto('/tutoring/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Should either show dashboard or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/tutoring\/dashboard|\/sign-in/);
  });

  test('tutor history page loads', async ({ page }) => {
    await page.goto('/tutoring/history');
    await page.waitForLoadState('networkidle');
    
    // Should either show history or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/tutoring\/history|\/sign-in/);
  });

  test('no console errors on tutor dashboard', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/tutoring/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check for errors related to profile/availability
    const profileErrors = errors.filter(e => 
      e.toLowerCase().includes('profile') || 
      e.toLowerCase().includes('availability')
    );
    
    expect(profileErrors).toHaveLength(0);
  });
});
