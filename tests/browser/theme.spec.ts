import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { families, fixture } from './fixture';
import { polishFixture } from './polish-fixture';

test('course and STACK quiz polish keeps diagrams readable, focus inside links and scroll containers usable', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const css = await readFile(
      '.output/chrome-mv3/content-scripts/theme.css',
      'utf8',
    );
    const bootstrap = await readFile(
      'node_modules/bootstrap/dist/css/bootstrap.min.css',
      'utf8',
    );
    const native = await readFile('tests/browser/native-aalto.css', 'utf8');
    for (const kind of ['course', 'quiz'] as const) {
      await page.setContent(polishFixture(kind));
      await page.addStyleTag({ content: bootstrap });
      await page.addStyleTag({ content: native });
      const original = await page
        .locator('#region-main')
        .evaluate((el) => el.innerHTML);
      const imageBefore =
        kind === 'quiz' ? await page.locator('#diagram').boundingBox() : null;
      const summaryLineHeight =
        kind === 'course'
          ? await page
              .locator('.summary')
              .evaluate((el) => getComputedStyle(el).lineHeight)
          : null;
      await page.addStyleTag({ content: css });
      await page
        .locator('html')
        .evaluate((el) => el.setAttribute('data-better-my-courses', 'dark'));
      await expect(
        page.locator('.contextpage-context-header-content'),
      ).toHaveCSS('background-color', 'rgb(0, 0, 0)');
      await expect(page.locator('h1')).toHaveCSS('color', 'rgb(241, 239, 234)');
      const header = page.locator('.navbar .nav-link').last();
      await header.click();
      await expect(header).toHaveCSS('outline-style', 'none');
      await header.hover();
      await page.mouse.down();
      await expect(header).toHaveCSS('background-color', 'rgb(32, 32, 34)');
      await expect(header).toHaveCSS('transform', 'none');
      await page.mouse.up();
      await page.keyboard.press('Tab');
      await header.focus();
      await expect(header).toHaveCSS('outline-width', '2px');
      await expect(header).toHaveCSS('outline-offset', '-5px');
      if (kind === 'quiz') {
        for (const selector of [
          '.que .info',
          '.que .content',
          '.que .formulation',
          'table.quizreviewsummary td',
        ])
          await expect(page.locator(selector)).toHaveCSS(
            'background-color',
            'rgb(6, 6, 6)',
          );
        for (const state of ['standard', 'compact', 'equiv', 'loading'])
          await expect(page.locator(`.stackinputfeedback.${state}`)).toHaveCSS(
            'background-color',
            'rgb(17, 17, 18)',
          );
        await expect(page.locator('.stackinputfeedback.empty')).toBeHidden();
        await expect(page.locator('.que .outcome')).toHaveCSS(
          'background-color',
          'rgb(3, 3, 3)',
        );
        await expect(page.locator('.que .comment')).toHaveCSS(
          'background-color',
          'rgb(3, 3, 3)',
        );
        await expect(page.locator('#diagram')).toHaveCSS(
          'background-color',
          'rgb(241, 240, 236)',
        );
        await expect(page.locator('#diagram')).toHaveCSS('filter', 'none');
        const imageAfter = (await page.locator('#diagram').boundingBox())!;
        const paper = await page.locator('#diagram').evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            x: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
            y: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
          };
        });
        expect(imageAfter.width).toBeGreaterThan(imageBefore!.width);
        expect(imageAfter.height).toBeGreaterThan(imageBefore!.height);
        expect(imageAfter.width - paper.x).toBeCloseTo(imageBefore!.width, 1);
        expect(imageAfter.height - paper.y).toBeCloseTo(imageBefore!.height, 1);
        for (const id of ['question-icon', 'equation'])
          await expect(page.locator('#' + id)).toHaveCSS(
            'background-color',
            'rgba(0, 0, 0, 0)',
          );
        const finish = page
          .locator('.othernav')
          .getByRole('link', { name: 'Finish review' });
        await expect(finish).toHaveCSS('background-color', 'rgb(21, 21, 22)');
        await finish.hover();
        await expect(finish).toHaveCSS('background-color', 'rgb(41, 41, 43)');
        await finish.click();
        expect(await finish.getAttribute('href')).toBe('#finished');
        const bottom = page.locator('.submitbtns a.mod_quiz-next-nav');
        await expect(bottom).toHaveCSS('background-color', 'rgb(21, 21, 22)');
        await expect(bottom).toHaveCSS('color', 'rgb(241, 239, 234)');
        await expect(bottom).toHaveCSS('border-color', 'rgb(133, 133, 128)');
        await bottom.hover();
        await expect(bottom).toHaveCSS('background-color', 'rgb(41, 41, 43)');
        const statuses = await page
          .locator('.trafficlight')
          .evaluateAll((elements) =>
            elements.map((el) => getComputedStyle(el).backgroundColor),
          );
        expect(new Set(statuses).size).toBe(3);
      } else {
        await expect(page.locator('.generalbox')).toHaveCSS(
          'background-color',
          'rgb(6, 6, 6)',
        );
        await expect(page.locator('.summary')).toHaveCSS(
          'line-height',
          summaryLineHeight!,
        );
        const row = (await page.locator('.course-listitem').boundingBox())!;
        const menu = (await page
          .getByRole('button', { name: 'Course actions' })
          .boundingBox())!;
        expect(row.x + row.width - menu.x - menu.width).toBeGreaterThanOrEqual(
          12,
        );
      }
      const sidebar = page.locator('.drawercontent');
      await expect(sidebar).toHaveCSS('scrollbar-width', 'none');
      await sidebar.scrollIntoViewIfNeeded();
      await sidebar.hover();
      await page.mouse.wheel(0, 200);
      await expect
        .poll(() => sidebar.evaluate((el) => el.scrollTop))
        .toBeGreaterThan(0);
      await sidebar.evaluate((el) => (el.scrollTop = 0));
      await sidebar.focus();
      await page.keyboard.press('End');
      await expect
        .poll(() => sidebar.evaluate((el) => el.scrollTop))
        .toBeGreaterThan(0);
      for (const width of [1920, 1600, 1440, 1366, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
        ).toBe(false);
        await expect(page.locator('h1')).toHaveCSS('white-space', 'normal');
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.screenshot({
        path: `test-results/${kind}-polish.png`,
        fullPage: true,
        caret: 'initial',
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(header).toHaveCSS('transition-duration', '0s');
      await page
        .locator('html')
        .evaluate((el) => el.removeAttribute('data-better-my-courses'));
      await expect(sidebar).toHaveCSS('scrollbar-width', 'auto');
      expect(
        await page.locator('#region-main').evaluate((el) => el.innerHTML),
      ).toBe(original);
    }
  } finally {
    await browser.close();
  }
});

