import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { courseChromeFixture } from './course-chrome-fixture';

for (const kind of ['course', 'section', 'forum'] as const) {
  test(`${kind} chrome aligns bars and contains announcement controls`, async () => {
    const browser = await chromium.launch({
      executablePath: process.env.BMC_BROWSER_PATH,
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 1680, height: 1000 },
        reducedMotion: 'reduce',
      });
      const [css, bootstrap, js] = await Promise.all([
        readFile('.output/chrome-mv3/content-scripts/theme.css', 'utf8'),
        readFile('node_modules/bootstrap/dist/css/bootstrap.min.css', 'utf8'),
        readFile(
          'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js',
          'utf8',
        ),
      ]);
      await page.setContent(courseChromeFixture(kind));
      await page.addStyleTag({ content: bootstrap });
      await page.addScriptTag({ content: js });
      // Bootstrap adds aria-expanded and an empty style on first menu use.
      // Establish that native baseline before checking our CSS is reversible.
      const nativeMenu = page.locator('[data-bs-toggle="dropdown"]').first();
      if (await nativeMenu.count()) {
        await nativeMenu.click();
        await nativeMenu.press('Escape');
      }
      const original = await page
        .locator('body')
        .evaluate((el) => el.innerHTML);
      const originalRects = await page
        .locator(
          '#page-header, #section-title, .secondary-navigation, #page-content',
        )
        .evaluateAll((els) =>
          els.map((el) => el.getBoundingClientRect().toJSON()),
        );
      const banner = (await page.locator('#page-header').count())
        ? await page
            .locator('#page-header')
            .evaluate((el) => getComputedStyle(el).backgroundImage)
        : undefined;
      await page.mouse.move(0, 0);
      await page.addStyleTag({ content: css });
      await page.locator('html').evaluate((el) => {
        el.setAttribute('data-better-my-courses', 'dark');
        (el as HTMLElement).style.setProperty('--bmc-user-link', '#e79598');
      });
      if (kind !== 'forum') {
        const rects = await page
          .locator(
            '.contextpage-context-header-content, .breadcrumb-button, .secondary-navigation, #page-content',
          )
          .evaluateAll((els) =>
            els.map((el) => {
              const r = el.getBoundingClientRect();
              return { x: r.x, width: r.width };
            }),
          );
        for (const r of rects) {
          expect(Math.abs(r.x - rects[0]!.x)).toBeLessThan(1);
          expect(Math.abs(r.width - rects[0]!.width)).toBeLessThan(1);
        }
        expect(
          await page
            .locator('#page-header')
            .evaluate((el) => getComputedStyle(el).backgroundImage),
        ).toBe(banner);
        await expect(page.locator('.header-courseend')).toBeHidden();
        if (kind === 'course') {
          const selected = page.getByRole('link', {
            name: 'Course',
            exact: true,
          });
          await expect(selected).toHaveCSS('color', 'rgb(231, 149, 152)');
          await expect(selected).toHaveCSS(
            'border-bottom-color',
            'rgb(231, 149, 152)',
          );
          const more = page.getByRole('link', { name: 'More', exact: true });
          await more.click();
          await expect(
            page.getByRole('link', { name: 'Reports' }),
          ).toBeVisible();
          await more.press('Escape');
          await expect(more).toBeFocused();
          await expect(more).toHaveCSS('outline-width', '2px');
        }
      } else {
        const bars = await page
          .locator('.breadcrumb-button, #page-content')
          .evaluateAll((els) =>
            els.map((el) => {
              const r = el.getBoundingClientRect();
              return { x: r.x, width: r.width };
            }),
          );
        expect(bars[0]).toEqual(bars[1]);
        await expect(page.locator('.breadcrumb-button')).toHaveCSS(
          'background-color',
          'rgb(0, 0, 0)',
        );
        const rows = page.locator('tr[data-region="discussion-list-item"]');
        await expect(rows.first().locator('td').first()).toHaveCSS(
          'background-color',
          'rgb(6, 6, 6)',
        );
        await expect(rows.nth(1).locator('td').first()).toHaveCSS(
          'background-color',
          'rgb(3, 3, 3)',
        );
        await expect(page.locator('thead th').first()).toHaveCSS(
          'background-color',
          'rgb(17, 17, 18)',
        );
        for (const row of await rows.all()) {
          for (const selector of [
            'td:first-child',
            '[data-container="discussion-summary-actions"]',
          ]) {
            const rects = await row.locator(selector).evaluate((el) => ({
              cell: el.getBoundingClientRect().toJSON(),
              button: el
                .querySelector('[role="button"]')!
                .getBoundingClientRect()
                .toJSON(),
            }));
            expect(rects.button.x - rects.cell.x).toBeGreaterThanOrEqual(11);
            expect(
              rects.cell.right - rects.button.right,
            ).toBeGreaterThanOrEqual(11);
          }
          await expect(
            row.getByRole('button', { name: 'Star discussion' }),
          ).toHaveCSS('color', 'rgb(231, 149, 152)');
        }
        const actions = rows
          .first()
          .getByRole('button', { name: 'Discussion actions' });
        await actions.click();
        await expect(
          rows.first().getByRole('link', { name: 'Subscribe' }),
        ).toBeVisible();
        await actions.press('Escape');
        await expect(actions).toBeFocused();
        await expect(actions).toHaveCSS('outline-width', '2px');
      }
      await expect(page.locator('.block_news_items .post').nth(1)).toHaveCSS(
        'padding-top',
        '16px',
      );
      await expect(page.locator('.block_news_items .info a').first()).toHaveCSS(
        'color',
        'rgb(231, 149, 152)',
      );
      await page.locator('html').evaluate((el) => {
        (el as HTMLElement).style.setProperty('--bmc-user-link', '#9fbcab');
      });
      await expect(page.locator('.block_news_items .info a').first()).toHaveCSS(
        'color',
        'rgb(159, 188, 171)',
      );
      if (kind === 'course') {
        await expect(
          page.getByRole('link', { name: 'Course', exact: true }),
        ).toHaveCSS('color', 'rgb(159, 188, 171)');
      } else if (kind === 'forum') {
        await expect(
          page.getByRole('button', { name: 'Star discussion' }).first(),
        ).toHaveCSS('color', 'rgb(159, 188, 171)');
      }
      await page.screenshot({
        path: `test-results/${kind}-chrome-desktop.png`,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      if (kind === 'forum') {
        expect(
          await page
            .locator('.no-overflow')
            .evaluate((el) => el.scrollWidth > el.clientWidth),
        ).toBe(true);
        const actions = page
          .getByRole('button', { name: 'Discussion actions' })
          .first();
        await actions.click();
        await expect(
          page.getByRole('link', { name: 'Subscribe' }).first(),
        ).toBeVisible();
        await actions.press('Escape');
        expect(
          await page.locator('.no-overflow').evaluate((el) => el.scrollLeft),
        ).toBeGreaterThan(0);
        await page.locator('.no-overflow').evaluate((el) => {
          el.scrollLeft = 0;
        });
      } else {
        const widths = await page
          .locator(
            '.contextpage-context-header-content, .breadcrumb-button, .secondary-navigation, #page-content',
          )
          .evaluateAll((els) =>
            els.map((el) => el.getBoundingClientRect().width),
          );
        for (const width of widths)
          expect(Math.abs(width - widths[0]!)).toBeLessThan(1);
      }
      await page.screenshot({ path: `test-results/${kind}-chrome-phone.png` });
      await page.setViewportSize({ width: 1680, height: 1000 });
      await page
        .locator('html')
        .evaluate((el) => el.removeAttribute('data-better-my-courses'));
      expect(await page.locator('body').evaluate((el) => el.innerHTML)).toBe(
        original,
      );
      expect(
        await page
          .locator(
            '#page-header, #section-title, .secondary-navigation, #page-content',
          )
          .evaluateAll((els) =>
            els.map((el) => el.getBoundingClientRect().toJSON()),
          ),
      ).toEqual(originalRects);
    } finally {
      await browser.close();
    }
  });
}
