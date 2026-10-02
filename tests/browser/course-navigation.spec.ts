import { test, expect, chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('course secondary menu loses its white strip while native links, layout and selection remain', async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BMC_BROWSER_PATH,
    headless: true,
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 900 },
    });
    const [css, bootstrap] = await Promise.all([
      readFile('.output/chrome-mv3/content-scripts/theme.css', 'utf8'),
      readFile('node_modules/bootstrap/dist/css/bootstrap.min.css', 'utf8'),
    ]);
    await page.setContent(
      '<!doctype html><html><head><style>.secondary-navigation{margin:24px;border-bottom:1px solid #ccc}.secondary-navigation .moremenu .nav-tabs{background:white;padding:0 24px}.secondary-navigation .nav-link{padding:20px 24px;border:0;border-bottom:3px solid transparent}.secondary-navigation .nav-link.active{background:#060606;color:#d7b77a;border-bottom-color:#d7b77a}.course-page{padding:24px}</style></head><body id="page-course-view" class="path-course"><div class="secondary-navigation"><nav class="moremenu" aria-label="Course navigation"><ul class="nav nav-tabs"><li class="nav-item"><a href="#course" class="nav-link active" aria-current="page">Course</a></li><li class="nav-item"><a href="#grades" class="nav-link">Grades</a></li><li class="nav-item"><a href="#activities" class="nav-link">Activities</a></li><li class="nav-item"><a href="#feedback" class="nav-link">Course feedback</a></li><li class="nav-item dropdown"><a href="#more" class="nav-link dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">More</a><div class="dropdown-menu"><a class="dropdown-item" href="#reports">Reports</a></div></li></ul></nav></div><main class="course-page"><h1>Welcome to Calculus 1</h1></main></body></html>',
    );
    await page.addStyleTag({ content: bootstrap });
    const nav = page.locator('.secondary-navigation');
    const original = await nav.evaluate((el) => el.outerHTML);
    const geometry = () =>
      nav.locator('.nav-link').evaluateAll((links) =>
        links.map((el) => {
          const style = getComputedStyle(el);
          return {
            display: style.display,
            fontSize: style.fontSize,
            margin: style.margin,
            padding: style.padding,
            borderWidth: style.borderWidth,
          };
        }),
      );
    const before = await geometry();
    await page.addStyleTag({ content: css });
    await page.locator('html').evaluate((el) => {
      el.setAttribute('data-better-my-courses', 'dark');
      (el as HTMLElement).style.setProperty('--bmc-user-link', '#e79598');
    });
    for (const selector of ['.secondary-navigation', '.moremenu', '.nav-tabs'])
      await expect(page.locator(selector)).toHaveCSS(
        'background-color',
        'rgb(0, 0, 0)',
      );
    const selected = nav.getByRole('link', { name: 'Course', exact: true });
    await expect(selected).toHaveCSS('color', 'rgb(231, 149, 152)');
    await expect(selected).toHaveCSS(
      'border-bottom-color',
      'rgb(231, 149, 152)',
    );
    await expect(selected).toHaveAttribute('href', '#course');
    const grades = nav.getByRole('link', { name: 'Grades', exact: true });
    await grades.click();
    await expect(grades).not.toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    await page.keyboard.press('Tab');
    const activities = nav.getByRole('link', {
      name: 'Activities',
      exact: true,
    });
    await expect(activities).toBeFocused();
    await expect(activities).toHaveCSS('outline-width', '2px');
    await expect(activities).toHaveCSS('outline-color', 'rgb(231, 149, 152)');
    expect(await geometry()).toEqual(before);
    await page.screenshot({
      path: 'test-results/course-navigation-desktop.png',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({ path: 'test-results/course-navigation-phone.png' });
    await page
      .locator('html')
      .evaluate((el) => el.removeAttribute('data-better-my-courses'));
    await expect(page.locator('.nav-tabs')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    expect(await nav.evaluate((el) => el.outerHTML)).toBe(original);
  } finally {
    await browser.close();
  }
});
