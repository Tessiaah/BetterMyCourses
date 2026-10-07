import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const fileTree = (id: string, name: string) =>
  `<div id="assign_files_tree_${id}"><table class="ygtvtable"><tbody><tr><td class="ygtvcell"><button type="button" aria-label="Expand files" onclick="this.setAttribute('aria-expanded',this.getAttribute('aria-expanded')!=='true')" aria-expanded="false">+</button></td><td class="ygtvcontent"><div class="fileuploadsubmission"><span class="icon fa fa-file-pdf" aria-label="Original PDF icon"></span><a href="/pluginfile.php/${id}/document.pdf" download>${name}</a></div><div class="fileuploadsubmissiontime">18 September, 4:09 PM</div></td></tr></tbody></table></div>`;
const fixture = `<!doctype html><html data-bs-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0}main{max-width:1100px;margin:auto;padding:24px}.generaltable{width:100%;border-collapse:collapse}.generaltable th,.generaltable td{padding:12px;border:1px solid #ddd;text-align:left}.generaltable th{width:30%}.feedbacktable{margin-top:16px}.generaltable tbody tr:nth-child(even) td,.generaltable tbody tr:nth-child(even) th,.feedbacktable td,.feedbacktable th,.ygtvtable td{background:#393e4f!important;box-shadow:inset 0 0 0 9999px #393e4f}.generaltable tr:hover td{background:#fff}.ygtvtable{border-collapse:collapse}.ygtvtable td{padding:4px}.fileuploadsubmission{float:left;min-width:260px}.fileuploadsubmissiontime{float:right;white-space:nowrap}.icon{display:inline-block;width:16px;height:16px;margin-right:8px}.submissionstatussubmitted,.submissiongraded,.earlysubmission{color:#000;background:#cfefcf}.submissionstatusdraft,.submissionlocked{color:#000;background:#efefcf}.latesubmission{color:#000;background:#efcfcf}.avatar{width:40px;height:40px;display:inline-block;border-radius:50%;background:#eee;color:#333;text-align:center;line-height:40px}
</style></head><body class="path-mod path-mod-assign" id="page-mod-assign-view"><main id="region-main"><section class="activity-header"><p>Submit one PDF, up to 10 MB.</p>${fileTree('intro', 'Problem_sheet.pdf')}</section><div class="submissionstatustable"><h2>Submission status</h2><div class="submissionsummarytable"><table class="generaltable table-bordered"><tbody><tr><th scope="row">Submission status</th><td class="submissionstatussubmitted">Submitted for grading</td></tr><tr><th scope="row">Grading status</th><td class="submissiongraded">Graded</td></tr><tr><th scope="row">Time remaining</th><td class="earlysubmission">Submitted 10 minutes early</td></tr><tr><th scope="row">Last modified</th><td>Sunday, 27 September, 11:48 PM</td></tr><tr><th scope="row">File submissions</th><td><div class="assignsubmission_file">${fileTree('submitted', 'Homework.pdf')}</div></td></tr></tbody></table></div></div><div class="feedback"><h2>Feedback</h2><div class="feedbacktable"><table class="generaltable"><tbody><tr><th scope="row">Grade</th><td id="grade">4.00 / 4.00</td></tr><tr><th scope="row">Graded on</th><td>Monday, 28 September, 3:20 PM</td></tr><tr><th scope="row">Graded by</th><td><a href="#grader"><span class="avatar">L</span> Course grader</a></td></tr><tr><th scope="row">Feedback comments</th><td><p>Well done</p><span class="text-danger">Example warning</span></td></tr></tbody></table></div></div><form id="submissionform"><input type="hidden" name="id" value="123"><button class="btn btn-secondary" type="submit">Edit submission</button></form><div id="unrelated"><table style="background:white"><tbody><tr><td style="background:white">Authored diagram table</td></tr></tbody></table></div></main></body></html>`;

