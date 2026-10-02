import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Only synthetic released feedback; no student content or live quiz requests.
const fixture = `<!doctype html><html><head><link rel="stylesheet" href="/bootstrap.css"><style>
body{margin:0}main{max-width:980px;margin:auto;padding:24px}.que{margin:24px 0}.info,.formulation,.outcome{padding:16px}
.content{border:1px solid #aaa}.mjx-assistive-mml{position:absolute;clip:rect(1px,1px,1px,1px);width:1px;height:1px;overflow:hidden}
</style></head><body class="path-mod-quiz" id="page-mod-quiz-review"><main id="region-main"><h1>Study Assist fixture</h1><form id="responseform">
<div class="que multichoice adaptive answersaved" id="released"><div class="info">Question 1</div><div class="content">
<div class="formulation"><p>Choose an answer.</p><label for="answer"><input type="radio" id="answer" name="answer" value="b" checked> Second answer</label><button type="submit" class="btn btn-secondary">Check</button></div>
<div class="outcome"><div class="feedback"><div class="specificfeedback">Your answer is correct.</div><div class="rightanswer">The correct answer is: <strong>2<sub>P</sub></strong><span hidden>HIDDEN_CHILD_SECRET</span><input type="hidden" value="HIDDEN_VALUE_SECRET"></div></div><div class="im-feedback"><span class="correctness correct badge">Correct</span></div></div>
</div></div>
<div class="que numerical complete" id="math-question"><div class="info">Question 2</div><div class="content"><div class="formulation"><label for="numeric">Value <input id="numeric" name="numeric" type="text" value="8.5"></label></div><div class="outcome"><div class="feedback"><div class="rightanswer">The correct answer is <mjx-container><span aria-hidden="true">VISUAL_DUPLICATE</span><mjx-assistive-mml><math xmlns="http://www.w3.org/1998/Math/MathML" id="source-math"><mfrac><mn>17</mn><mn>2</mn></mfrac></math></mjx-assistive-mml></mjx-container>.</div><div class="generalfeedback"><p>Use the two equal time intervals.</p></div></div></div></div></div>
<div class="que multichoice todo" id="unreleased"><div class="info">Question 3</div><div class="content"><div class="formulation"><div class="answer"><span class="correct">CHOICE_MARKER_SECRET</span></div><input type="text" name="unreleased-value" value="STUDENT_VALUE_SECRET"></div><div class="outcome"><div class="feedback"><div class="rightanswer" hidden>HIDDEN_ANSWER_SECRET</div><div aria-hidden="true"><div class="rightanswer">ARIA_SECRET</div></div><div style="display:none"><div class="rightanswer">DISPLAY_SECRET</div></div><details><summary>Not released</summary><div class="rightanswer">CLOSED_SECRET</div></details><div class="specificfeedback">Use the definition.</div><div class="hint" hidden>HIDDEN_HINT_SECRET</div></div></div></div></div>
</form></main></body></html>`;

