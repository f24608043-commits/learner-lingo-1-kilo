import fs from 'fs';
import path from 'path';
import type { Page } from '@playwright/test';

export type Role = 'admin' | 'tutor' | 'tutor2' | 'learner';

// Default to the shared cache so runs can reuse sessions. Set PW_AUTH_DIR to
// isolate a run: two Playwright runs writing the same files interleave and
// produce spurious "session no longer valid" failures.
const OUT_DIR = path.resolve(
  process.cwd(),
  process.env.PW_AUTH_DIR || '.auth'
);

const LANDING: Record<Role, string> = {
  admin: '/admin',
  tutor: '/tutoring/dashboard',
  tutor2: '/tutoring/dashboard',
  learner: '/path',
};

export function authState(role: Role) {
  return path.join(OUT_DIR, `${role}.json`);
}

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

/**
 * Restores a pre-authenticated session for `role` into the current page
 * context. Sessions are created once by `tests/global-setup.ts`.
 *
 * This avoids a Supabase sign-in per test, which otherwise trips the auth
 * rate limiter partway through a long suite.
 */
export async function loginAs(page: Page, role: Role, landTo?: string): Promise<void> {
  const file = authState(role);

  if (!fs.existsSync(file)) {
    throw new Error(
      `Missing cached auth state for "${role}" at ${file}. ` +
        `Run the suite so tests/global-setup.ts can create it.`,
    );
  }

  const state: StorageState = JSON.parse(fs.readFileSync(file, 'utf8'));

  await page.context().clearCookies();
  await page.context().addCookies(state.cookies);

  const origin = state.origins[0]?.origin;
  if (origin) {
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.evaluate((entries) => {
      window.localStorage.clear();
      for (const { name, value } of entries) {
        window.localStorage.setItem(name, value);
      }
    }, state.origins[0].localStorage);
  }

  await page.goto(landTo ?? LANDING[role], { waitUntil: 'domcontentloaded' });

  // A stale session would silently turn into an unauthenticated test, so
  // verify it landed somewhere other than the sign-in page.
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/sign-in')) {
    throw new Error(
      `Cached session for "${role}" is no longer valid. ` +
        `Delete ${file} and re-run so global-setup can refresh it.`,
    );
  }
}

/**
 * Navigates to `url`, tolerating the `net::ERR_ABORTED` that Next's dev server
 * produces when a route guard redirects mid-navigation. The abort still leaves
 * the browser on the redirect target, so callers can assert on `page.url()`.
 */
export async function gotoRedirectSafe(
  page: Page,
  url: string,
  timeout = 45000,
): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('ERR_ABORTED')) throw err;
  }
}
