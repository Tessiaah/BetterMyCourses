import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const fixture =
  '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}main{max-width:1100px;margin:auto;padding:24px}table{width:100%;border-collapse:collapse;margin-bottom:24px}td,th{border:1px solid #ddd;padding:10px;vertical-align:top}h1{font-size:26px}</style></head><body class="path-course" id="page-course-view-topics"><main id="region-main"><h1>Course schedule</h1><div class="no-overflow"><table id="authored" style="background-color:#fff" border="1"><thead><tr><th>Week</th><th>Topic</th><th>Project</th></tr></thead><tbody><tr><td rowspan="2">04</td><td>Envisioning what users need<br><a href="#pdf">Lecture notes</a></td><td>Storyboarding exercise</td></tr><tr><td>Meeting real people</td><td>Ideas reviewed with users</td></tr><tr id="break" style="background-color:#ecf0f1;color:#212529"><td>07</td><td colspan="2">Semester break / Exam week / No teaching</td></tr><tr><td>08</td><td id="cell-fill" style="background:#ffffff;color:#000000">Prototyping</td><td>Project sketch</td></tr><tr><td>09</td><td bgcolor="#ffffff" id="legacy-fill">Testing with users</td><td>Test plan</td></tr></tbody><tfoot><tr><td>14</td><td id="footer-fill" colspan="2" style="background-color:rgb(236,240,241)">Exam week</td></tr></tfoot></table><table id="bootstrap" class="table table-striped table-hover"><thead><tr><th>Status</th><th>Notes</th></tr></thead><tbody><tr><td id="striped">Regular row</td><td>Visible text</td></tr><tr class="table-light"><td id="light">Light row</td><td>Visible text</td></tr><tr class="table-success"><td id="success">Complete</td><td>Positive status</td></tr><tr class="table-warning"><td id="warning">Pending</td><td>Partial status</td></tr><tr class="table-danger"><td id="danger">Missing</td><td>Negative status</td></tr><tr><td>Another row</td><td id="hover">Hover here</td></tr></tbody></table><table class="calendarmonth" id="calendar"><tbody><tr><td style="background:white" id="calendar-cell">Native calendar</td></tr></tbody></table></div></main></body></html>';

test('authored course table rows and cells stay dark, retain highlighted/semantic states and restore on Off', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    const [css, bootstrap] = await Promise.all([
      readFile('.output/chrome-mv3/content-scripts/theme.css', 'utf8'),
      readFile('node_modules/bootstrap/dist/css/bootstrap.min.css', 'utf8'),
    ]);
    for (const [kind, id, className] of [
      ['course', 'page-course-view-topics', 'path-course'],
      ['page', 'page-mod-page-view', 'path-mod path-mod-page'],
      ['book', 'page-mod-book-view', 'path-mod path-mod-book'],
    ]) {
      await page.setContent(fixture);
      await page.locator('body').evaluate(
        (el, attributes) => {
          el.id = attributes.id!;
          el.setAttribute('class', attributes.className!);
        },
        { id, className },
      );
      await page.addStyleTag({ content: bootstrap });
      const original = await page
        .locator('#region-main')
        .evaluate((el) => el.innerHTML);
      const geometry = () =>
        page
          .locator('#authored, #authored th, #authored td')
          .evaluateAll((nodes) =>
            nodes.map((el) => {
              const style = getComputedStyle(el);
              return {
                padding: style.padding,
                borderWidth: style.borderWidth,
                display: style.display,
                collapse: style.borderCollapse,
                align: style.verticalAlign,
                colspan: el.getAttribute('colspan'),
                rowspan: el.getAttribute('rowspan'),
              };
            }),
          );
      const nativeGeometry = await geometry();
      await page.addStyleTag({ content: css });
      await page.locator('html').evaluate((el) => {
        el.setAttribute('data-better-my-courses', 'dark');
        (el as HTMLElement).style.setProperty('--bmc-user-link', '#e79598');
      });
      for (const selector of [
        '#break',
        '#break td',
        '#cell-fill',
        '#legacy-fill',
        '#footer-fill',
        '#light',
      ]) {
        for (const cell of await page.locator(selector).all()) {
          await expect(cell).toHaveCSS('background-color', 'rgb(17, 17, 18)');
          await expect(cell).toHaveCSS('color', 'rgb(241, 239, 234)');
        }
      }
      await expect(
        page.locator('#authored tbody tr').first().locator('td').first(),
      ).toHaveCSS('background-color', 'rgb(6, 6, 6)');
      for (const [cell, background] of [
        ['#success', 'rgb(16, 28, 21)'],
        ['#warning', 'rgb(33, 29, 17)'],
        ['#danger', 'rgb(36, 20, 20)'],
      ]) {
        await expect(page.locator(cell!)).toHaveCSS(
          'background-color',
          background!,
        );
        await expect(page.locator(cell!)).toHaveCSS('box-shadow', 'none');
      }
      await expect(page.locator('#striped')).toHaveCSS(
        'background-color',
        'rgb(3, 3, 3)',
      );
      await page.locator('#hover').hover();
      await expect(page.locator('#hover')).toHaveCSS(
        'background-color',
        'rgb(17, 17, 18)',
      );
      await expect(page.getByRole('link', { name: 'Lecture notes' })).toHaveCSS(
        'color',
        'rgb(231, 149, 152)',
      );
      // This new authored-table component does not take over calendar surfaces.
      await expect(page.locator('#calendar-cell')).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)',
      );
      expect(await geometry()).toEqual(nativeGeometry);
      if (kind === 'course')
        await page.screenshot({
          path: 'test-results/course-tables-desktop.png',
        });
      await page.setViewportSize({ width: 390, height: 1100 });
      await expect(page.locator('#footer-fill')).toHaveCSS(
        'background-color',
        'rgb(17, 17, 18)',
      );
      if (kind === 'course')
        await page.screenshot({ path: 'test-results/course-tables-phone.png' });
      await page
        .locator('html')
        .evaluate((el) => el.removeAttribute('data-better-my-courses'));
      await expect(page.locator('#break')).toHaveCSS(
        'background-color',
        'rgb(236, 240, 241)',
      );
      await expect(page.locator('#cell-fill')).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)',
      );
      expect(
        await page.locator('#region-main').evaluate((el) => el.innerHTML),
      ).toBe(original);
      await page.setViewportSize({ width: 1440, height: 1100 });
    }
    // Quiz diagrams/feedback tables keep their existing component ownership.
    await page.setContent(fixture);
    await page.locator('body').evaluate((el) => {
      el.id = 'page-mod-quiz-attempt';
      el.setAttribute('class', 'path-mod path-mod-quiz');
    });
    await page.addStyleTag({ content: css });
    await page
      .locator('html')
      .evaluate((el) => el.setAttribute('data-better-my-courses', 'dark'));
    await expect(page.locator('#cell-fill')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
  } finally {
    await browser.close();
  }
});