test('reference Home layout preserves native nodes, follows the selected accent and restores on Off', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const context = await browser.newContext({
      forcedColors: 'none',
      viewport: { width: 1672, height: 1000 },
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
            getURL: (path: string) => location.origin + path,
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
      if (pathname === '/home')
        return route.fulfill({
          contentType: 'text/html',
          body: fixture('home'),
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
      if (pathname === '/fixture-image.svg')
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"><rect width="1000" height="500" fill="#555555"/></svg>',
        });
      return route.fulfill({
        contentType: 'font/ttf',
        body: await readFile(path.join('.output/chrome-mv3', pathname)),
      });
    });
    const page = await context.newPage();
    await page.goto('https://mycourses.aalto.fi/home');
    const original = await page
      .locator('#region-main')
      .evaluate((el) => el.innerHTML);
    await page.evaluate(() => {
      const link = document.querySelector('.block_rss_client .link a')!;
      link.addEventListener(
        'click',
        () => (document.body.dataset.articleClicked = 'true'),
      );
    });
    await page.addStyleTag({
      content: await readFile(
        '.output/chrome-mv3/content-scripts/theme.css',
        'utf8',
      ),
    });
    await page.addScriptTag({
      content: await readFile(
        '.output/chrome-mv3/content-scripts/theme.js',
        'utf8',
      ),
    });
    await expect(page.locator('.bmc-home-hero-copy h1')).toHaveText(
      'MyCourses',
    );
    await expect(page.locator('.bmc-home-feed-heading')).toHaveCount(2);
    await expect(page.locator('.bmc-home-hero-copy')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0.65)',
    );
    await expect(page.locator('.bmc-home-hero-copy h1')).toHaveCSS(
      'color',
      'rgb(241, 239, 234)',
    );
    const strip = (await page.locator('.secondary-navigation').boundingBox())!;
    const selected = (await page
      .locator('.secondary-navigation .nav-link.active')
      .boundingBox())!;
    expect(selected.x - strip.x).toBeGreaterThanOrEqual(4);
    expect(selected.y - strip.y).toBeGreaterThanOrEqual(4);
    expect(
      strip.y + strip.height - selected.y - selected.height,
    ).toBeGreaterThanOrEqual(4);
    const feeds = (await page.locator('.rssfeedarea').boundingBox())!;
    const panel = (await page
      .locator('.block_rss_client')
      .first()
      .boundingBox())!;
    expect(panel.y - feeds.y).toBeGreaterThanOrEqual(16);
    await expect(
      page.getByRole('link', { name: 'All Aalto news', exact: true }),
    ).toHaveAttribute('href', 'https://www.aalto.fi/en/news');
    await expect(
      page.getByRole('link', { name: 'All student news', exact: true }),
    ).toHaveAttribute('href', 'https://www.aalto.fi/en/student-news');
    await expect(page.locator('.block_rss_client time')).toHaveCount(0);
    await page.locator('.block_rss_client .link a').first().click();
    await expect(page.locator('body')).toHaveAttribute(
      'data-article-clicked',
      'true',
    );
    const set = (value: { enabled: boolean; linkColor: string }) =>
      page.evaluate(async (value) => {
        const runtime = globalThis as unknown as {
          browser: {
            storage: {
              sync: { set(values: Record<string, unknown>): Promise<void> };
            };
          };
        };
        await runtime.browser.storage.sync.set({
          'betterMyCourses.settings': { ...value, theme: 'inky-black' },
        });
      }, value);
    for (const [hex, rgb] of [
      ['#a8c7b5', 'rgb(168, 199, 181)'],
      ['#eeeae2', 'rgb(238, 234, 226)'],
    ]) {
      await set({ enabled: true, linkColor: hex! });
      await expect(
        page.locator('.bmc-home-feed-heading > .bmc-home-icon').first(),
      ).toHaveCSS('color', rgb!);
      await expect(
        page.locator('.secondary-navigation .nav-link.active'),
      ).toHaveCSS('border-bottom-color', rgb!);
      await expect(page.locator('.bmc-home-all-news').first()).toHaveCSS(
        'color',
        rgb!,
      );
      await expect(page.locator('.bmc-home-feed-heading')).toHaveCount(2);
    }
    for (const width of [1920, 1600, 1440, 1366, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await expect(page.locator('.bmc-home-hero-copy')).toBeVisible();
      await expect(page.locator('.block_rss_client .link a')).toHaveCount(6);
    }
    await page.screenshot({
      path: 'test-results/home-reference-mobile.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 1672, height: 1000 });
    await page.screenshot({
      path: 'test-results/home-reference-desktop.png',
      fullPage: true,
    });
    await set({ enabled: false, linkColor: '#eeeae2' });
    await expect(
      page.locator(
        '.bmc-home-hero-copy, .bmc-home-feed-heading, .bmc-home-icon',
      ),
    ).toHaveCount(0);
    expect(
      await page.locator('#region-main').evaluate((el) => el.innerHTML),
    ).toBe(original);
    await set({ enabled: true, linkColor: '#eeeae2' });
    await expect(page.locator('.bmc-home-feed-heading')).toHaveCount(2);
  } finally {
    await browser.close();
  }
});