test('assignment status, feedback and attachment rows use dark paint while native values and actions survive', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      reducedMotion: 'reduce',
    });
    await page.setContent(fixture);
    await page.addStyleTag({
      content: await readFile(
        'node_modules/bootstrap/dist/css/bootstrap.min.css',
        'utf8',
      ),
    });
    const original = await page.locator('#region-main').innerHTML();
    const geometry = () =>
      page
        .locator('.generaltable th, .generaltable td, .ygtvtable, .icon')
        .evaluateAll((elements) =>
          elements.map((el) => {
            const s = getComputedStyle(el);
            return {
              display: s.display,
              padding: s.padding,
              borderWidth: s.borderWidth,
              rowspan: el.getAttribute('rowspan'),
              colspan: el.getAttribute('colspan'),
            };
          }),
        );
    const nativeGeometry = await geometry();
    await page.addStyleTag({
      content: await readFile(
        '.output/chrome-mv3/content-scripts/theme.css',
        'utf8',
      ),
    });
    await page.locator('html').evaluate((el) => {
      el.setAttribute('data-better-my-courses', 'dark');
      (el as HTMLElement).style.setProperty('--bmc-user-link', '#e79598');
    });
    for (const cell of await page
      .locator('.generaltable th, .generaltable td, .ygtvtable td')
      .all()) {
      await expect(cell).toHaveCSS('background-color', 'rgb(6, 6, 6)');
      await expect(cell).toHaveCSS('box-shadow', 'none');
    }
    await page.locator('#grade').hover();
    await expect(page.locator('#grade')).toHaveCSS(
      'background-color',
      'rgb(6, 6, 6)',
    );
    await expect(page.locator('#grade')).toHaveText('4.00 / 4.00');
    for (const state of [
      'submissionstatussubmitted',
      'submissiongraded',
      'earlysubmission',
    ])
      await expect(page.locator('.' + state)).toHaveCSS(
        'color',
        'rgb(168, 197, 165)',
      );
    await expect(page.locator('.text-danger')).toHaveCSS(
      'color',
      'rgb(229, 160, 155)',
    );
    for (const link of await page.getByRole('link', { name: /\.pdf$/ }).all()) {
      await expect(link).toHaveCSS('color', 'rgb(231, 149, 152)');
      expect(await link.getAttribute('download')).toBe('');
      expect(await link.getAttribute('href')).toContain('/pluginfile.php/');
    }
    await expect(page.locator('.fileuploadsubmissiontime').first()).toHaveCSS(
      'color',
      'rgb(179, 176, 170)',
    );
    await expect(page.locator('.icon').first()).toHaveCSS(
      'color',
      'rgb(231, 149, 152)',
    );
    await expect(page.locator('#unrelated td')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    expect(await geometry()).toEqual(nativeGeometry);
    const expand = page.getByRole('button', { name: 'Expand files' }).first();
    await expand.click();
    await expect(expand).toHaveAttribute('aria-expanded', 'true');
    await expand.click();
    await page.locator('#submissionform').evaluate((el) =>
      el.addEventListener('submit', (event) => {
        event.preventDefault();
        (window as unknown as { submitted: boolean }).submitted = true;
      }),
    );
    await page.getByRole('button', { name: 'Edit submission' }).click();
    expect(
      await page.evaluate(
        () => (window as unknown as { submitted: boolean }).submitted,
      ),
    ).toBe(true);
    await page.screenshot({
      path: 'test-results/assignment-desktop.png',
      fullPage: true,
    });
    await page
      .locator('.submissionstatussubmitted')
      .evaluate((el) => el.setAttribute('class', 'submissionstatusdraft'));
    await expect(page.locator('.submissionstatusdraft')).toHaveCSS(
      'color',
      'rgb(215, 183, 122)',
    );
    await page
      .locator('.submissionstatusdraft')
      .evaluate((el) => el.setAttribute('class', 'latesubmission'));
    await expect(page.locator('.latesubmission')).toHaveCSS(
      'color',
      'rgb(229, 160, 155)',
    );
    await page
      .locator('.latesubmission')
      .evaluate((el) => el.setAttribute('class', 'submissionstatussubmitted'));
    await page
      .locator('html')
      .evaluate((el) =>
        (el as HTMLElement).style.setProperty('--bmc-user-link', '#a8c7b5'),
      );
    await expect(page.locator('.icon').first()).toHaveCSS(
      'color',
      'rgb(168, 199, 181)',
    );
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.screenshot({
      path: 'test-results/assignment-phone.png',
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    const wrapper = page.locator('.submissionsummarytable');
    await wrapper.evaluate((el) => (el.scrollLeft = el.scrollWidth));
    await expect(
      page.getByRole('link', { name: 'Homework.pdf' }),
    ).toBeVisible();
    await page
      .locator('html')
      .evaluate((el) => el.removeAttribute('data-better-my-courses'));
    await expect(page.locator('#grade')).toHaveCSS(
      'background-color',
      'rgb(57, 62, 79)',
    );
    await expect(page.locator('.ygtvcontent').first()).toHaveCSS(
      'background-color',
      'rgb(57, 62, 79)',
    );
    // Browser actionability can leave an inert empty style on a hidden input.
    expect(
      (await page.locator('#region-main').innerHTML()).replace(
        / style=""/g,
        '',
      ),
    ).toBe(original);
  } finally {
    await browser.close();
  }
});
