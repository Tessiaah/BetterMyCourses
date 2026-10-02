import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { courseRegressionFixture } from './course-regression-fixture';

test('native course geometry and icons survive theming; legacy headers, quiz variants and course click states are covered', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const context = await browser.newContext({
      forcedColors: 'none',
      viewport: { width: 1440, height: 900 },
    });
    await context.addInitScript(() => {
      const listeners = new Set<(changes: unknown, area: string) => void>();
      const storage = (area: string) => ({
        async get(key: string) {
          return { [key]: JSON.parse(localStorage.getItem(key) ?? 'null') };
        },
        async set(values: Record<string, unknown>) {
          for (const [key, value] of Object.entries(values)) {
            localStorage.setItem(key, JSON.stringify(value));
            listeners.forEach((fn) => fn({ [key]: { newValue: value } }, area));
          }
        },
      });
      Object.assign(globalThis, {
        browser: {
          runtime: {
            id: 'fixture-runtime',
            getURL: (file: string) => location.origin + file,
          },
          storage: {
            sync: storage('sync'),
            local: storage('local'),
            onChanged: {
              addListener: (fn: (changes: unknown, area: string) => void) =>
                listeners.add(fn),
              removeListener: (fn: (changes: unknown, area: string) => void) =>
                listeners.delete(fn),
            },
          },
        },
      });
    });
    await context.route('https://mycourses.aalto.fi/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const kind =
        pathname === '/course/view.php'
          ? 'course'
          : pathname === '/mod/quiz/review.php'
            ? 'quiz'
            : pathname === '/my/courses.php'
              ? 'courses'
              : null;
      if (kind)
        return route.fulfill({
          contentType: 'text/html',
          body: courseRegressionFixture(kind),
        });
      if (pathname === '/bootstrap.css')
        return route.fulfill({
          contentType: 'text/css',
          body: await readFile(
            'node_modules/bootstrap/dist/css/bootstrap.min.css',
          ),
        });
      if (pathname === '/native-aalto.css')
        return route.fulfill({
          contentType: 'text/css',
          body: await readFile('tests/browser/native-aalto.css'),
        });
      if (pathname.startsWith('/fonts/'))
        return route.fulfill({
          contentType: 'font/ttf',
          body: await readFile(path.join('.output/chrome-mv3', pathname)),
        });
      return route.abort();
    });
    const css = await readFile(
      '.output/chrome-mv3/content-scripts/theme.css',
      'utf8',
    );
    const js = await readFile(
      '.output/chrome-mv3/content-scripts/theme.js',
      'utf8',
    );
    const page = await context.newPage();
    const set = (enabled: boolean, linkColor = '#a8c7b5') =>
      page.evaluate(
        async (settings) => {
          const runtime = globalThis as unknown as {
            browser: {
              storage: {
                sync: { set(values: Record<string, unknown>): Promise<void> };
              };
            };
          };
          await runtime.browser.storage.sync.set({
            'betterMyCourses.settings': { ...settings, theme: 'inky-black' },
          });
        },
        { enabled, linkColor },
      );
    for (const [kind, url] of [
      ['course', '/course/view.php'],
      ['quiz', '/mod/quiz/review.php'],
      ['courses', '/my/courses.php'],
    ] as const) {
      await page.goto('https://mycourses.aalto.fi' + url);
      const original = await page
        .locator('#region-main')
        .evaluate((el) => el.innerHTML);
      const originalTitleStyle =
        kind !== 'courses'
          ? await page.locator('#legacy-title').getAttribute('style')
          : null;
      const bannerBefore =
        kind !== 'courses'
          ? await page
              .locator('#page-header')
              .evaluate((el) => getComputedStyle(el).backgroundImage)
          : null;
      const geometry = () =>
        page
          .locator('h1, .summary, .generalbox, .course-content .activity-item')
          .evaluateAll((nodes) =>
            nodes.map((el) => {
              const s = getComputedStyle(el);
              return {
                padding: s.padding,
                margin: s.margin,
                fontSize: s.fontSize,
                lineHeight: s.lineHeight,
                width: s.width,
                display: s.display,
                border: s.borderWidth,
                radius: s.borderRadius,
              };
            }),
          );
      const nativeGeometry = await geometry();
      const nativeIcons = await page
        .locator('#original-activity-icon, #original-event-icon')
        .evaluateAll((nodes) =>
          nodes.map((el) => ({
            src: el.getAttribute('src'),
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          })),
        );
      await page.addStyleTag({ content: css });
      await page.addScriptTag({ content: js });
      await set(true);
      await expect(page.locator('html')).toHaveAttribute(
        'data-better-my-courses',
        'dark',
      );
      if (kind !== 'courses') {
        await expect(page.locator('#legacy-title')).toHaveCSS(
          'background-color',
          'rgb(0, 0, 0)',
        );
        await expect(page.locator('h1')).toHaveCSS(
          'color',
          'rgb(241, 239, 234)',
        );
        expect(
          await page
            .locator('#page-header')
            .evaluate((el) => getComputedStyle(el).backgroundImage),
        ).toBe(bannerBefore);
        await expect(page.locator('#legacy-title')).toHaveAttribute(
          'data-bmc-course-title-panel',
          'true',
        );
      }
      expect(await geometry()).toEqual(nativeGeometry);
      if (kind === 'course') {
        for (const [hex, rgb] of [
          ['#a8c7b5', 'rgb(168, 199, 181)'],
          ['#e4a9ad', 'rgb(228, 169, 173)'],
        ]) {
          await set(true, hex!);
          await expect(page.locator('.breadcrumb a')).toHaveCSS('color', rgb!);
          for (const id of [
            'file-icon',
            'quiz-icon',
            'tool-icon',
            'progress-icon',
            'week-arrow',
          ]) {
            await expect(page.locator('#' + id)).toHaveCSS('color', rgb!);
            await expect(page.locator('#' + id)).toHaveCSS(
              'font-family',
              '"Font Awesome 6 Free"',
            );
          }
        }
        const icons = page.locator(
          '#original-activity-icon, #original-event-icon',
        );
        const themedIcons = await icons.evaluateAll((nodes) =>
          nodes.map((el) => ({
            src: el.getAttribute('src'),
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height,
          })),
        );
        expect(themedIcons).toEqual(nativeIcons);
        for (const icon of await icons.all())
          await expect(icon).toHaveCSS('filter', 'none');
        await expect(page.locator('.activityiconcontainer').first()).toHaveCSS(
          'background-color',
          'rgb(255, 205, 0)',
        );
      } else if (kind === 'quiz') {
        // No path-mod-quiz or stack body/question class; stable components suffice.
        for (const selector of [
          '.que .info',
          '.que .content',
          '.que .formulation',
        ])
          await expect(page.locator(selector)).toHaveCSS(
            'background-color',
            'rgb(6, 6, 6)',
          );
        await expect(page.locator('.stackinputfeedback.standard')).toHaveCSS(
          'background-color',
          'rgb(17, 17, 18)',
        );
        await expect(page.locator('.stackinputfeedback.empty')).toBeHidden();
        for (const id of ['diagram', 'inline-diagram']) {
          await expect(page.locator('#' + id)).toHaveCSS(
            'background-color',
            'rgb(241, 240, 236)',
          );
          await expect(page.locator('#' + id)).toHaveCSS('filter', 'none');
        }
        for (const id of ['quiz-icon', 'equation', 'drag-question'])
          await expect(page.locator('#' + id)).toHaveCSS(
            'background-color',
            'rgba(0, 0, 0, 0)',
          );
        await expect(page.locator('#answer')).toHaveCSS(
          'background-color',
          'rgb(21, 21, 22)',
        );
        await expect(page.locator('#answer')).toHaveValue('100');
        await expect(page.locator('.questionflag label span')).toHaveCSS(
          'color',
          'rgb(168, 199, 181)',
        );
        await page.getByText('Flag question').click();
        await expect(page.locator('#flag')).toBeChecked();
        await expect(
          page.getByRole('link', { name: 'Finish review' }),
        ).toHaveCSS('background-color', 'rgb(21, 21, 22)');
        const title = (await page.locator('#activity-title').boundingBox())!;
        const separator = (await page
          .locator('#activity-separator')
          .boundingBox())!;
        const intro = (await page.locator('#activity-intro').boundingBox())!;
        expect(separator.y - title.y - title.height).toBeGreaterThanOrEqual(24);
        expect(intro.y - separator.y - separator.height).toBeGreaterThanOrEqual(
          20,
        );
      } else {
        await expect(page.locator('.categoryname')).toHaveCSS(
          'color',
          'rgb(179, 176, 170)',
        );
        const link = page.getByRole('link', { name: 'Synthetic course name' });
        await link.click();
        await expect(link).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(link).toHaveCSS('box-shadow', 'none');
        await expect(link).toHaveCSS('outline-style', 'none');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        await link.focus();
        await expect(link).toHaveCSS('outline-width', '2px');
        await expect(link).toHaveCSS('outline-color', 'rgb(168, 199, 181)');
      }
      for (const id of [
        'authored-link',
        'plain-aalink',
        'arrow-link',
        'classless-link',
        'role-link',
      ]) {
        const link = page.locator('#' + id);
        await link.click();
        await expect(link).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(link).toHaveCSS('box-shadow', 'none');
        await expect(link).toHaveCSS('outline-style', 'none');
        await page.mouse.move(0, 0);
        const chosenColor =
          kind === 'course' ? 'rgb(228, 169, 173)' : 'rgb(168, 199, 181)';
        await expect(link).toHaveCSS('color', chosenColor);
        await page.keyboard.press('Tab');
        await link.focus();
        await expect(link).toHaveCSS('outline-width', '2px');
        await expect(link).toHaveCSS('outline-color', chosenColor);
      }
      await expect(page.locator('#authored-copy')).toHaveCSS(
        'color',
        'rgb(255, 68, 55)',
      );
      for (const width of [1920, 1600, 1440, 1366, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
        ).toBe(false);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({
        path: `test-results/native-${kind}.png`,
        fullPage: true,
        caret: 'initial',
      });
      await set(false);
      await expect(page.locator('html')).not.toHaveAttribute(
        'data-better-my-courses',
      );
      expect(
        await page.locator('#region-main').evaluate((el) => el.innerHTML),
      ).toBe(original);
      if (kind !== 'courses') {
        expect(await page.locator('#legacy-title').getAttribute('style')).toBe(
          originalTitleStyle,
        );
        await expect(page.locator('#legacy-title')).not.toHaveAttribute(
          'data-bmc-course-title-panel',
        );
      }
      expect(await geometry()).toEqual(nativeGeometry);
    }
  } finally {
    await browser.close();
  }
});