test('banner editor handles empty state, uploads, keyboard framing and recoverable storage failure', async () => {
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
      Object.assign(globalThis, {
        browser: {
          runtime: {
            id: 'fixture-runtime',
            getURL: (path: string) => location.origin + path,
          },
          storage: {
            local: {
              async get(key: string) {
                return {
                  [key]: JSON.parse(localStorage.getItem(key) ?? 'null'),
                };
              },
              async set(values: Record<string, unknown>) {
                if (localStorage.getItem('fail-save')) {
                  localStorage.removeItem('fail-save');
                  throw new Error('Quota test');
                }
                for (const [key, value] of Object.entries(values))
                  localStorage.setItem(key, JSON.stringify(value));
              },
            },
          },
        },
      });
    });
    await context.route('https://extension.test/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      await route.fulfill({
        body: await readFile(path.join('.output/chrome-mv3', pathname)),
        contentType: pathname.endsWith('.html')
          ? 'text/html'
          : pathname.endsWith('.js')
            ? 'application/javascript'
            : pathname.endsWith('.css')
              ? 'text/css'
              : 'font/ttf',
      });
    });
    const page = await context.newPage();
    await page.goto('https://extension.test/options.html');
    await expect(page.locator('#empty')).toBeVisible();
    await expect(page.locator('#save')).toBeDisabled();
    await expect(page.locator('#file')).toBeEnabled();
    await page.locator('#file').setInputFiles({
      name: 'invalid.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    });
    await expect(page.locator('#status')).toHaveText(
      'Choose a PNG, JPEG or WebP image.',
    );
    await page.locator('#file').setInputFiles({
      name: 'image.png',
      mimeType: 'image/png',
      buffer: await readFile('public/icon/128.png'),
    });
    await expect(page.locator('#empty')).toBeHidden();
    await expect(page.locator('#save')).toBeEnabled();
    await page.locator('#fit').selectOption('fit');
    await page.locator('#zoom').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#zoom')).toHaveValue('1.01');
    await page.evaluate(() => localStorage.setItem('fail-save', 'true'));
    await page.locator('#save').click();
    await expect(page.locator('#status')).toContainText(
      'Your changes are still here',
    );
    await expect(page.locator('#zoom')).toHaveValue('1.01');
    await expect(page.locator('#save')).toBeEnabled();
    await page.locator('#save').click();
    await expect(page.locator('#status')).toContainText('Banner saved');
    await page.reload();
    await expect(page.locator('#fit')).toHaveValue('fit');
    await expect(page.locator('#zoom')).toHaveValue('1.01');
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('betterMyCourses.banners')!),
    );
    expect(stored.home.image).toMatch(/^data:image\/webp;base64,/);
    expect(stored.dashboard).toEqual({ mode: 'original', image: '' });
    const manifest = JSON.parse(
      await readFile('.output/chrome-mv3/manifest.json', 'utf8'),
    );
    expect(manifest.options_ui).toEqual({
      open_in_tab: true,
      page: 'options.html',
    });
  } finally {
    await browser.close();
  }
});

