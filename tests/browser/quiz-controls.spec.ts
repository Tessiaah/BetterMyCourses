import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { quizControlsFixture } from './quiz-controls-fixture';

test('quiz action spacing, visible inputs and feedback follow native grading without changing form semantics', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const [css, bootstrap] = await Promise.all([
      readFile('.output/chrome-mv3/content-scripts/theme.css', 'utf8'),
      readFile('node_modules/bootstrap/dist/css/bootstrap.min.css', 'utf8'),
    ]);
    await page.setContent(quizControlsFixture);
    await page.addStyleTag({ content: bootstrap });
    const original = await page.locator('main').evaluate((el) => el.innerHTML);
    const inputBefore = await page
      .locator('#numeric-answer')
      .evaluate((el) => ({
        width: el.getBoundingClientRect().width,
        background: getComputedStyle(el).backgroundColor,
        border: getComputedStyle(el).border,
      }));
    await page.addStyleTag({ content: css });
    await page.locator('html').evaluate((el) => {
      el.setAttribute('data-better-my-courses', 'dark');
      (el as HTMLElement).style.setProperty('--bmc-user-link', '#a8c7b5');
    });
    await expect(page.locator('.contextpage-context-header-content')).toHaveCSS(
      'background-color',
      'rgb(0, 0, 0)',
    );
    const palettes = [
      ['choice-feedback', 'rgb(16, 28, 21)', 'rgb(117, 182, 138)'],
      ['partial-feedback', 'rgb(33, 29, 17)', 'rgb(215, 189, 105)'],
      ['wrong-feedback', 'rgb(36, 20, 20)', 'rgb(216, 148, 145)'],
      ['part-right', 'rgb(16, 28, 21)', 'rgb(117, 182, 138)'],
      ['part-wrong', 'rgb(36, 20, 20)', 'rgb(216, 148, 145)'],
      ['mixed-feedback', 'rgb(33, 29, 17)', 'rgb(215, 189, 105)'],
    ] as const;
    for (const [id, background, edge] of palettes) {
      await expect(page.locator('#' + id)).toHaveCSS(
        'background-color',
        background,
      );
      await expect(page.locator('#' + id)).toHaveCSS(
        'border-inline-start-color',
        edge,
      );
      await expect(page.locator('#' + id)).toHaveCSS(
        'border-inline-start-width',
        '3px',
      );
    }
    await expect(page.locator('#pending-feedback')).toHaveCSS(
      'background-color',
      'rgb(3, 3, 3)',
    );
    await expect(page.locator('.correctness')).toHaveCSS(
      'color',
      'rgb(241, 239, 234)',
    );
    await expect(page.locator('.correctness')).toHaveCSS(
      'background-color',
      'rgba(0, 0, 0, 0)',
    );
    await expect(page.locator('#interpretation')).toHaveCSS(
      'background-color',
      'rgb(17, 17, 18)',
    );
    // Native grading can change after Check; CSS immediately follows it.
    for (const [state, background] of [
      ['incorrect', 'rgb(36, 20, 20)'],
      ['partiallycorrect', 'rgb(33, 29, 17)'],
      ['correct', 'rgb(16, 28, 21)'],
    ]) {
      await page.locator('#choice-question').evaluate((el, value) => {
        el.classList.remove('correct', 'partiallycorrect', 'incorrect');
        // Adaptive feedback records the latest grade separately from .que state.
        el.classList.add('answersaved');
        el.querySelector('.correctness')!.className =
          `correctness ${value} badge`;
      }, state);
      await expect(page.locator('#choice-feedback')).toHaveCSS(
        'background-color',
        background!,
      );
    }
    await page.locator('#choice-question').evaluate((el) => {
      el.classList.remove('answersaved');
      el.classList.add('correct');
      el.querySelector('.correctness')!.className =
        'correctness correct badge bg-success';
    });
    const answer = page.locator('#numeric-answer');
    await expect(answer).toHaveCSS('border-top-style', 'solid');
    await expect(answer).toHaveCSS('border-top-width', '1px');
    await expect(answer).toHaveCSS('border-color', 'rgb(133, 133, 128)');
    await expect(answer).toHaveCSS('background-color', 'rgb(21, 21, 22)');
    await expect(answer).toHaveValue('8.5');
    await answer.focus();
    await expect(answer).toHaveCSS('outline-color', 'rgb(168, 199, 181)');
    await answer.fill('9.5');
    await expect(answer).toHaveValue('9.5');
    await answer.evaluate((el) => el.setAttribute('aria-invalid', 'true'));
    await answer.hover();
    await expect(answer).toHaveCSS('border-color', 'rgb(229, 160, 155)');
    await answer.evaluate((el) => el.removeAttribute('aria-invalid'));
    await expect(page.locator('#long-answer')).toHaveCSS(
      'border-top-style',
      'solid',
    );
    for (const width of [1440, 800, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const [choices, clear, check] = await Promise.all([
        page.locator('#choices').boundingBox(),
        page.locator('#clear-button').boundingBox(),
        page.locator('#check-button').boundingBox(),
      ]);
      expect(clear!.y - choices!.y - choices!.height).toBeGreaterThanOrEqual(
        24,
      );
      expect(check!.y - clear!.y - clear!.height).toBeGreaterThanOrEqual(20);
      expect(clear!.x).toBeCloseTo(check!.x, 1);
      expect(clear!.height).toBeCloseTo(check!.height, 1);
      expect(clear!.height).toBeGreaterThanOrEqual(44);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    }
    // Preserve native fieldset grouping, labels, form values and handlers.
    expect(
      await page
        .locator('#clear-radio')
        .evaluate((el) =>
          el.closest('fieldset')?.getAttribute('aria-describedby'),
        ),
    ).toBe('choice-text');
    await page.evaluate(() => {
      document
        .getElementById('clear-button')!
        .addEventListener('click', (event) => {
          event.preventDefault();
          (document.getElementById('clear-radio') as HTMLInputElement).checked =
            true;
        });
      document
        .getElementById('quiz-form')!
        .addEventListener('submit', (event) => {
          event.preventDefault();
          document.getElementById('quiz-form')!.dataset.checked = 'true';
        });
    });
    await page.locator('#clear-button').click();
    await expect(page.locator('#answer-b')).not.toBeChecked();
    await expect(page.locator('#clear-radio')).toBeChecked();
    await page.locator('#check-button').click();
    await expect(page.locator('#quiz-form')).toHaveAttribute(
      'data-checked',
      'true',
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: 'test-results/quiz-controls-desktop.png',
      fullPage: true,
      caret: 'initial',
    });
    await page
      .locator('html')
      .evaluate((el) => el.removeAttribute('data-better-my-courses'));
    await expect(page.locator('.contextpage-context-header-content')).toHaveCSS(
      'background-color',
      'rgba(255, 255, 255, 0.85)',
    );
    expect(
      await answer.evaluate((el) => ({
        width: el.getBoundingClientRect().width,
        background: getComputedStyle(el).backgroundColor,
        border: getComputedStyle(el).border,
      })),
    ).toEqual(inputBefore);
    // Only the deliberate synthetic form-submit marker differs after Off.
    await page
      .locator('#quiz-form')
      .evaluate((el) => el.removeAttribute('data-checked'));
    expect(await page.locator('main').evaluate((el) => el.innerHTML)).toBe(
      original,
    );
  } finally {
    await browser.close();
  }
});
