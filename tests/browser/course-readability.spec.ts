import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const course = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0}main{max-width:1100px;margin:auto;padding:24px}.activity-item{padding:24px;margin:24px 0}.activity-grid{display:grid;grid-template-columns:64px 1fr;gap:16px}.activityiconcontainer{width:52px;height:52px;border-radius:50%;background:#ffcd00}.activity-altcontent{grid-column:2;border-top:1px solid #ddd;padding-top:16px}.contentwithoutlink{color:#212529}.activity-item:hover{background:#eee}.description-inner{background:#fff}.dimmed_text{color:#333!important}
</style></head><body class="path-course" id="page-course-view-topics"><main id="region-main"><div class="course-content"><section class="section course-section">
<div class="summary"><p>Related material: <a href="#notes"><span id="dark-link" style="color: #333333">Sections 5.3 and 5.4</span></a>.</p><p><font id="legacy-text" color="#000000">Complete the exercises below.</font></p><p class="dimmed_text" id="dimmed">Optional reference material</p><p id="emphasis" style="color:#ff4437">Instructor emphasis remains red.</p></div>
<div class="activity-item" id="assignment"><div class="activity-grid"><div class="activityiconcontainer" id="native-icon" aria-label="Original icon"></div><div><a href="#assignment">Problem sheet</a><p>Due: Sunday, 11:59 PM</p></div><div class="activity-altcontent activity-description"><div class="description-inner"><div class="contentwithoutlink"><p id="instructions" style="color:#212529">Submit a single PDF, <strong id="bold" style="color: rgb(0, 0, 0)">up to 10 MB.</strong></p><p class="text-danger"><span id="semantic" style="color:#333">Required submission</span></p><pre><code><span id="code" style="color:#333">const x = 5;</span></code></pre><mjx-container><span id="math" style="color:#333">Native math</span></mjx-container><p id="painted" style="background:#000;color:#ff4437">Authored colored notice</p></div></div></div></div></div>
</section></div></main></body></html>`;

const summary = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0}main{max-width:1100px;margin:auto;padding:24px}.generaltable{width:100%;border-collapse:collapse}.generaltable th,.generaltable td{padding:16px;border-bottom:1px solid #ddd}[data-bs-theme=dark] .generaltable thead th,[data-bs-theme=dark] .generaltable tbody tr:nth-child(even) td{background-color:#393e4f!important;box-shadow:inset 0 0 0 9999px #393e4f}.generaltable tr:hover td{background:#eee}
</style></head><body class="path-mod path-mod-quiz" id="page-mod-quiz-summary"><main id="region-main"><h1>Practice quiz</h1><h2>Summary of attempt</h2><table class="generaltable quizsummaryofattempt boxaligncenter"><thead><tr><th scope="col">Question</th><th scope="col">Status</th><th scope="col">Marks</th></tr></thead><tbody><tr class="quizsummaryheading"><th colspan="3">Section 1</th></tr><tr class="quizsummary1 answersaved"><td><a href="#q1" onclick="window.questionOpened=true;return false">1</a></td><td>Answer saved</td><td>0.50</td></tr><tr class="quizsummary2 answersaved"><td><a href="#q2">2</a></td><td>Answer saved</td><td>0.50</td></tr></tbody></table><form id="return-form"><input type="hidden" name="attempt" value="123"><button type="submit" class="btn btn-secondary">Return to attempt</button></form></main></body></html>`;

test('course prose stays readable and description paint follows the hovered card', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
      reducedMotion: 'reduce',
    });
    await page.setContent(course);
    await page.addStyleTag({
      content: await readFile(
        'node_modules/bootstrap/dist/css/bootstrap.min.css',
        'utf8',
      ),
    });
    const original = await page.locator('#region-main').innerHTML();
    const nativeIcon = await page.locator('#native-icon').boundingBox();
    await page.addStyleTag({
      content: await readFile(
        '.output/chrome-mv3/content-scripts/theme.css',
        'utf8',
      ),
    });
    await page.locator('html').evaluate((el) => {
      el.setAttribute('data-better-my-courses', 'dark');
      (el as HTMLElement).style.setProperty('--bmc-user-link', '#e79598');
      (el as HTMLElement).style.setProperty('--bmc-user-link-hover', '#f1b7b9');
    });
    for (const id of ['instructions', 'bold', 'legacy-text'])
      await expect(page.locator('#' + id)).toHaveCSS(
        'color',
        'rgb(241, 239, 234)',
      );
    await expect(page.locator('#dimmed')).toHaveCSS(
      'color',
      'rgb(179, 176, 170)',
    );
    await expect(page.locator('#dark-link')).toHaveCSS(
      'color',
      'rgb(231, 149, 152)',
    );
    await page.locator('a[href="#notes"]').hover();
    await expect(page.locator('#dark-link')).toHaveCSS(
      'color',
      'rgb(241, 183, 185)',
    );
    await page.locator('#assignment').hover();
    await expect(page.locator('#assignment')).toHaveCSS(
      'background-color',
      'rgb(17, 17, 18)',
    );
    for (const selector of ['.activity-description', '.description-inner'])
      await expect(page.locator(selector)).toHaveCSS(
        'background-color',
        'rgba(0, 0, 0, 0)',
      );
    await expect(page.locator('#semantic')).toHaveCSS(
      'color',
      'rgb(229, 160, 155)',
    );
    for (const id of ['emphasis', 'painted'])
      await expect(page.locator('#' + id)).toHaveCSS(
        'color',
        'rgb(255, 68, 55)',
      );
    for (const id of ['code', 'math'])
      await expect(page.locator('#' + id)).toHaveCSS(
        'color',
        'rgb(51, 51, 51)',
      );
    expect((await page.locator('#native-icon').boundingBox())!.width).toBe(
      nativeIcon!.width,
    );
    expect((await page.locator('#native-icon').boundingBox())!.height).toBe(
      nativeIcon!.height,
    );
    await page.screenshot({
      path: 'test-results/course-readable-desktop.png',
      fullPage: true,
    });
    await page
      .locator('html')
      .evaluate((el) =>
        (el as HTMLElement).style.setProperty('--bmc-user-link', '#a8c7b5'),
      );
    await expect(page.locator('#dark-link')).toHaveCSS(
      'color',
      'rgb(168, 199, 181)',
    );
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.screenshot({
      path: 'test-results/course-readable-phone.png',
      fullPage: true,
    });
    await page
      .locator('html')
      .evaluate((el) => el.removeAttribute('data-better-my-courses'));
    await expect(page.locator('#instructions')).toHaveCSS(
      'color',
      'rgb(33, 37, 41)',
    );
    await expect(page.locator('#dark-link')).toHaveCSS(
      'color',
      'rgb(51, 51, 51)',
    );
    await expect(page.locator('.description-inner')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    expect(await page.locator('#region-main').innerHTML()).toBe(original);
  } finally {
    await browser.close();
  }
});

