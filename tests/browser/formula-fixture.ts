import { chromium, expect, type BrowserContextOptions } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const fixture =
  '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/bootstrap.css"><style>body{margin:0}main{max-width:980px;margin:auto;padding:24px}.que{margin:24px 0}.info,.formulation,.outcome{padding:16px}.content{border:1px solid #aaa}</style></head><body class="path-mod-quiz" id="page-mod-quiz-attempt"><main id="region-main"><h1>Quiz workspace</h1><span id="site-math" class="katex">Native site math</span><form id="responseform"><div class="que numerical" id="question"><div class="info">Question 1</div><div class="content"><div class="formulation"><p>Use your own notes to work through this question.</p><label>Answer <input id="answer" name="answer" value="8.5"></label><button type="submit" class="btn btn-secondary">Check</button></div></div></div></form><div style="height:1200px"></div></main></body></html>';

export async function formulaFixture(options: BrowserContextOptions = {}) {
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
    if (location.origin !== 'https://mycourses.aalto.fi') return;
    const settings = 'sync:betterMyCourses.settings';
    if (!localStorage.getItem(settings))
      localStorage.setItem(
        settings,
        JSON.stringify({
          enabled: true,
          studyAssist: true,
          linkColor: '#a8c7b5',
        }),
      );
    const listeners = new Set<(changes: unknown, area: string) => void>();
    const emit = (key: string, value: unknown, area: string) =>
      listeners.forEach((fn) => fn({ [key]: { newValue: value } }, area));
    window.addEventListener('storage', (event) => {
      if (!event.key) return;
      const colon = event.key.indexOf(':');
      emit(
        event.key.slice(colon + 1),
        event.newValue ? JSON.parse(event.newValue) : undefined,
        event.key.slice(0, colon),
      );
    });
    const storage = (area: string) => ({
      async get(key: string) {
        if (
          area === 'local' &&
          key === 'betterMyCourses.formulaLibrary' &&
          document.documentElement.dataset.failRead
        )
          throw new Error('Could not load your library.');
        return {
          [key]: JSON.parse(localStorage.getItem(area + ':' + key) ?? 'null'),
        };
      },
      async set(values: Record<string, unknown>) {
        if (document.documentElement.dataset.failSave)
          throw new Error('Could not save. Please try again.');
        for (const [key, value] of Object.entries(values)) {
          localStorage.setItem(area + ':' + key, JSON.stringify(value));
          emit(key, value, area);
        }
      },
    });
    Object.assign(globalThis, {
      browser: {
        runtime: {
          id: 'fixture-runtime',
          getURL: (file: string) =>
            location.origin + '/' + file.replace(/^\//, ''),
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
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === 'https://mycourses.aalto.fi') {
      if (url.pathname === '/mod/quiz/attempt.php')
        return route.fulfill({ contentType: 'text/html', body: fixture });
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
      if (/^\/(fonts|assets|chunks)\//.test(url.pathname))
        return route.fulfill({
          contentType: url.pathname.endsWith('.js')
            ? 'application/javascript'
            : url.pathname.endsWith('.css')
              ? 'text/css'
              : url.pathname.endsWith('.woff2')
                ? 'font/woff2'
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
  async function open() {
    const page = await context.newPage();
    await page.goto('https://mycourses.aalto.fi/mod/quiz/attempt.php');
    const original = await page
      .locator('#responseform')
      .evaluate((el) => el.innerHTML);
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: js });
    await expect(page.locator('.bmc-study-assist')).toHaveCount(1);
    return { page, original };
  }
  return { browser, context, open, errors, unexpected };
}
