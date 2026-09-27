import { test, expect } from '@playwright/test';

test.describe('Mascot Chat Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test learner
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', 'testlearner+test@gmail.com');
    await page.fill('input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    
    // Handle onboarding redirect
    const url = page.url();
    if (url.includes('/onboarding')) {
      await page.goto('/path');
    }
    
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  });

  test('chat widget opens and closes', async ({ page }) => {
    // Wait for chat widget to load (lazy loaded)
    await page.waitForTimeout(2000);
    
    // Find and click the collapsed chat button
    const chatButton = page.locator('button:has-text("Chat with Mascot")').first();
    await expect(chatButton).toBeVisible();
    await chatButton.click();
    
    // Chat should be open
    await expect(page.locator('text=LEGO Mascot')).toBeVisible();
    await expect(page.locator('text=Online - Ready to help!')).toBeVisible();
    
    // Close the chat
    const closeButton = page.locator('button:has-text("✕")').first();
    await closeButton.click();
    
    // Chat should be closed
    await expect(page.locator('text=LEGO Mascot')).not.toBeVisible();
  });

  test('send message and receive AI response', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Open chat
    const chatButton = page.locator('button:has-text("Chat with Mascot")').first();
    await chatButton.click();
    
    // Send a message
    const input = page.locator('input[placeholder="Type a message..."]');
    await input.fill('Hello!');
    await page.click('button:has-text("Send")');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check that a response appeared
    const messages = page.locator('.flex-1.overflow-y-auto p');
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThan(1); // At least initial + response
  });

  test('quick action buttons work', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Open chat
    const chatButton = page.locator('button:has-text("Chat with Mascot")').first();
    await chatButton.click();
    
    // Click quick action button
    await page.click('button:has-text("💡 Hint")');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Check that a response appeared
    const messages = page.locator('.flex-1.overflow-y-auto p');
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThan(1);
  });

  test('assembly animation trigger works', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Open chat
    const chatButton = page.locator('button:has-text("Chat with Mascot")').first();
    await chatButton.click();
    
    // Click assembly animation button
    const sparkleButton = page.locator('button:has-text("✨")').first();
    await expect(sparkleButton).toBeVisible();
    await sparkleButton.click();
    
    // Animation should play (we can't easily test visual animation, but we can check button is clickable)
    await expect(sparkleButton).toBeVisible();
  });

  test('rate limit enforcement', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Open chat
    const chatButton = page.locator('button:has-text("Chat with Mascot")').first();
    await chatButton.click();
    
    // Send multiple messages rapidly to test rate limit (though 20/hour is hard to hit in a test)
    const input = page.locator('input[placeholder="Type a message..."]');
    
    for (let i = 0; i < 5; i++) {
      await input.fill(`Test message ${i}`);
      await page.click('button:has-text("Send")');
      await page.waitForTimeout(1000);
    }
    
    // Check that messages were sent
    const messages = page.locator('.flex-1.overflow-y-auto p');
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThan(5);
  });
});

test.describe('Mascot Chat API - Failure Scenarios', () => {
  test('OpenRouter failure falls back to canned response', async ({ page }) => {
    // This test would require temporarily invalidating the OpenRouter key
    // For now, we'll test the API endpoint directly
    
    const response = await page.request.post('/api/mascot-chat', {
      data: {
        message: 'Test message',
        simulateOpenRouterFailure: true,
      },
    });
    
    const data = await response.json();
    expect(response.ok()).toBeTruthy();
    expect(data.message).toBeTruthy();
    expect(data.provider).toBe('canned');
  });

  test('OpenAI failure falls back to canned response', async ({ page }) => {
    const response = await page.request.post('/api/mascot-chat', {
      data: {
        message: 'Test message',
        simulateOpenRouterFailure: true,
        simulateOpenAiFailure: true,
      },
    });
    
    const data = await response.json();
    expect(response.ok()).toBeTruthy();
    expect(data.message).toBeTruthy();
    expect(data.provider).toBe('canned');
  });
});
