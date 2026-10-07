import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { courseDestinations, gradesFixture } from './grades-fixture';

test('course navigation retains its design across destinations and grades stay readable', async () => {
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
    await page.route('https://mycourses.aalto.fi/**', async (route) => {
      const url = new URL(route.request().url());
      const destination = courseDestinations.find(
        (d) => d.path === url.pathname + url.search,
      );
      if (!destination) return route.abort();
      const html = gradesFixture(destination)
        .replace('<head>', `<head><style>${bootstrap}</style>`)
        .replace('</head>', `<style>${css}</style></head>`)
        .replace(
          '<html ',
          '<html data-better-my-courses="dark" style="--bmc-user-link:#e79598" ',
        )
        .replace('</body>', `<script>${js}</script></body>`);
      await route.fulfill({ contentType: 'text/html', body: html });
    });
    await page.goto('https://mycourses.aalto.fi' + courseDestinations[0].path);
    let baseline: unknown;
    for (const destination of courseDestinations) {
      if (destination.tab !== 'Course') {
        await page
          .getByRole('navigation', { name: 'Course navigation' })
          .getByRole('link', { name: destination.tab, exact: true })
          .click();
        await expect(page).toHaveURL(
          'https://mycourses.aalto.fi' + destination.path,
        );
      }
      await page.mouse.move(0, 0);
      const selected = page.locator('.secondary-navigation .nav-link.active');
      await expect(selected).toHaveText(destination.tab);
      await expect(selected).toHaveCSS('color', 'rgb(231, 149, 152)');
      await expect(selected).toHaveCSS('background-color', 'rgb(17, 17, 18)');
      await expect(selected).toHaveCSS(
        'border-bottom-color',
        'rgb(231, 149, 152)',
      );
      const styles = await page
        .locator('.secondary-navigation')
        .evaluate((el) => {
          const s = getComputedStyle(el),
            r = el.getBoundingClientRect();
          return {
            x: r.x,
            width: r.width,
            padding: s.padding,
            border: s.border,
            radius: s.borderRadius,
            links: [...el.querySelectorAll('.nav-link')].map((a) => {
              const s = getComputedStyle(a);
              return {
                padding: s.padding,
                radius: s.borderRadius,
                height: a.getBoundingClientRect().height,
              };
            }),
          };
        });
      if (!baseline) baseline = styles;
      else expect(styles).toEqual(baseline);
      const more = page.getByRole('link', { name: 'More', exact: true });
      await more.click();
      await expect(
        page.getByRole('link', { name: 'Reports', exact: true }),
      ).toBeVisible();
      await more.press('Escape');
      await expect(more).toBeFocused();
      await expect(more).toHaveCSS('outline-width', '2px');
      if (destination.tab === 'Grades') {
        const report = page.locator('.user-report-container');
        const exercise = page.locator('tr.cat_2:not(.spacer)').first();
        await page.mouse.move(0, 0);
        await expect(report).toHaveCSS('background-color', 'rgb(6, 6, 6)');
        await expect(page.locator('thead th').first()).toHaveCSS(
          'background-color',
          'rgb(17, 17, 18)',
        );
        await expect(page.locator('th.category').first()).toHaveCSS(
          'background-color',
          'rgb(17, 17, 18)',
        );
        await expect(exercise.locator('.column-grade')).toHaveCSS(
          'background-color',
          'rgb(6, 6, 6)',
        );
        await expect(exercise.locator('.column-grade')).toHaveCSS(
          'box-shadow',
          'none',
        );
        await expect(exercise.locator('.column-grade')).toHaveCSS(
          'color',
          'rgb(241, 239, 234)',
        );
        await expect(page.locator('.gradepass')).toHaveCSS(
          'color',
          'rgb(168, 197, 165)',
        );
        await expect(page.locator('.gradefail')).toHaveCSS(
          'color',
          'rgb(229, 160, 155)',
        );
        await expect(page.locator('.user-grade .icon').first()).toHaveCSS(
          'color',
          'rgb(231, 149, 152)',
        );
        const values = await page.locator('.column-grade').allTextContents();
        const structural = await page.locator('.user-grade').evaluate((el) =>
          [...el.querySelectorAll('[rowspan],[colspan],[headers]')].map(
            (e) => ({
              tag: e.tagName,
              rowspan: e.getAttribute('rowspan'),
              colspan: e.getAttribute('colspan'),
              headers: e.getAttribute('headers'),
            }),
          ),
        );
        const toggle = page.getByRole('button', {
          name: 'Toggle exercises',
          exact: true,
        });
        await toggle.click();
        await expect(exercise).toBeHidden();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await toggle.click();
        await expect(exercise).toBeVisible();
        const details = page.getByRole('button', {
          name: 'Exercise 5 details',
          exact: true,
        });
        await details.click();
        await expect(
          page.getByRole('link', { name: 'Grade details', exact: true }).last(),
        ).toBeVisible();
        await details.press('Escape');
        await expect(details).toBeFocused();
        await page.mouse.move(0, 0);
        await page.screenshot({ path: 'test-results/grades-desktop.png' });
        await page.setViewportSize({ width: 390, height: 844 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
        ).toBe(false);
        expect(
          await report.evaluate((el) => el.scrollWidth > el.clientWidth),
        ).toBe(true);
        await details.click();
        await expect(
          page.getByRole('link', { name: 'Grade details', exact: true }).last(),
        ).toBeVisible();
        await details.press('Escape');
        await report.evaluate((el) => {
          el.scrollLeft = 0;
        });
        await page.screenshot({ path: 'test-results/grades-phone.png' });
        await page.setViewportSize({ width: 1680, height: 1000 });
        await page
          .locator('html')
          .evaluate((el) =>
            (el as HTMLElement).style.setProperty('--bmc-user-link', '#9fbcab'),
          );
        await expect(selected).toHaveCSS('color', 'rgb(159, 188, 171)');
        await expect(page.locator('.user-grade .icon').first()).toHaveCSS(
          'color',
          'rgb(159, 188, 171)',
        );
        expect(await page.locator('.column-grade').allTextContents()).toEqual(
          values,
        );
        expect(
          await page.locator('.user-grade').evaluate((el) =>
            [...el.querySelectorAll('[rowspan],[colspan],[headers]')].map(
              (e) => ({
                tag: e.tagName,
                rowspan: e.getAttribute('rowspan'),
                colspan: e.getAttribute('colspan'),
                headers: e.getAttribute('headers'),
              }),
            ),
          ),
        ).toEqual(structural);
        const original = await page
          .locator('body')
          .evaluate((el) => el.innerHTML);
        await page
          .locator('html')
          .evaluate((el) => el.removeAttribute('data-better-my-courses'));
        await expect(report).toHaveCSS(
          'background-color',
          'rgb(248, 249, 250)',
        );
        await expect(exercise.locator('.column-grade')).toHaveCSS(
          'background-color',
          'rgb(57, 62, 79)',
        );
        await expect(selected).toHaveCSS('border-radius', '0px');
        expect(
          await page.locator('body').evaluate((el) => el.innerHTML),
        ).toEqual(original);
      }
    }
  } finally {
    await browser.close();
  }
});
