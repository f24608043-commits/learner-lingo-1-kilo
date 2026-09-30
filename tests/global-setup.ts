import { chromium, type FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

type Cookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
};

type StorageState = {
  cookies: Cookie[];
  origins: { origin: string; localStorage: { name: string; value: string }[] }[];
};

const OUT_DIR = path.resolve(process.cwd(), '.auth');

type Role = 'admin' | 'tutor' | 'learner' | 'tutor2';

const LANDING: Record<Role, string> = {
  admin: '/admin',
  tutor: '/tutoring/dashboard',
  tutor2: '/tutoring/dashboard',
  learner: '/path',
};

/**
 * Routes visited by the suite, grouped by the role that can reach them.
 * Next dev compiles routes on first request, which is slow enough to blow
 * through a 10s assertion timeout in the first test that touches a page.
 * Warming them up here keeps the suite deterministic.
 */
const WARMUP: Record<Role, string[]> = {
  admin: [
    '/admin',
    '/admin/users',
    '/admin/courses',
    '/admin/badges',
    '/admin/tutoring',
    '/messages',
    '/path',
    '/tutoring',
  ],
  tutor: [
    '/tutoring',
    '/tutoring/dashboard',
    '/tutoring/history',
    '/tutoring/test-setup',
    '/messages',
    '/friends',
    '/profile',
    '/path',
  ],
  learner: [
    '/path',
    '/library',
    '/friends',
    '/leaderboard',
    '/messages',
    '/tutoring',
    '/profile',
  ],
  tutor2: ['/tutoring/dashboard', '/tutoring'],
};

const ACCOUNTS: Record<Role, { email: string; password: string }> = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@gmail.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin@1221',
  },
  tutor: {
    email: process.env.TEST_TUTOR_EMAIL || 'tutor@gmail.com',
    password: process.env.TEST_TUTOR_PASSWORD || 'tutor@1221',
  },
  tutor2: {
    email: process.env.TEST_TUTOR2_EMAIL || 'tutor2@gmail.com',
    password: process.env.TEST_TUTOR2_PASSWORD || 'tutor2@1221',
  },
  learner: {
    email: process.env.TEST_LEARNER_EMAIL || 'learner@gmail.com',
    password: process.env.TEST_LEARNER_PASSWORD || 'learner@1221',
  },
};

export default async function globalSetup(config: FullConfig) {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const baseURL = (config.projects[0]?.use?.baseURL as string) || 'http://localhost:3000';
  const browser = await chromium.launch();

  for (const [role, account] of Object.entries(ACCOUNTS)) {
    const file = path.join(OUT_DIR, `${role}.json`);

    // Reuse a cached session if it is still valid, to avoid rate limits
    let state: StorageState | null = null;

    if (fs.existsSync(file)) {
      try {
        const candidate: StorageState = JSON.parse(fs.readFileSync(file, 'utf8'));
        const context = await browser.newContext({ storageState: candidate, baseURL });
        const page = await context.newPage();
        await page.goto('/path', { waitUntil: 'domcontentloaded', timeout: 30000 });
        const url = page.url();
        await context.close();
        if (!url.includes('/sign-in')) {
          console.log(`[auth] reusing cached ${role} session`);
          state = candidate;
        }
      } catch {
        // fall through and re-authenticate
      }
    }

    if (!state) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();

      try {
        // Dev-mode Turbopack can invalidate server action ids after a recompile,
        // which makes the sign-in POST fail on the first try. Reload and retry.
        let lastError: unknown;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.fill('input[type="email"]', account.email);
            await page.fill('input[type="password"]', account.password);
            await page.click('button[type="submit"]');
            await page.waitForURL((url) => !url.toString().includes('/sign-in'), { timeout: 30000 });

            await context.storageState({ path: file });
            state = JSON.parse(fs.readFileSync(file, 'utf8')) as StorageState;
            console.log(`[auth] signed in ${role} (${account.email})`);
            lastError = undefined;
            break;
          } catch (err) {
            lastError = err;
            console.warn(`[auth] ${role} attempt ${attempt} failed: ${err}`);
          }
        }
        if (!state) throw lastError;
      } catch (err) {
        console.error(`[auth] FAILED ${role} (${account.email}):`, err);
        process.exitCode = 1;
      } finally {
        await context.close();
      }
    }

    if (!state) continue;

    // Warm up every route this role can reach so on-demand dev compilation
    // does not eat the first test that visits each page.
    const context = await browser.newContext({ storageState: state, baseURL });
    const page = await context.newPage();
    await page.goto(LANDING[role as Role] ?? '/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    for (const route of WARMUP[role as Role] ?? []) {
      try {
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 });
      } catch (err) {
        console.warn(`[warmup] ${role} ${route} failed: ${err}`);
      }
    }
    await context.close();
  }

  await browser.close();
}
