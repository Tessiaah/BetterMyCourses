import { test, expect, chromium, type BrowserContext } from '@playwright/test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { withQuizSidebar } from './quiz-sidebar';

test('actual unpacked extension loads, renders formulas and retains its library after browser restart', async () => {
  const root = path.resolve('.tools/browser-profiles');
  await mkdir(root, { recursive: true });
  const profile = await mkdtemp(path.join(root, 'install-smoke-'));
  const extension = path.resolve('.output/chrome-mv3');
  async function removeProfile(): Promise<void> {
    // Only remove this newly created isolated profile within the test workspace.
    const relative = path.relative(root, path.resolve(profile));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error(
        'Refusing to remove a profile outside the test directory.',
      );
    await rm(profile, { recursive: true, force: true });
  }
  let context: BrowserContext | undefined;
  async function launch() {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      executablePath: process.env.BMC_BROWSER_PATH,
      headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        '--enable-unsafe-extension-debugging',
        '--disable-extensions-except=' + extension,
        '--load-extension=' + extension,
      ],
    });
    await context.route('https://mycourses.aalto.fi/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: withQuizSidebar(
          '<!doctype html><html><body class="path-mod-quiz" id="page-mod-quiz-attempt"><main id="region-main"><form id="responseform"><div class="que numerical"><div class="content"><div class="formulation"><p>Fixture question</p><label>Answer <input value="8.5"></label><button type="submit">Check</button></div></div></div></form></main></body></html>',
        ),
      }),
    );
    const manager = await context.newPage();
    const cdp = await context.newCDPSession(manager);
    let id: string | undefined;
    try {
      id = (await cdp.send('Extensions.loadUnpacked', { path: extension })).id;
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.includes('Method not available')
      )
        throw error;
      // Brave honors --load-extension but does not expose this CDP method.
      await manager.goto('chrome://extensions/');
      const item = manager
        .locator('extensions-item')
        .filter({ hasText: 'BetterMyCourses' });
      await expect(item).toHaveCount(1);
      id = (await item.getAttribute('id')) ?? undefined;
    }
    expect(id).toBeTruthy();
    await manager.close();
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('https://mycourses.aalto.fi/mod/quiz/attempt.php');
    await expect(page.locator('html')).toHaveAttribute(
      'data-better-my-courses',
      'dark',
    );
    const popup = await context.newPage();
    await popup.goto('chrome-extension://' + id + '/popup.html');
    return { page, popup, errors };
  }
  try {
    const first = await launch();
    await first.popup.getByRole('switch', { name: 'Study Assist' }).click();
    await first.page
      .getByRole('button', { name: 'Study Assist', exact: true })
      .click();
    await first.page
      .getByRole('tab', { name: 'Formulas', exact: true })
      .click();
    await first.page
      .getByRole('button', { name: 'Place Resistance in series on screen' })
      .click();
    await expect(
      first.page.locator('.bmc-formula-card .katex-html'),
    ).toBeVisible();
    await first.page.evaluate(() => document.fonts.ready);
    expect(
      await first.page.evaluate(() =>
        [...document.fonts].some(
          (font) =>
            font.family.startsWith('BMC_KaTeX_') && font.status === 'loaded',
        ),
      ),
    ).toBe(true);
    await first.page
      .getByRole('button', { name: 'Add formula', exact: true })
      .click();
    await first.page
      .getByLabel('Formula title')
      .fill('Saved install reference');
    await first.page
      .getByLabel('LaTeX', { exact: true })
      .fill(String.raw`f(x)=x^2`);
    await first.page
      .getByRole('button', { name: 'Save formula', exact: true })
      .click();
    await expect(
      first.page.getByRole('button', {
        name: 'Place Saved install reference on screen',
      }),
    ).toBeVisible();
    expect(first.errors).toEqual([]);
    await context!.close();
    context = undefined;

    const restarted = await launch();
    await expect(
      restarted.popup.getByRole('switch', { name: 'Study Assist' }),
    ).toHaveAttribute('aria-checked', 'true');
    await restarted.page
      .getByRole('button', { name: 'Study Assist', exact: true })
      .click();
    await restarted.page
      .getByRole('tab', { name: 'Formulas', exact: true })
      .click();
    await restarted.page
      .getByLabel('Search formulas')
      .fill('Saved install reference');
    await expect(restarted.page.locator('.bmc-formula-card')).toHaveCount(0);
    await restarted.page
      .getByRole('button', { name: 'Place Saved install reference on screen' })
      .click();
    await expect(
      restarted.page.locator('.bmc-formula-card .katex-html'),
    ).toBeVisible();
    await expect(
      restarted.page.getByRole('textbox', { name: 'Answer', exact: true }),
    ).toHaveValue('8.5');
    await restarted.page
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    await expect(
      restarted.page.locator('.bmc-drawing-canvas, .bmc-drawing-tools'),
    ).toHaveCount(0);
    await expect(restarted.page.locator('.bmc-formula-card')).toBeVisible();
    await restarted.page
      .getByRole('button', {
        name: 'Remove Saved install reference from screen',
      })
      .click();
    await expect(restarted.page.locator('.bmc-formula-card')).toHaveCount(0);
    expect(restarted.errors).toEqual([]);
  } finally {
    await context?.close();
    await removeProfile();
  }
});