test('Study Assist is opt-in, projects only released answers, updates after grading and restores the native form', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 1000 },
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
                return {
                  [key]: JSON.parse(localStorage.getItem(key) ?? 'null'),
                };
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
      if (url.origin !== 'https://mycourses.aalto.fi') {
        unexpected.push(url.href);
        return route.abort();
      }
      if (
        url.pathname === '/mod/quiz/review.php' ||
        url.pathname === '/mod/quiz/attempt.php' ||
        url.pathname === '/course/view.php'
      )
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
      if (/^\/(fonts|chunks|assets)\//.test(url.pathname))
        return route.fulfill({
          contentType: url.pathname.endsWith('.js')
            ? 'application/javascript'
            : url.pathname.endsWith('.css')
              ? 'text/css'
              : 'font/ttf',
          body: await readFile(path.join('.output/chrome-mv3', url.pathname)),
        });
      unexpected.push(url.href);
      return route.abort();
    });
    const [css, js] = await Promise.all([
      readFile('.output/chrome-mv3/content-scripts/theme.css', 'utf8'),
      readFile('.output/chrome-mv3/content-scripts/theme.js', 'utf8'),
    ]);
    const page = await context.newPage();
    await page.goto('https://mycourses.aalto.fi/mod/quiz/review.php');
    const original = await page
      .locator('#responseform')
      .evaluate((el) => el.innerHTML);
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: js });
    await expect(page.locator('html')).toHaveAttribute(
      'data-better-my-courses',
      'dark',
    );
    await expect(page.locator('.bmc-study-assist')).toHaveCount(0);
    // The screenshot's adaptive state has no .que.correct class.
    const outcome = page.locator('#released .outcome');
    // Latest adaptive result also wins over a different aggregate question state.
    await page
      .locator('#released')
      .evaluate((el) => el.classList.add('correct'));
    for (const [state, color] of [
      ['incorrect', 'rgb(36, 20, 20)'],
      ['partiallycorrect', 'rgb(33, 29, 17)'],
      ['correct', 'rgb(16, 28, 21)'],
    ]) {
      await page
        .locator('#released .correctness')
        .evaluate(
          (el, grade) => el.setAttribute('class', `correctness ${grade} badge`),
          state,
        );
      await expect(outcome).toHaveCSS('background-color', color!);
    }
    await page
      .locator('#released')
      .evaluate((el) => el.classList.remove('correct'));
    const second = await context.newPage();
    await second.goto('https://mycourses.aalto.fi/mod/quiz/attempt.php');
    await second.addStyleTag({ content: css });
    await second.addScriptTag({ content: js });
    const popup = await context.newPage();
    await popup.goto('https://mycourses.aalto.fi/popup.html');
    const toggle = popup.getByRole('switch', { name: 'Study Assist' });
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await toggle.click();
    for (const tab of [page, second])
      await expect(tab.locator('.bmc-study-assist')).toHaveCount(3);
    const released = page.locator('#released .bmc-study-assist');
    await released.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(released).toHaveAttribute('open', '');
    await expect(released).toContainText(
      'Correct answer released by MyCourses',
    );
    await expect(released.locator('strong sub')).toHaveText('P');
    await expect(
      released.locator('input, script, [id], [style], [onclick]'),
    ).toHaveCount(0);
    await page.locator('#math-question .bmc-study-assist summary').click();
    const math = page.locator('#math-question .bmc-study-assist');
    await expect(math.locator('math mfrac')).toHaveText('172');
    await expect(math).not.toContainText('VISUAL_DUPLICATE');
    await expect(math.locator('[id], [style], script, input')).toHaveCount(0);
    await page.locator('#released .rightanswer').evaluate((el) => {
      const image = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg',
      );
      image.setAttribute('width', '20');
      image.setAttribute('height', '20');
      el.append(image);
    });
    await expect(released).toContainText('[Image in original feedback]');
    await expect(released.locator('img, svg, object, canvas')).toHaveCount(0);
    await page
      .locator('#released .rightanswer svg')
      .evaluate((el) => el.remove());
    await expect(released).not.toContainText('[Image in original feedback]');
    const unreleased = page.locator('#unreleased .bmc-study-assist');
    await unreleased.locator('summary').click();
    await expect(unreleased).toContainText('has not released a correct answer');
    await expect(unreleased).toContainText('Use the definition.');
    expect(
      (await page.locator('.bmc-study-assist').allTextContents()).join(''),
    ).not.toMatch(/SECRET/);
    // Open drawers follow released native feedback changes and AJAX replacement.
    await page
      .locator('#unreleased .rightanswer')
      .first()
      .evaluate((el) => {
        el.removeAttribute('hidden');
        el.textContent = 'The correct answer is: newly released answer.';
      });
    await expect(unreleased).toContainText('newly released answer');
    await expect(unreleased).not.toContainText('has not released');
    await page
      .locator('#unreleased .rightanswer')
      .first()
      .evaluate((el) => el.setAttribute('hidden', ''));
    await expect(unreleased).not.toContainText('newly released answer');
    await page.locator('#math-question').evaluate((el) => {
      const copy = el.cloneNode(true) as Element;
      copy.querySelector('.bmc-study-assist')?.remove();
      el.replaceWith(copy);
    });
    await expect(page.locator('#math-question .bmc-study-assist')).toHaveCount(
      1,
    );
    await expect(page.locator('.bmc-study-assist')).toHaveCount(3);
    // Inputs, selection and the site's submit handler are untouched.
    await expect(page.locator('#numeric')).toHaveValue('8.5');
    await expect(page.locator('#answer')).toBeChecked();
    await page.evaluate(() =>
      document
        .querySelector('#responseform')!
        .addEventListener('submit', (event) => {
          event.preventDefault();
          document
            .querySelector('#responseform')!
            .setAttribute('data-submitted', 'true');
        }),
    );
    await released
      .getByRole('button', { name: 'View original feedback' })
      .click();
    await expect(page.locator('#responseform')).not.toHaveAttribute(
      'data-submitted',
    );
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(page.locator('#responseform')).toHaveAttribute(
      'data-submitted',
      'true',
    );
    await popup.getByRole('button', { name: 'Sage', exact: true }).click();
    await expect(released.locator('summary')).toHaveCSS(
      'color',
      'rgb(168, 199, 181)',
    );
    // Feature stays usable independently of the dark theme.
    await popup.getByRole('switch', { name: 'Dark theme' }).click();
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-better-my-courses',
    );
    await expect(page.locator('.bmc-study-assist')).toHaveCount(3);
    await expect(released).toHaveCSS('background-color', 'rgb(255, 255, 255)');
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
    await popup.getByRole('switch', { name: 'Dark theme' }).click();
    await page.locator('#math-question .bmc-study-assist summary').click();
    for (const width of [1200, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
      await page.screenshot({
        path: `test-results/study-assist-${width}.png`,
        fullPage: true,
        caret: 'initial',
      });
    }
    await popup.setViewportSize({ width: 320, height: 600 });
    await popup.screenshot({
      path: 'test-results/study-assist-popup.png',
      caret: 'initial',
    });
    const saved = await popup.evaluate(() =>
      localStorage.getItem('betterMyCourses.settings'),
    );
    expect(JSON.parse(saved!)).toEqual({
      enabled: true,
      theme: 'inky-black',
      linkColor: '#a8c7b5',
      studyAssist: true,
    });
    expect(saved).not.toMatch(/answer|feedback|SECRET/i);
    await toggle.click();
    for (const tab of [page, second]) {
      await expect(tab.locator('.bmc-study-assist')).toHaveCount(0);
      await expect(tab.locator('html')).not.toHaveAttribute(
        'data-bmc-study-assist',
      );
    }
    // Restore deliberate fixture edits before checking exact native markup.
    await page
      .locator('#responseform')
      .evaluate((el) => el.removeAttribute('data-submitted'));
    await page
      .locator('#unreleased .rightanswer')
      .first()
      .evaluate((el) => (el.textContent = 'HIDDEN_ANSWER_SECRET'));
    expect(
      await page.locator('#responseform').evaluate((el) => el.innerHTML),
    ).toBe(original);
    await popup.reload();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    const course = await context.newPage();
    await course.goto('https://mycourses.aalto.fi/course/view.php');
    await course.addStyleTag({ content: css });
    await course.addScriptTag({ content: js });
    await toggle.click();
    await expect(course.locator('.bmc-study-assist')).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  } finally {
    await browser.close();
  }
});
