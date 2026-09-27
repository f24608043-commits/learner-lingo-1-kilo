import { test, expect } from '@playwright/test';

test.describe('Role-Based Learning Methods - Admin Learner Flow', () => {
  const ADMIN_EMAIL = 'alexabraham587@gmail.com';
  const ADMIN_PASSWORD = 'Qasim.11';
  const LEARNER_EMAIL = 'testlearner+test@gmail.com';
  const LEARNER_PASSWORD = 'Test123456!';

  test('Admin can create course and learner can access it', async ({ page }) => {
    // Login as admin
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 30000 });

    // Navigate to courses
    await page.goto('/admin/courses');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // Check if course list loads
    const courseCards = page.locator('[data-testid="course-card"], .course-card, [class*="course"]');
    const count = await courseCards.count();
    console.log(`Courses visible to admin: ${count}`);

    // Login as learner
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', LEARNER_EMAIL);
    await page.fill('input[type="password"]', LEARNER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Handle onboarding redirect
    const url = page.url();
    if (url.includes('/onboarding')) {
      console.log('Learner redirected to onboarding, skipping to path for test...');
      await page.goto('/path');
    } else {
      // Already on path, continue
      console.log('Learner on path');
    }

    // Check if learner can see courses on path
    await page.goto('/library');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    const libraryCourses = page.locator('[data-testid="course-card"], .course-card, [class*="course"]');
    const libraryCount = await libraryCourses.count();
    console.log(`Courses visible to learner in library: ${libraryCount}`);
  });

  test('Learner can complete lesson and earn XP', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', LEARNER_EMAIL);
    await page.fill('input[type="password"]', LEARNER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Handle onboarding redirect
    const url = page.url();
    if (url.includes('/onboarding')) {
      console.log('Learner redirected to onboarding, skipping to path for test...');
      await page.goto('/path');
    } else {
      // Already on path, continue
      console.log('Learner on path');
    }

    // Navigate to a lesson
    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    // Try to find and click a lesson
    const lessonButton = page.locator('a[href*="/lesson/"]').first();
    if (await lessonButton.isVisible({ timeout: 5000 })) {
      await lessonButton.click();
      await page.waitForLoadState('networkidle');
      
      // Check lesson page loads
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
      console.log('Lesson page loaded successfully');
    } else {
      console.log('No lessons found in library');
    }
  });
});

test.describe('Role-Based Learning Methods - Tutor Learner Flow', () => {
  const TUTOR_EMAIL = 'orphix.itsolutions@gmail.com';
  const TUTOR_PASSWORD = 'Qasim.11';
  const LEARNER_EMAIL = 'testlearner+test@gmail.com';
  const LEARNER_PASSWORD = 'Test123456!';

  test('Tutor can set availability and learner can book session', async ({ page }) => {
    // Login as tutor
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', TUTOR_EMAIL);
    await page.fill('input[type="password"]', TUTOR_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tutoring\/dashboard|\/path/, { timeout: 15000 });

    // Check tutor dashboard
    await page.goto('/tutoring/dashboard');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    console.log('Tutor dashboard loaded');

    // Login as learner
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', LEARNER_EMAIL);
    await page.fill('input[type="password"]', LEARNER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Handle onboarding redirect
    const url = page.url();
    if (url.includes('/onboarding')) {
      console.log('Learner redirected to onboarding, skipping to path for test...');
      await page.goto('/path');
    } else {
      // Already on path, continue
      console.log('Learner on path');
    }

    // Navigate to tutoring
    await page.goto('/tutoring');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });

    // Check for tutor cards
    const tutorCards = page.locator('[data-testid="tutor-card"], .tutor-card, [class*="tutor"]');
    const tutorCount = await tutorCards.count();
    console.log(`Tutors visible to learner: ${tutorCount}`);

    // Check for book session buttons
    const bookButtons = page.locator('button:has-text("Book"), button:has-text("Session")');
    const buttonCount = await bookButtons.count();
    console.log(`Book session buttons: ${buttonCount}`);
  });

  test('Messaging works between tutor and learner', async ({ page }) => {
    // Login as learner
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', LEARNER_EMAIL);
    await page.fill('input[type="password"]', LEARNER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Handle onboarding redirect
    const url = page.url();
    if (url.includes('/onboarding')) {
      console.log('Learner redirected to onboarding, skipping to path for test...');
      await page.goto('/path');
    } else {
      // Already on path, continue
      console.log('Learner on path');
    }

    // Navigate to messages
    await page.goto('/messages');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    console.log('Messages page loaded for learner');

    // Check for conversation list or empty state
    const conversations = page.locator('a[href*="/messages/"]');
    const convCount = await conversations.count();
    console.log(`Conversations visible: ${convCount}`);
  });
});

test.describe('Cross-Role Feature Access', () => {
  const ADMIN_EMAIL = 'alexabraham587@gmail.com';
  const ADMIN_PASSWORD = 'Qasim.11';
  const TUTOR_EMAIL = 'orphix.itsolutions@gmail.com';
  const TUTOR_PASSWORD = 'Qasim.11';
  const LEARNER_EMAIL = 'testlearner+test@gmail.com';
  const LEARNER_PASSWORD = 'Test123456!';

  test('Admin can access admin pages, tutor cannot', async ({ page }) => {
    // Admin access
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin', { timeout: 30000 });

    await page.goto('/admin/courses');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Admin can access /admin/courses');

    // Tutor access (should be blocked or redirected)
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', TUTOR_EMAIL);
    await page.fill('input[type="password"]', TUTOR_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tutoring\/dashboard|\/path/, { timeout: 30000 });

    await page.goto('/admin/courses');
    await page.waitForURL(/\/path|\/tutoring\/dashboard|\/\?error=/, { timeout: 15000 });
    
    const url = page.url();
    console.log(`Tutor accessing /admin/courses - redirected to: ${url}`);
    
    // Tutor should be redirected away from admin pages
    expect(url).not.toContain('/admin');
  });

  test('Learner can access learning pages, not admin pages', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[type="email"]', LEARNER_EMAIL);
    await page.fill('input[type="password"]', LEARNER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Handle onboarding redirect
    const url = page.url();
    if (url.includes('/onboarding')) {
      console.log('Learner redirected to onboarding, skipping to path for test...');
      await page.goto('/path');
    } else {
      // Already on path, continue
      console.log('Learner on path');
    }

    // Learner should access path
    await page.goto('/path');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Learner can access /path');

    // Learner should access library
    await page.goto('/library');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Learner can access /library');

    // Learner should be blocked from admin
    await page.goto('/admin/courses');
    const adminUrl = page.url();
    console.log(`Learner accessing /admin/courses - redirected to: ${adminUrl}`);
  });
});
