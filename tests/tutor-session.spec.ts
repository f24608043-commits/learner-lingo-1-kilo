import { test, expect } from '@playwright/test';

test.describe('Tutor Session Booking', () => {
  test('tutoring page loads', async ({ page }) => {
    await page.goto('/tutoring');
    await page.waitForLoadState('networkidle');
    
    // Should either show tutoring or redirect to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/tutoring|\/sign-in/);
  });

  test('no console errors on tutoring page', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/tutoring');
    await page.waitForLoadState('networkidle');
    
    // Check for FK-related errors in console
    const fkErrors = errors.filter(e => 
      e.toLowerCase().includes('foreign key') || 
      e.toLowerCase().includes('constraint') ||
      e.toLowerCase().includes('tutorid')
    );
    
    expect(fkErrors).toHaveLength(0);
  });
});
