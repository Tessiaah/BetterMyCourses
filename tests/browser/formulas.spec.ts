import { test, expect, type Page } from '@playwright/test';
import { formulaFixture } from './formula-fixture';

async function workspace(page: Page) {
  await page.locator('.bmc-study-assist summary').click();
  await page.getByRole('tab', { name: 'Formulas', exact: true }).click();
  const panel = page.locator('.bmc-formula-panel');
  await expect(panel.getByLabel('Search formulas')).toBeEnabled();
  return panel;
}

test('personal formulas can be searched across subjects, saved, edited and placed as draggable temporary references', async () => {
  const { browser, open, errors, unexpected } = await formulaFixture();
  try {
    const { page, original } = await open();
    const nativeMath = await page.locator('#site-math').evaluate((el) => ({
      html: el.outerHTML,
      family: getComputedStyle(el).fontFamily,
      size: getComputedStyle(el).fontSize,
    }));
    const panel = await workspace(page);
    await expect(
      panel.getByRole('button', { name: 'Place Power rule on screen' }),
    ).toBeVisible();
    await panel.getByLabel('Subject', { exact: true }).selectOption('math');
    await panel.getByLabel('Search formulas').fill('resistance series');
    await expect(
      panel.getByRole('button', {
        name: 'Place Resistance in series on screen',
      }),
    ).toBeVisible();
    await expect(panel.locator('.bmc-formula-row')).toHaveCount(1);
    await panel
      .getByRole('button', { name: 'Place Resistance in series on screen' })
      .click();
    const card = page.getByRole('region', {
      name: 'Resistance in series reference',
    });
    await expect(card).toBeVisible();
    await expect(card.locator('math')).toHaveCount(1);
    await expect(card.locator('.katex-html')).toBeVisible();
    const handle = card.getByRole('button', {
      name: 'Move Resistance in series',
      exact: true,
    });
    const before = (await card.boundingBox())!;
    const grip = (await handle.boundingBox())!;
    await page.mouse.move(grip.x + 35, grip.y + 20);
    await page.mouse.down();
    await page.mouse.move(grip.x + 115, grip.y + 70, { steps: 8 });
    await page.mouse.up();
    await expect
      .poll(async () => (await card.boundingBox())!.x)
      .toBeCloseTo(before.x + 80, 0);
    await handle.focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => (await card.boundingBox())!.x)
      .toBeCloseTo(before.x + 90, 0);
    await panel
      .getByRole('button', { name: 'Place Resistance in series on screen' })
      .click();
    await expect(page.locator('.bmc-formula-card')).toHaveCount(1);
    await page.evaluate(() => window.scrollTo(0, 100));
    await expect
      .poll(async () => (await card.boundingBox())!.x)
      .toBeCloseTo(before.x + 90, 0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await card
      .getByRole('button', { name: 'Remove Resistance in series from screen' })
      .click();
    await expect(page.locator('.bmc-formula-card')).toHaveCount(0);

    await panel
      .getByRole('button', { name: 'Add subject', exact: true })
      .click();
    await panel.getByLabel('Subject name').fill('Physics');
    await panel
      .getByRole('button', { name: 'Save subject', exact: true })
      .click();
    await expect(
      panel
        .getByLabel('Subject', { exact: true })
        .locator('option')
        .filter({ hasText: 'Physics' }),
    ).toHaveCount(1);
    await expect(panel.locator('.bmc-formula-editor')).toBeEmpty();
    await panel
      .getByRole('button', { name: 'Add formula', exact: true })
      .click();
    await panel.getByLabel('Formula title').fill('Kinetic energy');
    await panel
      .getByLabel('LaTeX', { exact: true })
      .fill(String.raw`E_k=\frac{1}{2}mv^2`);
    await expect(
      panel.locator('.bmc-formula-preview .katex-html'),
    ).toBeVisible();
    await page.screenshot({ path: 'test-results/formulas-editor.png' });
    await panel
      .getByRole('button', { name: 'Save formula', exact: true })
      .click();
    await expect(
      panel.getByRole('button', { name: 'Place Kinetic energy on screen' }),
    ).toBeVisible();
    await panel
      .getByRole('button', { name: 'Place Kinetic energy on screen' })
      .click();
    const energy = page.getByRole('region', {
      name: 'Kinetic energy reference',
    });
    await expect(energy).toBeVisible();
    await expect(energy.locator('.bmc-formula-math')).toHaveCSS(
      'color',
      'rgb(241, 239, 234)',
    );
    await expect(energy).toHaveCSS('border-color', 'rgb(168, 199, 181)');
    await page.evaluate(() => document.fonts.ready);
    const formulaFonts = await page.evaluate(
      () =>
        [...document.fonts].filter(
          (face) =>
            face.family.startsWith('BMC_KaTeX_') && face.status === 'loaded',
        ).length,
    );
    expect(formulaFonts).toBeGreaterThan(0);
    expect(
      await page.locator('#site-math').evaluate((el) => ({
        html: el.outerHTML,
        family: getComputedStyle(el).fontFamily,
        size: getComputedStyle(el).fontSize,
      })),
    ).toEqual(nativeMath);
    await page.screenshot({ path: 'test-results/formulas-desktop.png' });

    await panel
      .getByRole('button', { name: 'Rename selected subject' })
      .click();
    await panel.getByLabel('Subject name').fill('Mechanics');
    await panel
      .getByRole('button', { name: 'Save subject', exact: true })
      .click();
    await expect(energy.locator('.bmc-formula-card-subject')).toHaveText(
      'Mechanics',
    );
    await panel.getByRole('button', { name: 'Edit Kinetic energy' }).click();
    await panel.getByLabel('Formula title').fill('Energy of motion');
    await panel
      .getByRole('button', { name: 'Save formula', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Move Energy of motion', exact: true }),
    ).toBeVisible();
    const second = await open();
    const secondPanel = await workspace(second.page);
    await secondPanel.getByLabel('Search formulas').fill('Energy of motion');
    await expect(
      secondPanel.getByRole('button', {
        name: 'Place Energy of motion on screen',
      }),
    ).toBeVisible();
    await panel
      .getByRole('button', { name: 'Delete Energy of motion' })
      .click();
    await panel.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator('.bmc-formula-card')).toHaveCount(0);
    await expect(
      secondPanel.getByRole('button', {
        name: 'Place Energy of motion on screen',
      }),
    ).toHaveCount(0);
    await expect(secondPanel).toContainText('No matching titles');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.locator('.bmc-drawing-surface')).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          [...document.fonts].filter((f) => f.family.startsWith('BMC_KaTeX_'))
            .length,
      ),
    ).toBe(0);
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('local:betterMyCourses.formulaLibrary')!),
    );
    expect(
      stored.subjects.some((s: { name: string }) => s.name === 'Mechanics'),
    ).toBe(true);
    expect(JSON.stringify(stored)).not.toMatch(/8\.5|pointer|position|stroke/);
    expect(
      await page.locator('#responseform').evaluate((el) => {
        const copy = el.cloneNode(true) as Element;
        copy.querySelector('.bmc-study-assist')?.remove();
        for (const empty of copy.querySelectorAll('[style=""]'))
          empty.removeAttribute('style');
        return copy.innerHTML;
      }),
    ).toBe(original);
    const reopened = await workspace(page);
    await expect(page.locator('.bmc-formula-card')).toHaveCount(0);
    await expect(
      reopened
        .getByLabel('Subject', { exact: true })
        .locator('option')
        .filter({ hasText: 'Mechanics' }),
    ).toHaveCount(1);
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  } finally {
    await browser.close();
  }
});

