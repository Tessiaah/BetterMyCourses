import { test, expect, chromium, type Page } from '@playwright/test';
import { mkdir, mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';

// Actual extension APIs, with synthetic banner artwork and native-size fixtures.
// Both pages use this one browser window; no user profile or site data is read.
test('installed banner editor matches the open Home and Dashboard crop', async () => {
  const root = path.resolve('.tools/browser-profiles');
  await mkdir(root, { recursive: true });
  const profile = await mkdtemp(path.join(root, 'banner-preview-'));
  async function removeProfile() {
    const relative = path.relative(root, path.resolve(profile));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(
        'Refusing to remove a profile outside the test directory',
      );
    }
    await rm(profile, { recursive: true, force: true });
  }
  const extension = path.resolve('.output/chrome-mv3');
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
    viewport: { width: 2560, height: 1100 },
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--enable-unsafe-extension-debugging',
      '--disable-extensions-except=' + extension,
      '--load-extension=' + extension,
    ],
  });
  try {
    await context.route('https://mycourses.aalto.fi/**', (route) => {
      const dashboard = new URL(route.request().url()).pathname.startsWith(
        '/my/',
      );
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}header{box-sizing:border-box;width:calc(100% - 12px);margin:0 6px;height:${dashboard ? 300 : 400}px;border:2px solid #222;background:#777}main{padding:24px}</style></head><body id="${dashboard ? 'page-my-index' : 'page-site-index'}"><header class="${dashboard ? 'aaltouserpageheader' : 'aaltositepageheader'}"></header><main><h1>${dashboard ? 'Dashboard' : 'Home'} fixture</h1></main></body></html>`,
      });
    });
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
      await manager.goto('chrome://extensions/');
      const item = manager
        .locator('extensions-item')
        .filter({ hasText: 'BetterMyCourses' });
      await expect(item).toHaveCount(1);
      id = (await item.getAttribute('id')) ?? undefined;
    }
    expect(id).toBeTruthy();
    await manager.close();
    const home = await context.newPage();
    await home.goto('https://mycourses.aalto.fi/');
    const dashboard = await context.newPage();
    await dashboard.goto('https://mycourses.aalto.fi/my/index.php');
    const editor = await context.newPage();
    const errors: string[] = [];
    for (const page of [home, dashboard, editor])
      page.on('pageerror', (error) => errors.push(error.message));
    await editor.goto(`chrome-extension://${id}/options.html`);
    const source = await editor.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 900;
      const ctx = canvas.getContext('2d')!;
      for (let y = 0; y < 900; y += 100) {
        ctx.fillStyle = y % 200 ? '#e79598' : '#9fbcab';
        ctx.fillRect(0, y, 1600, 100);
        ctx.fillStyle = '#222';
        ctx.font = '32px sans-serif';
        ctx.fillText(`Landmark row ${y}`, 600, y + 60);
      }
      return canvas.toDataURL('image/png');
    });
    await editor.locator('#file').setInputFiles({
      name: 'landmarks.png',
      mimeType: 'image/png',
      buffer: Buffer.from(source.split(',')[1]!, 'base64'),
    });
    await editor
      .getByRole('button', { name: 'Save banner', exact: true })
      .click();
    await expect(editor.locator('#status')).toContainText('Banner saved');

    async function sourceRect(page: Page, selector: string) {
      return page.locator(selector).evaluate((el) => {
        const style = getComputedStyle(el),
          box = el.getBoundingClientRect();
        const width =
          box.width -
          parseFloat(style.borderLeftWidth) -
          parseFloat(style.borderRightWidth);
        const height =
          box.height -
          parseFloat(style.borderTopWidth) -
          parseFloat(style.borderBottomWidth);
        const [w, h] = style.backgroundSize.split(' ').map(parseFloat);
        const [x, y] = style.backgroundPosition.split(' ').map(parseFloat);
        return {
          x: (-(width - w!) * x!) / 100 / (w! / 1600),
          y: (-(height - h!) * y!) / 100 / (h! / 900),
          width: width / (w! / 1600),
          height: height / (h! / 900),
        };
      });
    }
    async function expectMatching(page: Page) {
      await expect
        .poll(async () => {
          const actual = await sourceRect(page, 'header'),
            preview = await sourceRect(editor, '#preview');
          return Math.max(
            ...Object.keys(actual).map((key) =>
              Math.abs(
                actual[key as keyof typeof actual] -
                  preview[key as keyof typeof preview],
              ),
            ),
          );
        })
        // CSS layout rounds fractional preview sizes to subpixels.
        .toBeLessThan(0.5);
    }
    await expect(
      editor.getByText('Preview shape', { exact: true }),
    ).toHaveCount(0);
    await expect(
      editor.getByRole('button', { name: 'Refresh size' }),
    ).toHaveCount(0);
    await expectMatching(home);
    await editor.locator('#page').selectOption('dashboard');
    await expect(editor.locator('#preview-size')).toContainText(
      'Dashboard preview matches the open page',
    );
    await editor.locator('#file').setInputFiles({
      name: 'landmarks.png',
      mimeType: 'image/png',
      buffer: Buffer.from(source.split(',')[1]!, 'base64'),
    });
    await expect(editor.locator('#save')).toBeEnabled();
    await editor.locator('#y').evaluate((el) => {
      (el as HTMLInputElement).value = '58';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await editor.locator('#zoom').evaluate((el) => {
      (el as HTMLInputElement).value = '1.4';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const nativeHeight = await dashboard
      .locator('header')
      .evaluate((el) => el.getBoundingClientRect().height);
    for (const fit of ['fill', 'fit', 'stretch']) {
      await editor.locator('#fit').selectOption(fit);
      await editor
        .getByRole('button', { name: 'Save banner', exact: true })
        .click();
      await expect(editor.locator('#status')).toContainText('Banner saved');
      await expectMatching(dashboard);
      expect(
        await dashboard
          .locator('header')
          .evaluate((el) => el.getBoundingClientRect().height),
      ).toBe(nativeHeight);
    }
    await editor.locator('#fit').selectOption('fill');
    await editor
      .getByRole('button', { name: 'Save banner', exact: true })
      .click();
    await expect(editor.locator('#status')).toContainText('Banner saved');
    await expectMatching(dashboard);
    await editor.screenshot({
      path: 'test-results/banner-matched-editor-desktop.png',
      fullPage: true,
    });
    await dashboard.screenshot({
      path: 'test-results/banner-matched-site-desktop.png',
    });
    await dashboard.setViewportSize({ width: 1366, height: 900 });
    await editor.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(editor.locator('#preview-size')).toContainText('(1350 × 296)');
    await expectMatching(dashboard);
    await expect(editor.locator('#zoom')).toHaveValue('1.4');
    await expect(editor.locator('#y')).toHaveValue('58');
    await editor.setViewportSize({ width: 390, height: 844 });
    await expectMatching(dashboard);
    expect(
      await editor.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await editor.screenshot({
      path: 'test-results/banner-matched-editor-phone.png',
      fullPage: true,
    });
    await dashboard.setViewportSize({ width: 390, height: 844 });
    await editor.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(editor.locator('#preview-size')).toContainText('(374 × 296)');
    await expectMatching(dashboard);
    await editor.screenshot({
      path: 'test-results/banner-matched-editor-phone.png',
      fullPage: true,
    });
    await editor.reload();
    await editor.locator('#page').selectOption('dashboard');
    await expect(editor.locator('#zoom')).toHaveValue('1.4');
    await expectMatching(dashboard);
    await home.close();
    await editor.locator('#page').selectOption('home');
    await expect(editor.locator('#preview-size')).toContainText(
      'Open Home in this browser window',
    );
    await expect(editor.locator('#file')).toBeEnabled();
    const popup = await context.newPage();
    popup.on('pageerror', (error) => errors.push(error.message));
    await popup.setViewportSize({ width: 320, height: 600 });
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await popup
      .locator('.banner-settings')
      .evaluate((el) => ((el as HTMLDetailsElement).open = true));
    const editorButton = popup.getByRole('button', {
      name: 'Open banner editor',
      exact: true,
    });
    await editorButton.scrollIntoViewIfNeeded();
    const buttonBox = (await editorButton.boundingBox())!;
    const legendBox = (await popup
      .locator('[data-banner-page="home"] legend')
      .boundingBox())!;
    expect(legendBox.y - buttonBox.y - buttonBox.height).toBeGreaterThanOrEqual(
      16,
    );
    expect(buttonBox.x).toBe(24);
    expect(buttonBox.width).toBe(272);
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    await popup.screenshot({ path: 'test-results/banner-popup-spacing.png' });
    const manifest = JSON.parse(
      await readFile(path.join(extension, 'manifest.json'), 'utf8'),
    );
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions).toEqual(['https://mycourses.aalto.fi/*']);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await removeProfile();
  }
});
