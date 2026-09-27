import { test, expect }
 from '@playwright/test';

test.describe('Mascot Evidence Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test learner
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', 'testlearner+test@gmail.com');
    await page.fill('input[type="password"]', 'Test123456!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/path', { timeout: 15000 });
  });

  test('screenshot chat widget collapsed', async ({ page }) => {
    await page.waitForTimeout(2000); // Wait for lazy-loaded widget
    
    const chatButton = page.locator('button:has-text("Chat with Mascot")').first();
    await expect(chatButton).toBeVisible();
    
    await page.screenshot({ path: 'screenshots/mascot/chat-widget-collapsed.png' });
    console.log('✓ Screenshot: chat-widget-collapsed.png');
  });

  test('screenshot chat widget open', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const chatButton = page.locator('button:has-text("Chat with Mascot")').first();
    await chatButton.click();
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/mascot/chat-widget-open.png' });
    console.log('✓ Screenshot: chat-widget-open.png');
  });

  test('screenshot chat widget with message', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const chatButton = page.locator('button:has-text("Chat with Mascot")').first();
    await chatButton.click();
    
    const input = page.locator('input[placeholder="Type a message..."]');
    await input.fill('Hello mascot!');
    await page.click('button:has-text("Send")');
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/mascot/chat-widget-with-message.png' });
    console.log('✓ Screenshot: chat-widget-with-message.png');
  });

  test('screenshot assembly animation', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const chatButton = page.locator('button:has-text("Chat with Mascot")').first();
    await chatButton.click();
    
    const sparkleButton = page.locator('button:has-text("✨")').first();
    await sparkleButton.click();
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/mascot/assembly-animation.png' });
    console.log('✓ Screenshot: assembly-animation.png');
  });

  test('screenshot new poses', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Test waving pose
    await page.evaluate(() => {
      const event = new CustomEvent('mascot-pose', { detail: 'waving' });
      window.dispatchEvent(event);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/mascot/pose-waving.png' });
    console.log('✓ Screenshot: pose-waving.png');
    
    // Test thinking pose
    await page.evaluate(() => {
      const event = new CustomEvent('mascot-pose', { detail: 'thinking' });
      window.dispatchEvent(event);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/mascot/pose-thinking.png' });
    console.log('✓ Screenshot: pose-thinking.png');
    
    // Test pointing pose
    await page.evaluate(() => {
      const event = new CustomEvent('mascot-pose', { detail: 'pointing' });
      window.dispatchEvent(event);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/mascot/pose-pointing.png' });
    console.log('✓ Screenshot: pose-pointing.png');
    
    // Test celebrate pose
    await page.evaluate(() => {
      const event = new CustomEvent('mascot-pose', { detail: 'celebrate' });
      window.dispatchEvent(event);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/mascot/pose-celebrate.png' });
    console.log('✓ Screenshot: pose-celebrate.png');
    
    // Test encouraging pose
    await page.evaluate(() => {
      const event = new CustomEvent('mascot-pose', { detail: 'encouraging' });
      window.dispatchEvent(event);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'screenshots/mascot/pose-encouraging.png' });
    console.log('✓ Screenshot: pose-encouraging.png');
  });
});