// Browser rendering and production-JS integration with a fake WebExtension API.
// This does not prove browser-managed extension installation or storage.sync.
test('theme geometry and production popup/content scripts with simulated storage', async () => {
  const browser = await chromium.launch({
    channel: 'chromium',
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  const context = await browser.newContext({ forcedColors: 'none' });
  try {
    const css = await readFile(
      '.output/chrome-mv3/content-scripts/theme.css',
      'utf8',
    );
    const script = await readFile(
      '.output/chrome-mv3/content-scripts/theme.js',
      'utf8',
    );
    const bootstrap = await readFile(
      'node_modules/bootstrap/dist/css/bootstrap.min.css',
      'utf8',
    );
    const manifest = JSON.parse(
      await readFile('.output/chrome-mv3/manifest.json', 'utf8'),
    );
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions).toEqual(['https://mycourses.aalto.fi/*']);
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.content_scripts[0].matches).toEqual([
      'https://mycourses.aalto.fi/*',
    ]);
    for (const icon of Object.values(manifest.icons) as string[])
      await readFile(path.join('.output/chrome-mv3', icon));
    await context.addInitScript(() => {
      const listeners = new Set<(changes: unknown, area: string) => void>();
      const emit = (key: string, value: unknown) =>
        listeners.forEach((fn) =>
          fn(
            { [key]: { newValue: value } },
            key === 'betterMyCourses.banners' ? 'local' : 'sync',
          ),
        );
      window.addEventListener('storage', (event) => {
        if (event.key)
          emit(
            event.key,
            event.newValue ? JSON.parse(event.newValue) : undefined,
          );
      });
      Object.assign(globalThis, {
        browser: {
          runtime: {
            id: 'fixture-runtime',
            getURL: (path: string) => location.origin + path,
            openOptionsPage: async () => {
              document.documentElement.dataset.optionsOpened = 'true';
            },
          },
          storage: {
            sync: {
              async get(key: string) {
                return {
                  [key]: JSON.parse(localStorage.getItem(key) ?? 'null'),
                };
              },
              async set(values: Record<string, unknown>) {
                for (const [key, value] of Object.entries(values)) {
                  localStorage.setItem(key, JSON.stringify(value));
                  emit(key, value);
                }
              },
            },
            local: {
              async get(key: string) {
                return {
                  [key]: JSON.parse(localStorage.getItem(key) ?? 'null'),
                };
              },
              async set(values: Record<string, unknown>) {
                for (const [key, value] of Object.entries(values)) {
                  localStorage.setItem(key, JSON.stringify(value));
                  emit(key, value);
                }
              },
            },
            onChanged: {
              addListener(fn: (changes: unknown, area: string) => void) {
                listeners.add(fn);
              },
              removeListener(fn: (changes: unknown, area: string) => void) {
                listeners.delete(fn);
              },
            },
          },
        },
      });
    });
    await context.route('https://mycourses.aalto.fi/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/fonts/'))
        return route.fulfill({
          contentType: 'font/ttf',
          body: await readFile(path.join('.output/chrome-mv3', url.pathname)),
        });
      if (url.pathname === '/bootstrap.css')
        return route.fulfill({ contentType: 'text/css', body: bootstrap });
      if (url.pathname === '/native-aalto.css')
        return route.fulfill({
          contentType: 'text/css',
          body: await readFile('tests/browser/native-aalto.css', 'utf8'),
        });
      if (url.pathname === '/fixture-image.svg')
        return route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="64"><rect width="120" height="64" fill="#ffcc00"/></svg>',
        });
      if (url.pathname === '/popup.html' || url.pathname === '/options.html')
        return route.fulfill({
          contentType: 'text/html',
          body: await readFile('.output/chrome-mv3' + url.pathname, 'utf8'),
        });
      if (
        url.pathname.startsWith('/chunks/') ||
        url.pathname.startsWith('/assets/')
      )
        return route.fulfill({
          contentType: url.pathname.endsWith('.js')
            ? 'application/javascript'
            : 'text/css',
          body: await readFile(path.join('.output/chrome-mv3', url.pathname)),
        });
      const family =
        url.pathname === '/home'
          ? 'home'
          : (families.find((f) => url.pathname.includes(f)) ?? 'courses');
      return route.fulfill({ contentType: 'text/html', body: fixture(family) });
    });
    const popup = await context.newPage();
    await popup.goto('https://mycourses.aalto.fi/popup.html');
    const toggle = popup.getByRole('switch', { name: 'Dark theme' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await popup.evaluate(() => document.fonts.ready);
    await popup.setViewportSize({ width: 320, height: 450 });
    await popup.screenshot({ path: 'test-results/popup-on.png' });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const measure = () =>
      page
        .locator(
          '#page, #region-main, .navbar, .card, img, .btn, input, select, th, td',
        )
        .evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          }),
        );
    for (const family of families) {
      for (const [width, height] of [
        [1920, 1080],
        [1600, 900],
        [1440, 900],
        [1366, 768],
      ]) {
        await page.setViewportSize({ width: width!, height: height! });
        await page.goto(`https://mycourses.aalto.fi/${family}`);
        await page
          .locator('img')
          .evaluateAll((imgs) =>
            Promise.all(imgs.map((img) => (img as HTMLImageElement).decode())),
          );
        const before = await measure();
        await page.addStyleTag({ content: css });
        await page.addScriptTag({ content: script });
        await expect(page.locator('html')).toHaveAttribute(
          'data-better-my-courses',
          'dark',
        );
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator('body')).toHaveCSS('font-family', /BMC UI/);
        if (family === 'dashboard' && width === 1440) {
          const fonts = await context.newCDPSession(page);
          await fonts.send('DOM.enable');
          await fonts.send('CSS.enable');
          const { root } = await fonts.send('DOM.getDocument');
          const { nodeId } = await fonts.send('DOM.querySelector', {
            nodeId: root.nodeId,
            selector: '.event-name a',
          });
          const result = await fonts.send('CSS.getPlatformFontsForNode', {
            nodeId,
          });
          console.log('Loaded timeline fonts:', JSON.stringify(result.fonts));
          expect(
            result.fonts.some(
              (font) =>
                (font.familyName + font.postScriptName).includes('Lexend') &&
                font.isCustomFont,
            ),
          ).toBe(true);
          expect(
            result.fonts.some(
              (font) =>
                (font.familyName + font.postScriptName).includes('Rubik') &&
                font.isCustomFont,
            ),
          ).toBe(true);
          await fonts.detach();
          const row = page.locator('.timeline-event-list-item').first();
          expect((await row.boundingBox())!.height).toBeLessThan(120);
          await expect(row.locator('.activityiconcontainer')).toHaveCSS(
            'width',
            '44px',
          );
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(page.locator('body')).toHaveCSS(
          'background-color',
          'rgb(0, 0, 0)',
        );
        await expect(page.locator('.navbar .nav-link.active')).toHaveCSS(
          'color',
          'rgb(223, 206, 177)',
        );
        await expect(page.locator('button.btn-primary').first()).toHaveCSS(
          'background-color',
          'rgb(21, 21, 22)',
        );
        expect(
          await page.locator('a').evaluateAll((links) =>
            links.every((link) => {
              const [r, g, b] = getComputedStyle(link)
                .color.match(/\d+/g)!
                .map(Number);
              return !(b! > g! + 20 && b! > r!);
            }),
          ),
          `${family}: no blue or purple links`,
        ).toBe(true);
        await expect(page.locator('.modal-content')).toHaveCSS(
          'background-color',
          'rgb(6, 6, 6)',
        );
        for (const img of await page.locator('img').all())
          await expect(img).toHaveCSS('filter', 'none');
        if (family === 'assignment') {
          await expect(page.locator('.activity-header')).toHaveCSS(
            'background-color',
            'rgb(6, 6, 6)',
          );
          await expect(page.locator('#page-header h1')).toHaveCSS(
            'color',
            'rgb(241, 239, 234)',
          );
          await expect(
            page.locator('.contextpage-context-header-content'),
          ).toHaveCSS('background-color', 'rgb(0, 0, 0)');
          await page.locator('.courseindex-link').hover();
          await expect(page.locator('.courseindex-link')).toHaveCSS(
            'color',
            'rgb(223, 206, 177)',
          );
          await expect(page.locator('a.btn-primary').first()).toHaveCSS(
            'color',
            'rgb(241, 239, 234)',
          );
        }
        if (family === 'dashboard') {
          await expect(page.locator('.calendarmonth td').first()).toHaveCSS(
            'background-color',
            'rgb(6, 6, 6)',
          );
          const select = (await page
            .locator('[aria-label="Calendar course"]')
            .boundingBox())!;
          const button = (await page
            .locator('[data-action="new-event-button"]')
            .boundingBox())!;
          const current = (await page
            .locator('.calendar-controls .current')
            .boundingBox())!;
          const navigation = (await page
            .locator('.calendar-controls')
            .boundingBox())!;
          expect(
            Math.abs(
              current.x +
                current.width / 2 -
                navigation.x -
                navigation.width / 2,
            ),
          ).toBeLessThan(2);
          expect(
            Math.abs(
              select.y + select.height / 2 - (button.y + button.height / 2),
            ),
          ).toBeLessThan(2);
        }
        await page.screenshot({
          path: `test-results/${family}-${width}.png`,
          fullPage: true,
        });
        await toggle.click();
        await expect(page.locator('html')).not.toHaveAttribute(
          'data-better-my-courses',
        );
        await page.waitForTimeout(200);
        expect(await measure()).toEqual(before);
        await toggle.click();
        await expect(page.locator('html')).toHaveAttribute(
          'data-better-my-courses',
          'dark',
        );
      }
    }
    await popup.getByRole('button', { name: 'Sage' }).click();
    await expect(popup.locator('#link-color')).toHaveValue('#a8c7b5');
    await expect(page.locator('.modal-body a')).toHaveCSS(
      'color',
      'rgb(168, 199, 181)',
    );
    await popup.reload();
    await expect(popup.locator('#link-color')).toHaveValue('#a8c7b5');
    await popup.locator('#link-color').fill('#000000');
    await popup.locator('#link-color').dispatchEvent('change');
    await expect(popup.locator('#link-color')).not.toHaveValue('#000000');
    await popup.getByRole('button', { name: 'Sage' }).click();
    await page.locator('.navbar .nav-link').last().focus();
    await expect(page.locator('.navbar .nav-link').last()).toHaveCSS(
      'color',
      'rgb(184, 209, 194)',
    );
    await expect(page.locator('.navbar .nav-link').last()).toHaveCSS(
      'background-color',
      'rgb(17, 17, 18)',
    );
    await page.locator('.navbar .nav-link.active').focus();
    await expect(page.locator('.navbar .nav-link.active')).toHaveCSS(
      'color',
      'rgb(184, 209, 194)',
    );
    const narrow = await context.newPage();
    await narrow.goto('https://mycourses.aalto.fi/dashboard');
    await narrow.addStyleTag({ content: css });
    await narrow.addScriptTag({ content: script });
    await expect(narrow.locator('html')).toHaveAttribute(
      'data-better-my-courses',
      'dark',
    );
    // Isolate upstream timeline/footer markup for narrow-component validation;
    // the other synthetic fixture grids are intentionally desktop-only.
    await narrow.evaluate(() => {
      document.body.innerHTML =
        document.querySelector('.block_timeline')!.outerHTML +
        document.querySelector('#page-footer')!.outerHTML;
    });
    for (const width of [768, 390]) {
      await narrow.setViewportSize({ width, height: 900 });
      await narrow.evaluate(() => document.fonts.ready);
      expect(
        await narrow.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const first = narrow.locator('.timeline-event-list-item').first();
      expect(
        (await first.locator('.timeline-action-button').boundingBox())!.width,
      ).toBeGreaterThan(80);
      await narrow.screenshot({
        path: `test-results/timeline-${width}.png`,
        fullPage: true,
      });
    }
    await narrow.close();
    await page.locator('button.btn-primary').first().hover();
    await expect(page.locator('button.btn-primary').first()).toHaveCSS(
      'background-color',
      'rgb(41, 41, 43)',
    );
    await expect(page.locator('button.btn-primary').first()).toHaveCSS(
      'border-top-color',
      'rgb(238, 236, 231)',
    );
    await popup.getByText('Page banners', { exact: true }).click();
    const home = await context.newPage();
    await home.goto('https://mycourses.aalto.fi/home');
    await home.addStyleTag({ content: css });
    await home.addScriptTag({ content: script });
    await expect(home.locator('html')).toHaveAttribute(
      'data-better-my-courses',
      'dark',
    );
    const originalBanner = await home
      .locator('.aaltositepageheader')
      .evaluate((el) => getComputedStyle(el).backgroundImage);
    const themedHomeHeight = await home
      .locator('.aaltositepageheader')
      .evaluate((el) => getComputedStyle(el).height);
    await popup.locator('#home-banner-mode').selectOption('plain');
    await expect(home.locator('.aaltositepageheader')).toHaveCSS(
      'background-image',
      'none',
    );
    await popup.locator('#home-banner-file').setInputFiles({
      name: 'local-banner.png',
      mimeType: 'image/png',
      buffer: await readFile('public/icon/128.png'),
    });
    await expect(home.locator('html')).toHaveAttribute(
      'data-bmc-home-banner',
      'custom',
    );
    await expect(home.locator('.aaltositepageheader')).toHaveCSS(
      'background-image',
      /data:image\/webp;base64/,
    );
    await expect(home.locator('.aaltositepageheader')).toHaveCSS(
      'height',
      themedHomeHeight,
    );
    await toggle.click();
    await expect(home.locator('.aaltositepageheader')).toHaveCSS(
      'background-image',
      originalBanner,
    );
    await toggle.click();
    await expect(home.locator('.aaltositepageheader')).toHaveCSS(
      'background-image',
      /data:image\/webp;base64/,
    );
    await popup.reload();
    await popup.getByText('Page banners', { exact: true }).click();
    await expect(popup.locator('#home-banner-mode')).toHaveValue('custom');
    await popup.locator('#dashboard-banner-mode').selectOption('plain');
    const dashboard = await context.newPage();
    await dashboard.goto('https://mycourses.aalto.fi/dashboard');
    await dashboard.addStyleTag({ content: css });
    await dashboard.addScriptTag({ content: script });
    await expect(dashboard.locator('.aaltouserpageheader')).toHaveCSS(
      'background-image',
      'none',
    );
    await expect(home.locator('.aaltositepageheader')).toHaveCSS(
      'background-image',
      /data:image\/webp;base64/,
    );
    await popup.locator('#dashboard-banner-file').setInputFiles({
      name: 'dashboard-banner.png',
      mimeType: 'image/png',
      buffer: await readFile('public/icon/32.png'),
    });
    await expect(dashboard.locator('.aaltouserpageheader')).toHaveCSS(
      'background-image',
      /data:image\/webp;base64/,
    );
    await expect(page.locator('#page-header')).toHaveCSS(
      'background-image',
      /fixture-image.svg/,
    );
    await popup.getByRole('button', { name: 'Open banner editor' }).click();
    await expect(popup.locator('html')).toHaveAttribute(
      'data-options-opened',
      'true',
    );
    const editor = await context.newPage();
    const editorErrors: string[] = [];
    editor.on('pageerror', (error) => editorErrors.push(error.message));
    await editor.goto('https://mycourses.aalto.fi/options.html');
    await expect(editor.locator('#fit')).toHaveValue('fill');
    await editor.locator('#zoom').fill('2');
    await editor.locator('#zoom').dispatchEvent('input');
    await editor.locator('#page').selectOption('dashboard');
    await expect(editor.locator('#zoom')).toHaveValue('1');
    await editor.locator('#page').selectOption('home');
    await expect(editor.locator('#zoom')).toHaveValue('2');
    const previewBox = (await editor.locator('#preview').boundingBox())!;
    await editor.mouse.move(
      previewBox.x + previewBox.width / 2,
      previewBox.y + previewBox.height / 2,
    );
    await editor.mouse.down();
    await editor.mouse.move(
      previewBox.x + previewBox.width / 2 + 70,
      previewBox.y + previewBox.height / 2 + 20,
    );
    await editor.mouse.up();
    expect(Number(await editor.locator('#x').inputValue())).toBeLessThan(50);
    await editor.getByRole('button', { name: 'Reset framing' }).click();
    await expect(editor.locator('#zoom')).toHaveValue('1');
    await editor.locator('#fit').selectOption('stretch');
    await editor.getByRole('button', { name: 'Save banner' }).click();
    await expect(editor.locator('#status')).toContainText('Banner saved');
    const homeBox = (await home.locator('.aaltositepageheader').boundingBox())!;
    await expect
      .poll(async () => {
        const size = await home
          .locator('.aaltositepageheader')
          .evaluate((el) =>
            getComputedStyle(el).backgroundSize.split(' ').map(parseFloat),
          );
        return (
          Math.abs(size[0]! - (homeBox.width - 2)) +
          Math.abs(size[1]! - (homeBox.height - 2))
        );
      })
      .toBeLessThan(0.03);
    await editor.reload();
    await expect(editor.locator('#fit')).toHaveValue('stretch');
    await editor.locator('#fit').selectOption('fit');
    await editor.getByRole('button', { name: 'Discard changes' }).click();
    await expect(editor.locator('#fit')).toHaveValue('stretch');
    for (const width of [1440, 800, 390]) {
      await editor.setViewportSize({ width, height: 900 });
      expect(
        await editor.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await editor.screenshot({
        path: `test-results/banner-editor-${width}.png`,
        fullPage: true,
      });
    }
    await editor.locator('#fit').selectOption('fill');
    await editor.getByRole('button', { name: 'Save banner' }).click();
    await expect(editor.locator('#status')).toContainText('Banner saved');
    await editor.close();
    expect(editorErrors).toEqual([]);
    for (const width of [1920, 1600, 1440, 1366, 390]) {
      await home.setViewportSize({ width, height: 900 });
      const cards = await home
        .locator('.block_rss_client')
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const box = node.getBoundingClientRect();
            return { x: box.x, y: box.y, width: box.width };
          }),
        );
      if (width > 800) {
        expect(cards[0]!.y).toBe(cards[1]!.y);
        expect(cards[1]!.x).toBeGreaterThan(cards[0]!.x);
      } else {
        expect(cards[1]!.y).toBeGreaterThan(cards[0]!.y);
        expect(cards[1]!.x).toBe(cards[0]!.x);
      }
      expect(
        await home.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await expect(home.locator('.block_rss_client .link a')).toHaveCount(6);
    }
    await home.setViewportSize({ width: 1440, height: 900 });
    await home.screenshot({
      path: 'test-results/home-editorial.png',
      fullPage: true,
    });
    await popup.locator('#home-banner-file').setInputFiles({
      name: 'invalid.svg',
      mimeType: 'image/svg+xml',
      buffer: Buffer.from('<svg/>'),
    });
    await expect(popup.locator('#banner-status')).toHaveText(
      'Choose a PNG, JPEG or WebP image.',
    );
    await popup.getByRole('button', { name: 'Reset Home banner' }).click();
    await expect(home.locator('.aaltositepageheader')).toHaveCSS(
      'background-image',
      originalBanner,
    );
    await popup.getByRole('button', { name: 'Reset Dashboard banner' }).click();
    await expect(dashboard.locator('.aaltouserpageheader')).toHaveCSS(
      'background-image',
      /fixture-image.svg/,
    );
    await popup.screenshot({
      path: 'test-results/popup-banners.png',
      fullPage: true,
    });
    await home.close();
    await dashboard.close();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('.navbar .nav-link').last()).toHaveCSS(
      'transition-duration',
      '0s',
    );
    await page.locator('#text').focus();
    await expect(page.locator('#text')).toHaveCSS(
      'outline-color',
      'rgb(168, 199, 181)',
    );
    await page.evaluate(() => {
      const card = document.createElement('div');
      card.className = 'card';
      card.id = 'dynamic';
      document.body.append(card);
    });
    await expect(page.locator('#dynamic')).toHaveCSS(
      'background-color',
      'rgb(6, 6, 6)',
    );
    await toggle.click();
    await popup.reload();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await popup.screenshot({ path: 'test-results/popup-off.png' });
    await popup.evaluate(() => {
      const api = (
        globalThis as unknown as {
          browser: { storage: { sync: { set: () => Promise<void> } } };
        }
      ).browser;
      api.storage.sync.set = async () => {
        throw new Error('Simulated storage failure');
      };
    });
    await toggle.press('Space');
    await expect(popup.locator('#status')).toHaveText(
      'Could not save. Please try again.',
    );
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(toggle).toBeEnabled();
    await popup.reload();
    await toggle.press('Space');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await browser.close();
  }
});

