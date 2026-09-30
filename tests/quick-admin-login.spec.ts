import { test, expect } from '@playwright/test';
import { loginAs } from './auth';

test('Quick admin login check', async ({ page }) => {
  await loginAs(page, 'admin');
  await expect(page).toHaveURL(/\/admin/);
});
