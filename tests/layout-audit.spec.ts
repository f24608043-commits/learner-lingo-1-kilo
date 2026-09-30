import { test, expect } from '@playwright/test';
import { loginAs, type Role } from './auth';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const PAGES: Record<Role, string[]> = {
  admin: [
    '/admin',
    '/admin/users',
    '/admin/courses',
    '/admin/badges',
    '/admin/tutoring',
    '/messages',
  ],
  tutor: [
    '/tutoring',
    '/tutoring/dashboard',
    '/tutoring/history',
    '/tutoring/test-setup',
    '/messages',
    '/friends',
    '/leaderboard',
    '/library',
    '/path',
  ],
  learner: [
    '/path',
    '/library',
    '/friends',
    '/leaderboard',
    '/messages',
    '/tutoring',
  ],
  tutor2: ['/tutoring/dashboard'],
};

/**
 * Layout audit: catches the "compressed page" class of bug where content is
 * squeezed into a fraction of the viewport or overflows horizontally.
 */
async function auditLayout(page: import('@playwright/test').Page) {
  // Note: no `networkidle` here - the reminders poller keeps the network busy
  // forever, so wait on load plus a short settle instead.
  await page.waitForLoadState('load').catch(() => {});

  // Icon fonts render as the literal ligature word until they load, which
  // measures as a very wide span. Wait for fonts so widths are real.
  await page.evaluate(() => document.fonts.ready).catch(() => {});

  // A navigation triggered during the waits above can destroy the execution
  // context; settle and measure again in that case.
  try {
    return await measure(page);
  } catch {
    await page.waitForLoadState('load').catch(() => {});
    return await measure(page);
  }
}

async function measure(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const viewportWidth = window.innerWidth;

    // Element wider than the viewport is the usual cause of a sideways scroll.
    const overflowing: string[] = [];
    const narrow: string[] = [];

    const main = document.querySelector('main') ?? document.body;
    const mainStyle = getComputedStyle(main);
    const mainWidth = main.getBoundingClientRect().width;

    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (style.position === 'fixed') continue;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      // Skip content that is deliberately out of view: a container parked
      // off-screen by a transform, or an intentional horizontal scroller
      // such as a carousel. Neither causes the page itself to scroll sideways,
      // which is what the scrollWidth assertion below actually guards.
      let contained = false;
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') {
          contained = true;
          break;
        }
        if (ps.transform !== 'none' || ps.translate !== 'none') {
          const pr = p.getBoundingClientRect();
          if (pr.right <= 0 || pr.left >= viewportWidth) {
            contained = true;
            break;
          }
        }
      }
      if (contained) continue;

      if (rect.right > viewportWidth + 1 || rect.left < -1) {
        overflowing.push(
          `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.')} ` +
            `[${Math.round(rect.left)}..${Math.round(rect.right)}] vw=${viewportWidth}`,
        );
      }

      // A full-width container that is being clipped to a fraction of the
      // viewport usually means a fixed-width or missing-w-full ancestor.
      if (
        el.children.length > 2 &&
        rect.width > 0 &&
        rect.width < viewportWidth * 0.25 &&
        style.overflow !== 'auto' &&
        style.overflow !== 'scroll'
      ) {
        narrow.push(
          `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').filter(Boolean).slice(0, 2).join('.')} ` +
            `width=${Math.round(rect.width)} of ${viewportWidth}`,
        );
      }
    }

    return {
      scrollWidth: doc.scrollWidth,
      viewportWidth,
      mainWidth: Math.round(mainWidth),
      mainDisplay: mainStyle.display,
      mainPadding: mainStyle.padding,
      bodyTextLength: (document.body.innerText ?? '').trim().length,
      overflowing: overflowing.slice(0, 5),
      narrow: narrow.slice(0, 5),
    };
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`Layout audit @ ${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
    test.slow();

    test('public pages are not compressed', async ({ page }) => {
      for (const route of ['/', '/sign-in', '/sign-up']) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        const audit = await auditLayout(page);

        expect(audit.overflowing, `${route} overflowing elements: ${audit.overflowing.join(' | ')}`).toEqual([]);
        expect(audit.scrollWidth, `${route} scrollWidth ${audit.scrollWidth} > ${audit.viewportWidth}`)
          .toBeLessThanOrEqual(audit.viewportWidth + 1);
      }
    });

    for (const role of ['admin', 'tutor', 'learner'] as Role[]) {
      test(`${role} pages are not compressed`, async ({ page }) => {
        await loginAs(page, role);

        for (const route of PAGES[role]) {
          // Dev-mode recompiles can abort or stall a navigation; retry once.
          try {
            await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45000 });
          } catch (err) {
            console.warn(`retrying ${route}: ${err}`);
            await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60000 });
          }
          const audit = await auditLayout(page);

          expect(audit.overflowing, `${route} overflowing: ${audit.overflowing.join(' | ')}`).toEqual([]);
          expect(audit.scrollWidth, `${route} scrollWidth ${audit.scrollWidth} > ${audit.viewportWidth}`)
            .toBeLessThanOrEqual(audit.viewportWidth + 1);
          expect(audit.bodyTextLength, `${route} rendered almost no text`).toBeGreaterThan(50);
        }
      });
    }
  });
}