test('assignment instructions remain readable when authored with inline black text', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const context = await browser.newContext({ forcedColors: 'none' });
    const page = await context.newPage();
    await page.setContent(
      '<html><body class="path-mod path-mod-assign"><section class="activity-header"><div class="activity-description"><p id="instructions" style="color:#212529">Submit one PDF. <strong id="bold" style="color:#000">Up to 10 MB.</strong></p><p id="semantic" class="text-danger">Validation error</p><pre><code><span id="code" style="color:rgb(180,180,180)">const x = 5;</span></code></pre></div></section></body></html>',
    );
    await page.addStyleTag({
      content: await readFile(
        '.output/chrome-mv3/content-scripts/theme.css',
        'utf8',
      ),
    });
    await page.evaluate(() => {
      document.documentElement.dataset.betterMyCourses = 'dark';
    });
    await expect(page.locator('#instructions')).toHaveCSS(
      'color',
      'rgb(241, 239, 234)',
    );
    await expect(page.locator('#bold')).toHaveCSS(
      'color',
      'rgb(241, 239, 234)',
    );
    await expect(page.locator('#semantic')).toHaveCSS(
      'color',
      'rgb(229, 160, 155)',
    );
    await expect(page.locator('#code')).toHaveCSS(
      'color',
      'rgb(180, 180, 180)',
    );
  } finally {
    await browser.close();
  }
});

