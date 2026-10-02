import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

// Moodle's timer template/Boost positioning, plus the warning in the screenshot.
const fixture = `<!doctype html><html><head><style>
body{margin:0}main{max-width:1000px;margin:auto;padding:24px}
#quiz-timer-wrapper{display:none;position:sticky;justify-content:end;top:65px;z-index:1020}
#quiz-timer-wrapper #quiz-timer{border:1px solid red;background-color:white}
#quiz-timer-wrapper #quiz-timer.timeleft10{background:#ff8888;color:black}
</style></head><body class="path-mod-quiz" id="page-mod-quiz-attempt"><main>
<h1>Quiz timer</h1><div id="quiz-timer-wrapper" class="mb-2">
<div id="quiz-timer" class="quiz-timer-inner py-1 px-2 ms-auto" role="timer" aria-atomic="true" aria-relevant="text"><div>To make sure all answers are saved<br>always finish your attempt before time is up!</div>Time left<span id="quiz-time-left">0:10:19</span></div>
<button type="button" class="btn btn-secondary btn-small ms-1" id="toggle-timer" aria-controls="quiz-timer" aria-describedby="quiz-timer">Hide</button></div>
<form id="responseform"><label for="answer">Answer <input id="answer" type="text" value="8.5"></label></form>
</main></body></html>`;

test('quiz timer groups Hide inside its dark panel without overriding native visibility or deadline state', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const [css, bootstrap] = await Promise.all([
      readFile('.output/chrome-mv3/content-scripts/theme.css', 'utf8'),
      readFile('node_modules/bootstrap/dist/css/bootstrap.min.css', 'utf8'),
    ]);
    await page.setContent(fixture);
    await page.addStyleTag({ content: bootstrap });
    const original = await page.locator('main').evaluate((el) => el.innerHTML);
    await page.addStyleTag({ content: css });
    await page.locator('html').evaluate((el) => {
      el.setAttribute('data-better-my-courses', 'dark');
      (el as HTMLElement).style.setProperty('--bmc-user-link', '#a8c7b5');
    });
    const panel = page.locator('#quiz-timer-wrapper');
    const timer = page.locator('#quiz-timer');
    const clock = page.locator('#quiz-time-left');
    const toggle = page.locator('#toggle-timer');
    // Timers remain absent until Moodle's timer script initializes them.
    await expect(panel).toBeHidden();
    await panel.evaluate((el) => ((el as HTMLElement).style.display = 'flex'));
    await expect(panel).toHaveCSS('background-color', 'rgb(8, 8, 8)');
    await expect(timer).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(timer).toHaveCSS('border-top-width', '0px');
    await expect(clock).toHaveCSS('color', 'rgb(168, 199, 181)');
    await expect(timer).toHaveAttribute('role', 'timer');
    await expect(toggle).toHaveAttribute('aria-controls', 'quiz-timer');
    await expect(toggle).toHaveAttribute('type', 'button');
    await expect(panel).toHaveCSS('position', 'sticky');
    await expect(panel).toHaveCSS('top', '65px');
    for (const width of [1440, 800, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const [box, button] = await Promise.all([
        panel.boundingBox(),
        toggle.boundingBox(),
      ]);
      expect(button!.x + button!.width).toBeLessThan(box!.x + box!.width - 10);
      expect(button!.y).toBeGreaterThanOrEqual(box!.y + 14);
      expect(button!.y - box!.y).toBeLessThanOrEqual(20);
      expect(button!.height).toBeGreaterThanOrEqual(44);
      expect(button!.y + button!.height).toBeLessThan(
        box!.y + box!.height - 10,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `test-results/quiz-timer-${width}.png`,
          caret: 'initial',
        });
    }
    await toggle.focus();
    await expect(toggle).toHaveCSS('outline-width', '2px');
    await expect(toggle).toHaveCSS('outline-color', 'rgb(168, 199, 181)');
    // Simulate the site's existing handler; the extension adds no timer JS.
    await page.evaluate(() =>
      document.querySelector('#toggle-timer')!.addEventListener('click', () => {
        const clock = document.querySelector('#quiz-time-left')!;
        clock.toggleAttribute('hidden');
        document.querySelector('#toggle-timer')!.textContent =
          clock.hasAttribute('hidden') ? 'Show' : 'Hide';
      }),
    );
    await page.keyboard.press('Enter');
    await expect(clock).toBeHidden();
    await expect(toggle).toHaveText('Show');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(clock).toBeVisible();
    await expect(toggle).toHaveText('Hide');
    await timer.evaluate((el) => el.classList.add('timeleft10'));
    await toggle.evaluate((el) => ((el as HTMLButtonElement).disabled = true));
    await expect(panel).toHaveCSS('background-color', 'rgb(36, 20, 20)');
    await expect(panel).toHaveCSS('border-color', 'rgb(229, 160, 155)');
    await expect(clock).toHaveCSS('color', 'rgb(229, 160, 155)');
    await expect(toggle).toBeDisabled();
    await expect(clock).toBeVisible();
    await clock.evaluate((el) => (el.textContent = '0:00:10'));
    await expect(clock).toHaveText('0:00:10');
    await page.screenshot({
      path: 'test-results/quiz-timer-urgent.png',
      caret: 'initial',
    });
    await timer.evaluate((el) => el.classList.remove('timeleft10'));
    await toggle.evaluate((el) => {
      (el as HTMLButtonElement).disabled = false;
      el.removeAttribute('disabled');
    });
    await clock.evaluate((el) => (el.textContent = '0:10:19'));
    await panel.evaluate((el) => el.removeAttribute('style'));
    await page
      .locator('html')
      .evaluate((el) => el.removeAttribute('data-better-my-courses'));
    await expect(panel).toBeHidden();
    expect(await page.locator('main').evaluate((el) => el.innerHTML)).toBe(
      original,
    );
    // Original theme paint and spacing return without changing its markup.
    await panel.evaluate((el) => ((el as HTMLElement).style.display = 'flex'));
    await expect(timer).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(timer).toHaveCSS('border-color', 'rgb(255, 0, 0)');
    await expect(page.locator('#answer')).toHaveValue('8.5');
  } finally {
    await browser.close();
  }
});
