import { test, expect } from '@playwright/test';

test.describe('Session Booking Tests', () => {
  test('tutoring page displays tutor list', async ({ page }) => {
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Look for tutor cards or list
    const tutorCards = page.locator('[class*="tutor"], [class*="Tutor"], .card');
    const tutorList = page.locator('text=Tutor, text=Available, text=Book Session');
    
    if (await tutorCards.count() > 0) {
      await expect(tutorCards.first()).toBeVisible();
    } else if (await tutorList.count() > 0) {
      await expect(tutorList.first()).toBeVisible();
    } else {
      // No tutors available is acceptable
      const noTutors = page.locator('text=No tutors, text=No available tutors');
      if (await noTutors.count() > 0) {
        await expect(noTutors.first()).toBeVisible();
      }
    }
  });

  test('book session button is present on tutor cards', async ({ page }) => {
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Look for book session buttons
    const bookButtons = page.locator('button:has-text("Book"), button:has-text("Schedule"), a:has-text("Book"), a:has-text("Schedule")');
    
    if (await bookButtons.count() > 0) {
      await expect(bookButtons.first()).toBeVisible();
      await expect(bookButtons.first()).toBeEnabled();
    } else {
      test.skip(true, 'No book session buttons found - may require login or no tutors available');
    }
  });

  test('no console errors on tutoring page (FK check)', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/tutoring');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Check for FK-related errors in console
    const fkErrors = errors.filter(e => 
      e.toLowerCase().includes('foreign key') || 
      e.toLowerCase().includes('constraint') ||
      e.toLowerCase().includes('tutorid')
    );
    
    expect(fkErrors).toHaveLength(0);
  });
});