test('attempt summary retains statuses, marks and native controls without pale cells', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 800 },
      reducedMotion: 'reduce',
    });
    await page.setContent(summary);
    await page.addStyleTag({
      content: await readFile(
        'node_modules/bootstrap/dist/css/bootstrap.min.css',
        'utf8',
      ),
    });
    await page
      .locator('html')
      .evaluate((el) => el.setAttribute('data-bs-theme', 'dark'));
    const original = await page.locator('#region-main').innerHTML();
    await page.addStyleTag({
      content: await readFile(
        '.output/chrome-mv3/content-scripts/theme.css',
        'utf8',
      ),
    });
    await page
      .locator('html')
      .evaluate((el) => el.setAttribute('data-better-my-courses', 'dark'));
    for (const cell of await page.locator('tbody th, tbody td').all()) {
      await expect(cell).toHaveCSS('background-color', 'rgb(6, 6, 6)');
      await expect(cell).toHaveCSS('box-shadow', 'none');
      await expect(cell).toHaveCSS('color', 'rgb(241, 239, 234)');
    }
    for (const heading of await page.locator('thead th').all())
      await expect(heading).toHaveCSS('background-color', 'rgb(17, 17, 18)');
    await page.locator('.quizsummary1').hover();
    await expect(page.locator('.quizsummary1 td').first()).toHaveCSS(
      'background-color',
      'rgb(6, 6, 6)',
    );
    await page.getByRole('link', { name: '1', exact: true }).click();
    expect(
      await page.evaluate(
        () => (window as unknown as { questionOpened: boolean }).questionOpened,
      ),
    ).toBe(true);
    await page.locator('#return-form').evaluate((el) =>
      el.addEventListener('submit', (event) => {
        event.preventDefault();
        el.setAttribute('data-returned', 'true');
      }),
    );
    await page.getByRole('button', { name: 'Return to attempt' }).click();
    await expect(page.locator('#return-form')).toHaveAttribute(
      'data-returned',
      'true',
    );
    await page
      .locator('#return-form')
      .evaluate((el) => el.removeAttribute('data-returned'));
    expect(await page.locator('input[name="attempt"]').inputValue()).toBe(
      '123',
    );
    await expect(page.locator('.quizsummary1')).toContainText('0.50');
    await page.screenshot({ path: 'test-results/attempt-summary-desktop.png' });
    await page.setViewportSize({ width: 390, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({ path: 'test-results/attempt-summary-phone.png' });
    await page
      .locator('html')
      .evaluate((el) => el.removeAttribute('data-better-my-courses'));
    await expect(page.locator('thead th').first()).toHaveCSS(
      'background-color',
      'rgb(57, 62, 79)',
    );
    // Playwright's hidden-input read can leave an inert empty style attribute.
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
