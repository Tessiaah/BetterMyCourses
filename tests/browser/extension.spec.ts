import { test, expect, chromium } from '@playwright/test';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { families, fixture } from './fixture';

const extensionPath = path.resolve('.output/chrome-mv3');
const origin = 'https://mycourses.aalto.fi';

test('packaged MV3 extension: activation, popup, sync, persistence, scope and overflow', async () => {
  const profileRoot = path.resolve('.tools/browser-profiles');
  await mkdir(profileRoot, { recursive: true });
  const profile = await mkdtemp(path.join(profileRoot, 'bmc-test-'));
  const launch = () =>
    chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      executablePath: process.env.BMC_BROWSER_PATH,
      headless: true,
      forcedColors: 'none',
      args: [
        '--enable-unsafe-extension-debugging',
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
  let context = await launch();
  try {
    const bootstrap = await readFile(
      'node_modules/bootstrap/dist/css/bootstrap.min.css',
      'utf8',
    );
    await context.route(`${origin}/**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/native-aalto.css')
        return route.fulfill({
          contentType: 'text/css',
          body: await readFile('tests/browser/native-aalto.css', 'utf8'),
        });
      if (url.pathname === '/bootstrap.css')
        return route.fulfill({ contentType: 'text/css', body: bootstrap });
      if (url.pathname === '/fixture-image.svg')
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="64"><rect width="120" height="64" fill="#ffcc00"/></svg>',
        });
      const family =
        families.find((f) => url.pathname.includes(f)) ?? 'courses';
      return route.fulfill({ contentType: 'text/html', body: fixture(family) });
    });
    const manager = await context.newPage();
    const cdp = await context.newCDPSession(manager);
    const { id } = await cdp.send('Extensions.loadUnpacked', {
      path: extensionPath,
    });
    expect(id).toBeTruthy();
    await manager.close();
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    const toggle = popup.getByRole('switch', { name: 'Dark theme' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}/courses`);
    await expect(page.locator('html')).toHaveAttribute(
      'data-better-my-courses',
      'dark',
    );
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(0, 0, 0)',
    );
    await popup.screenshot({ path: 'test-results/popup-on.png' });

    for (const family of families) {
      for (const [width, height] of [
        [1920, 1080],
        [1600, 900],
        [1440, 900],
        [1366, 768],
      ]) {
        await page.setViewportSize({ width: width!, height: height! });
        await page.goto(`${origin}/${family}`);
        await expect(page.locator('html')).toHaveAttribute(
          'data-better-my-courses',
          'dark',
        );
        await page.evaluate(() => document.fonts.ready);

        const imagery = await page.locator('img').evaluateAll((els) =>
          els.map((el) => ({
            src: el.getAttribute('src'),
            filter: getComputedStyle(el).filter,
          })),
        );
        await page.screenshot({
          path: `test-results/${family}-${width}.png`,
          fullPage: true,
        });
        const overflowDark = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        await toggle.click();
        await expect(page.locator('html')).not.toHaveAttribute(
          'data-better-my-courses',
        );

        expect(
          await page.locator('img').evaluateAll((els) =>
            els.map((el) => ({
              src: el.getAttribute('src'),
              filter: getComputedStyle(el).filter,
            })),
          ),
        ).toEqual(imagery);
        const overflowLight = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        expect(overflowDark).toBe(overflowLight);
        expect(overflowDark).toBe(false);
        await toggle.click();
        await expect(page.locator('html')).toHaveAttribute(
          'data-better-my-courses',
          'dark',
        );
      }
    }
    // Keyboard feedback, link color, modal and dynamically inserted Moodle surfaces.
    await page.goto(`${origin}/courses`);
    await page.locator('#text').focus();
    await expect(page.locator('#text')).toHaveCSS(
      'outline-color',
      'rgb(215, 183, 122)',
    );
    await expect(
      page.locator('.summary a').or(page.locator('.course-listitem a')).first(),
    ).toHaveCSS('color', 'rgb(216, 195, 160)');
    await expect(page.locator('.modal-content')).toHaveCSS(
      'background-color',
      'rgb(6, 6, 6)',
    );
    await page.evaluate(() => {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = 'dynamic-card';
      card.textContent = 'Dynamically inserted fixture';
      document.body.append(card);
    });
    await expect(page.locator('#dynamic-card')).toHaveCSS(
      'background-color',
      'rgb(6, 6, 6)',
    );
    const other = await context.newPage();
    await context.route('https://example.org/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: fixture('courses') }),
    );
    await other.goto('https://example.org/');
    await expect(other.locator('html')).not.toHaveAttribute(
      'data-better-my-courses',
    );
    const second = await context.newPage();
    await second.goto(`${origin}/dashboard`);
    await toggle.click();
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-better-my-courses',
    );
    await expect(second.locator('html')).not.toHaveAttribute(
      'data-better-my-courses',
    );
    await popup.screenshot({ path: 'test-results/popup-off.png' });
    await context.close();
    context = await launch();
    await context.route(`${origin}/**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: fixture('courses') }),
    );
    const reopened = await context.newPage();
    await reopened.goto(`chrome-extension://${id}/popup.html`);
    await expect(
      reopened.getByRole('switch', { name: 'Dark theme' }),
    ).toHaveAttribute('aria-checked', 'false');
    const restored = await context.newPage();
    await restored.goto(origin);
    await expect(restored.locator('html')).not.toHaveAttribute(
      'data-better-my-courses',
    );
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    if (path.resolve(profile).startsWith(`${profileRoot}${path.sep}`)) {
      await rm(profile, { recursive: true, force: true });
    }
  }
});