test('formula validation and storage failures retain drafts; simultaneous tabs retain independent additions', async () => {
  const { browser, open, errors, unexpected } = await formulaFixture();
  try {
    const { page } = await open();
    await page.locator('.bmc-study-assist summary').click();
    await page.evaluate(
      () => (document.documentElement.dataset.failRead = 'true'),
    );
    await page.getByRole('tab', { name: 'Formulas', exact: true }).click();
    const panel = page.locator('.bmc-formula-panel');
    await expect(panel).toContainText('Could not load your library.');
    await page.evaluate(() => delete document.documentElement.dataset.failRead);
    await panel.getByRole('button', { name: 'Retry loading' }).click();
    await expect(panel.getByLabel('Search formulas')).toBeEnabled();
    await panel
      .getByRole('button', { name: 'Add subject', exact: true })
      .click();
    await panel.getByLabel('Subject name').fill('Thermodynamics');
    await page.evaluate(
      () => (document.documentElement.dataset.failSave = 'true'),
    );
    await panel
      .getByRole('button', { name: 'Save subject', exact: true })
      .click();
    await expect(panel).toContainText('Could not save. Please try again.');
    await expect(panel.getByLabel('Subject name')).toHaveValue(
      'Thermodynamics',
    );
    await page.evaluate(() => delete document.documentElement.dataset.failSave);
    await panel
      .getByRole('button', { name: 'Save subject', exact: true })
      .click();
    await expect(panel.locator('.bmc-formula-editor')).toBeEmpty();
    await panel
      .getByRole('button', { name: 'Add formula', exact: true })
      .click();
    await panel.getByLabel('Formula title').fill('A draft');
    for (const latex of [
      String.raw`\frac{a`,
      String.raw`\href{https://example.com/secret}{x}`,
    ]) {
      await panel.getByLabel('LaTeX', { exact: true }).fill(latex);
      await panel
        .getByRole('button', { name: 'Save formula', exact: true })
        .click();
      await expect(panel.locator('.bmc-formula-error')).not.toBeEmpty();
      await expect(panel.getByLabel('LaTeX', { exact: true })).toHaveValue(
        latex,
      );
      await expect(
        panel.getByRole('button', { name: 'Place A draft on screen' }),
      ).toHaveCount(0);
    }
    await page.keyboard.press('Escape');
    await expect(panel.locator('.bmc-formula-editor')).toBeEmpty();
    await expect(page.locator('.bmc-drawing-surface')).toHaveCount(1);
    await panel
      .getByRole('button', { name: 'Add subject', exact: true })
      .click();
    await panel.getByLabel('Subject name').fill('Mathematical physics');
    const second = await open();
    const other = await workspace(second.page);
    await other
      .getByRole('button', { name: 'Add subject', exact: true })
      .click();
    await other.getByLabel('Subject name').fill('Chemistry');
    await Promise.all([
      panel.getByRole('button', { name: 'Save subject', exact: true }).click(),
      other.getByRole('button', { name: 'Save subject', exact: true }).click(),
    ]);
    for (const target of [panel, other]) {
      await expect(
        target
          .getByLabel('Subject', { exact: true })
          .locator('option')
          .filter({ hasText: 'Mathematical physics' }),
      ).toHaveCount(1);
      await expect(
        target
          .getByLabel('Subject', { exact: true })
          .locator('option')
          .filter({ hasText: 'Chemistry' }),
      ).toHaveCount(1);
    }
    await panel
      .getByRole('button', { name: 'Delete selected subject' })
      .click();
    await panel.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(
      panel
        .getByLabel('Subject', { exact: true })
        .locator('option')
        .filter({ hasText: 'Mathematical physics' }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  } finally {
    await browser.close();
  }
});

test('phone formulas support touch/keyboard placement, responsive bounds, light theme and Study Assist Off cleanup', async () => {
  const { browser, context, open, errors, unexpected } = await formulaFixture({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  try {
    const { page } = await open();
    const panel = await workspace(page);
    await panel.getByLabel('Search formulas').fill('resistance series');
    await panel
      .getByRole('button', { name: 'Place Resistance in series on screen' })
      .click();
    const card = page.locator('.bmc-formula-card');
    const handle = card.getByRole('button', {
      name: 'Move Resistance in series',
      exact: true,
    });
    const grip = (await handle.boundingBox())!;
    const before = (await card.boundingBox())!;
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: grip.x + 30, y: grip.y + 16, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: grip.x + 55, y: grip.y + 26, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect
      .poll(async () => (await card.boundingBox())!.x)
      .toBeGreaterThan(before.x + 10);
    await page.screenshot({ path: 'test-results/formulas-phone.png' });
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expect
        .poll(
          async () =>
            (await card.boundingBox())!.x + (await card.boundingBox())!.width,
        )
        .toBeLessThanOrEqual(width);
      const toolbar = (await page.locator('.bmc-drawing-tools').boundingBox())!;
      expect(toolbar.x + toolbar.width).toBeLessThanOrEqual(width);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    }
    await page.getByRole('tab', { name: 'Drawing', exact: true }).click();
    await page.getByRole('button', { name: 'Browse', exact: true }).click();
    await expect(card).toBeVisible();
    await expect(page.locator('#answer')).toHaveValue('8.5');
    const popup = await context.newPage();
    await popup.goto('https://mycourses.aalto.fi/popup.html');
    await popup.getByRole('switch', { name: 'Dark theme' }).click();
    await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(card.locator('.bmc-formula-math')).toHaveCSS(
      'color',
      'rgb(33, 37, 41)',
    );
    await popup.getByRole('switch', { name: 'Study Assist' }).click();
    await expect(
      page.locator(
        '.bmc-drawing-surface, .bmc-formula-card, .bmc-study-assist',
      ),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          [...document.fonts].filter((f) => f.family.startsWith('BMC_KaTeX_'))
            .length,
      ),
    ).toBe(0);
    expect(errors).toEqual([]);
    expect(unexpected).toEqual([]);
  } finally {
    await browser.close();
  }
});
