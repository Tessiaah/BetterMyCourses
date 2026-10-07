import { test, expect, chromium, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { withQuizSidebar } from './quiz-sidebar';

const fixture =
  '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bootstrap.css"><style>body{margin:0}main{max-width:980px;margin:auto;padding:24px}.que{margin:24px 0}.info,.formulation,.outcome{padding:16px}.content{border:1px solid #aaa}#scroll-page{height:1200px}</style></head><body class="path-mod-quiz" id="page-mod-quiz-review"><main id="region-main"><h1>Quiz workspace</h1><form id="responseform"><div class="que multichoice adaptive answersaved" id="first"><div class="info">Question 1</div><div class="content"><div class="formulation"><p>Choose an answer.</p><label><input type="radio" id="answer" name="answer" value="b" checked> Second answer</label><button type="submit" class="btn btn-secondary">Check</button></div><div class="outcome"><div class="feedback"><div class="specificfeedback">Your answer is correct.</div><div class="rightanswer">Released reference answer must not be copied.</div></div><div class="im-feedback"><span class="correctness correct badge">Correct</span></div></div></div></div><div class="que numerical" id="second"><div class="info">Question 2</div><div class="content"><div class="formulation"><label>Value <input id="numeric" name="numeric" type="text" value="8.5"></label></div></div></div></form><div id="scroll-page"></div></main></body></html>';

async function setup(options = {}) {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    ...options,
  });
  const errors: string[] = [];
  const unexpected: string[] = [];
  context.on('page', (page) =>
    page.on('pageerror', (error) => errors.push(error.message)),
  );
  await context.addInitScript(() => {
    const listeners = new Set<(changes: unknown, area: string) => void>();
    const emit = (key: string, value: unknown) =>
      listeners.forEach((fn) => fn({ [key]: { newValue: value } }, 'sync'));
    window.addEventListener('storage', (event) => {
      if (event.key && event.newValue)
        emit(event.key, JSON.parse(event.newValue));
    });
    Object.assign(globalThis, {
      browser: {
        runtime: {
          id: 'fixture-runtime',
          getURL: (file: string) =>
            location.origin + '/' + file.replace(/^\//, ''),
        },
        storage: {
          sync: {
            async get(key: string) {
              return { [key]: JSON.parse(localStorage.getItem(key) ?? 'null') };
            },
            async set(values: Record<string, unknown>) {
              if (document.documentElement.dataset.failSave)
                throw new Error('Synthetic save failure');
              for (const [key, value] of Object.entries(values)) {
                localStorage.setItem(key, JSON.stringify(value));
                emit(key, value);
              }
            },
          },
          local: {
            async get() {
              return {};
            },
          },
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
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === 'https://mycourses.aalto.fi') {
      if (
        /^\/mod\/quiz\/(attempt|review)\.php$/.test(url.pathname) ||
        url.pathname === '/course/view.php'
      )
        return route.fulfill({
          contentType: 'text/html',
          body: withQuizSidebar(fixture),
        });
      if (url.pathname === '/bootstrap.css')
        return route.fulfill({
          contentType: 'text/css',
          body: await readFile(
            'node_modules/bootstrap/dist/css/bootstrap.min.css',
          ),
        });
      if (url.pathname === '/popup.html')
        return route.fulfill({
          contentType: 'text/html',
          body: await readFile('.output/chrome-mv3/popup.html'),
        });
      if (/^\/(fonts|chunks|assets)\//.test(url.pathname))
        return route.fulfill({
          contentType: url.pathname.endsWith('.js')
            ? 'application/javascript'
            : url.pathname.endsWith('.css')
              ? 'text/css'
              : 'font/ttf',
          body: await readFile(path.join('.output/chrome-mv3', url.pathname)),
        });
    }
    unexpected.push(url.href);
    return route.abort();
  });
  const [css, js] = await Promise.all([
    readFile('.output/chrome-mv3/content-scripts/theme.css', 'utf8'),
    readFile('.output/chrome-mv3/content-scripts/theme.js', 'utf8'),
  ]);
  async function open(url = '/mod/quiz/review.php') {
    const page = await context.newPage();
    await page.goto('https://mycourses.aalto.fi' + url);
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: js });
    await expect(page.locator('html')).toHaveAttribute(
      'data-better-my-courses',
      'dark',
    );
    return page;
  }
  return { browser, context, open, errors, unexpected };
}

async function pixel(page: Page, x: number, y: number) {
  return page.locator('.bmc-drawing-canvas').evaluate(
    (el, point) => {
      const canvas = el as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      return [
        ...canvas
          .getContext('2d')!
          .getImageData(
            Math.round(((point.x - rect.left) * canvas.width) / rect.width),
            Math.round(((point.y - rect.top) * canvas.height) / rect.height),
            1,
            1,
          ).data,
      ];
    },
    { x, y },
  );
}

test('quiz-sidebar Study Assist preserves native forms, drawings and sidebar lifecycle', async () => {
  const { browser, context, open, errors, unexpected } = await setup();
  try {
    const page = await open();
    const nativeForm = () =>
      page.locator('#responseform').evaluate((el) => {
        const copy = el.cloneNode(true) as Element;
        // Browser actionability can leave inert empty style attributes on controls.
        for (const empty of copy.querySelectorAll('[style=""]'))
          empty.removeAttribute('style');
        return copy.innerHTML;
      });
    const original = await nativeForm();
    await expect(page.locator('.bmc-study-assist')).toHaveCount(0);
    // Keep the adaptive multiple-choice regression formerly in the answer-viewer test.
    for (const [grade, background] of [
      ['incorrect', 'rgb(36, 20, 20)'],
      ['partiallycorrect', 'rgb(33, 29, 17)'],
      ['correct', 'rgb(16, 28, 21)'],
    ]) {
      await page
        .locator('.correctness')
        .evaluate(
          (el, state) =>
            el.setAttribute('class', 'correctness ' + state + ' badge'),
          grade,
        );
      await expect(page.locator('.outcome')).toHaveCSS(
        'background-color',
        background!,
      );
    }
    const secondTab = await open('/mod/quiz/attempt.php');
    const popup = await context.newPage();
    await popup.goto('https://mycourses.aalto.fi/popup.html');
    const toggle = popup.getByRole('switch', { name: 'Study Assist' });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(popup.locator('#study-assist-description')).toContainText(
      'formula library',
    );
    await toggle.click();
    for (const tab of [page, secondTab])
      await expect(tab.locator('.bmc-study-assist')).toHaveCount(1);
    expect(
      (await page.locator('.bmc-study-assist').allTextContents()).join(''),
    ).not.toContain('Released reference');
    const drawer = page.getByRole('button', {
      name: 'Study Assist',
      exact: true,
    });
    await expect(page.locator('.que .bmc-study-assist')).toHaveCount(0);
    await expect(
      page.locator('#mod_quiz_navblock .bmc-study-assist'),
    ).toHaveCount(1);
    await drawer.focus();
    await page.keyboard.press('Enter');
    const toolbar = page.getByRole('region', { name: 'Drawing tools' });
    await expect(toolbar).toBeVisible();
    await expect(
      toolbar.getByRole('button', { name: 'Pen', exact: true }),
    ).toBeFocused();
    await expect(
      toolbar.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled();
    await toolbar
      .getByRole('button', { name: 'Rose pen color', exact: true })
      .click();
    const initialAnchor = (await page.locator('#region-main').boundingBox())!;
    await page.mouse.move(200, 190);
    await page.mouse.down();
    await page.mouse.move(300, 190, { steps: 12 });
    await page.mouse.up();
    await expect
      .poll(() => pixel(page, 250, 190))
      .toEqual([231, 149, 152, 255]);
    await toolbar.getByRole('button', { name: 'Eraser', exact: true }).click();
    await page.mouse.click(250, 190);
    await expect.poll(async () => (await pixel(page, 250, 190))[3]).toBe(0);
    await toolbar.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect
      .poll(() => pixel(page, 250, 190))
      .toEqual([231, 149, 152, 255]);
    await toolbar.getByRole('button', { name: 'Browse', exact: true }).click();
    await expect(page.locator('.bmc-drawing-canvas')).toHaveCSS(
      'pointer-events',
      'none',
    );
    await page.evaluate(() =>
      document
        .querySelector('#responseform')!
        .addEventListener('submit', (event) => {
          event.preventDefault();
          (
            document.querySelector('#responseform') as HTMLElement
          ).dataset.submitted = 'true';
        }),
    );
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(page.locator('#responseform')).toHaveAttribute(
      'data-submitted',
      'true',
    );
    await expect(page.locator('#numeric')).toHaveValue('8.5');
    await expect(page.locator('#answer')).toBeChecked();
    await page.evaluate(() => window.scrollTo(0, 70));
    await expect
      .poll(() => pixel(page, 250, 120))
      .toEqual([231, 149, 152, 255]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize({ width: 1000, height: 1000 });
    // The page workspace follows its main-content anchor when the viewport changes.
    const resizedAnchor = (await page.locator('#region-main').boundingBox())!;
    await expect
      .poll(() =>
        pixel(
          page,
          250 + resizedAnchor.x - initialAnchor.x,
          190 + resizedAnchor.y - initialAnchor.y,
        ),
      )
      .toEqual([231, 149, 152, 255]);
    await page.screenshot({ path: 'test-results/drawing-desktop.png' });
    await toolbar.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(
      page.locator('.bmc-drawing-canvas, .bmc-drawing-tools'),
    ).toHaveCount(0);
    await expect(drawer).toHaveAttribute('aria-expanded', 'false');
    await expect(drawer).toBeFocused();
    await drawer.click();
    await expect
      .poll(
        async () =>
          (
            await pixel(
              page,
              250 + resizedAnchor.x - initialAnchor.x,
              190 + resizedAnchor.y - initialAnchor.y,
            )
          )[3],
      )
      .toBe(0);
    await toolbar.getByRole('button', { name: 'Browse', exact: true }).click();
    await page
      .locator('#second')
      .evaluate((el) => el.replaceWith(el.cloneNode(true)));
    await expect(page.locator('.bmc-drawing-canvas')).toHaveCount(1);
    await expect(page.locator('.que .bmc-study-assist')).toHaveCount(0);
    await page.locator('#mod_quiz_navblock .content').evaluate((el) => {
      const copy = el.cloneNode(true) as Element;
      copy.querySelector('.bmc-study-assist')?.remove();
      el.replaceWith(copy);
    });
    await expect(drawer).toHaveCount(1);
    await expect(drawer).toHaveAttribute('aria-expanded', 'true');
    await drawer.click();
    await expect(
      page.locator('.bmc-drawing-canvas, .bmc-drawing-tools'),
    ).toHaveCount(0);
    await popup.getByRole('button', { name: 'Sage', exact: true }).click();
    await popup.getByRole('switch', { name: 'Dark theme' }).click();
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-better-my-courses',
    );
    await drawer.click();
    await expect(toolbar).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(toolbar.getByLabel('Pen color', { exact: true })).toHaveValue(
      '#a8c7b5',
    );
    await page.keyboard.press('Escape');
    await expect(
      page.locator('.bmc-drawing-canvas, .bmc-drawing-tools'),
    ).toHaveCount(0);
    await popup.reload();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await popup.evaluate(
      () => (document.documentElement.dataset.failSave = 'true'),
    );
    await toggle.click();
    await expect(popup.locator('#status')).toHaveText(
      'Could not save. Please try again.',
    );
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await popup.evaluate(
      () => delete document.documentElement.dataset.failSave,
    );
    await drawer.click();
    await expect(toolbar).toBeVisible();
    await toggle.click();
    for (const tab of [page, secondTab]) {
      await expect(
        tab.locator('.bmc-study-assist, .bmc-drawing-surface'),
      ).toHaveCount(0);
      await expect(tab.locator('html')).not.toHaveAttribute(
        'data-bmc-study-assist',
      );
    }
    await page
      .locator('#responseform')
      .evaluate((el) => el.removeAttribute('data-submitted'));
    expect(await nativeForm()).toBe(original);
    await toggle.click();
    await popup.getByRole('switch', { name: 'Dark theme' }).click();
    const course = await open('/course/view.php');
    await expect(course.locator('.bmc-study-assist')).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  } finally {
    await browser.close();
  }
});

test('drawing supports touch, custom color, size, clear and phone controls without persistent ink', async () => {
  const { browser, context, open, errors, unexpected } = await setup({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await open('/mod/quiz/attempt.php');
    await page.evaluate(() =>
      localStorage.setItem(
        'betterMyCourses.settings',
        JSON.stringify({ enabled: true, studyAssist: true }),
      ),
    );
    await page.reload();
    // Reload intentionally discards the previous tab's runtime and ink.
    const css = await readFile(
      '.output/chrome-mv3/content-scripts/theme.css',
      'utf8',
    );
    const js = await readFile(
      '.output/chrome-mv3/content-scripts/theme.js',
      'utf8',
    );
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: js });
    await page
      .getByRole('button', { name: 'Study Assist', exact: true })
      .click();
    const toolbar = page.getByRole('region', { name: 'Drawing tools' });
    await expect(toolbar).toBeVisible();
    const color = toolbar.getByLabel('Pen color', { exact: true });
    await color.fill('#ff0000');
    await toolbar.getByLabel('Stroke size').fill('10');
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 100, y: 170, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 160, y: 170, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect.poll(() => pixel(page, 130, 170)).toEqual([255, 0, 0, 255]);
    await expect
      .poll(async () => (await pixel(page, 130, 174))[3])
      .toBeGreaterThan(0);
    await page.screenshot({ path: 'test-results/drawing-phone.png' });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      // The tools follow visualViewport resize on the next browser frame.
      await expect
        .poll(async () => {
          const box = await toolbar.boundingBox();
          return !!box && box.x >= 0 && box.x + box.width <= width;
        })
        .toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      for (const button of await toolbar.locator('button').all())
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await toolbar.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect.poll(async () => (await pixel(page, 100, 170))[3]).toBe(0);
    await expect(
      toolbar.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled();
    await toolbar.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(
      page.locator('.bmc-drawing-canvas, .bmc-drawing-tools'),
    ).toHaveCount(0);
    const stored = await page.evaluate(() =>
      localStorage.getItem('betterMyCourses.settings'),
    );
    expect(stored).not.toMatch(/points|stroke|drawing/i);
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  } finally {
    await browser.close();
  }
});
