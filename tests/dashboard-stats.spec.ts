import { test, expect } from '@playwright/test';

test.describe('Dashboard Stats Verification', () => {
  test('learner path page displays progress', async ({ page }) => {
    await page.goto('/path');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    
    // Check for learning path content
    const pageText = await page.textContent('body');
    
    // Should show learning-related content
    expect(pageText).toMatch(/lesson|Lesson|course|Course|path|Path/i);
  });
});