test('custom banners support fill, fit and stretch without repetition or height changes', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const context = await browser.newContext({ forcedColors: 'none' });
    const css = await readFile(
      '.output/chrome-mv3/content-scripts/theme.css',
      'utf8',
    );
    const image = `url("data:image/png;base64,${(await readFile('public/icon/128.png')).toString('base64')}")`;
    const page = await context.newPage();
    for (const [id, name, attribute, variable] of [
      [
        'page-site-index',
        'aaltositepageheader',
        'data-bmc-home-banner',
        '--bmc-home-banner',
      ],
      [
        'page-my-index',
        'aaltouserpageheader',
        'data-bmc-dashboard-banner',
        '--bmc-dashboard-banner',
      ],
    ]) {
      await page.setContent(
        `<html data-better-my-courses="dark" ${attribute}="custom"><head><style>.${name}{height:180px;background-size:cover!important;background-repeat:repeat;background-image:none}</style></head><body id="${id}" style="margin:0"><header class="${name}"></header></body></html>`,
      );
      await page.evaluate(
        ({ variable, image }) =>
          document.documentElement.style.setProperty(variable, image),
        { variable: variable!, image },
      );
      await page.addStyleTag({ content: css });
      for (const width of [1920, 1440, 1366, 390]) {
        await page.setViewportSize({ width, height: 400 });
        const banner = page.locator('header');
        const height = await banner.evaluate(
          (el) => getComputedStyle(el).height,
        );
        for (const size of ['cover', 'contain', '100% 100%']) {
          await page.evaluate(
            ({ variable, size }) =>
              document.documentElement.style.setProperty(
                `${variable}-size`,
                size,
              ),
            { variable: variable!, size },
          );
          await expect(banner).toHaveCSS('background-size', size);
        }
        await expect(banner).toHaveCSS('background-repeat', 'no-repeat');
        await expect(banner).toHaveCSS('background-position', '50% 50%');
        await expect(banner).toHaveCSS('background-color', 'rgb(0, 0, 0)');
        await expect(banner).toHaveCSS('height', height);
      }
      await page.evaluate(() => {
        delete document.documentElement.dataset.betterMyCourses;
      });
      await expect(page.locator('header')).toHaveCSS(
        'background-size',
        'cover',
      );
    }
  } finally {
    await browser.close();
  }
});
