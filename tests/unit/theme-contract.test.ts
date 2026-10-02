import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';
const files = readdirSync('src/theme').filter((name) => name.endsWith('.css'));
const source = files
  .map((name) => readFileSync('src/theme/' + name, 'utf8'))
  .join('\n');
const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
it('avoids remote CSS, decorative backgrounds, glows and image replacement', () => {
  expect(css).not.toMatch(
    /url\(['"]?https?:|(?:radial|linear)-gradient|backdrop-filter/,
  );
  const preserved = files
    .filter((name) => name !== 'banners.css')
    .map((name) => readFileSync('src/theme/' + name, 'utf8'))
    .join('\n');
  expect(preserved).not.toMatch(/background-image\s*:/);
  const banners = readFileSync('src/theme/banners.css', 'utf8').replace(
    /\s+/g,
    ' ',
  );
  expect(banners).toContain("[data-bmc-home-banner='custom'] #page-site-index");
  expect(banners).toContain(
    "[data-bmc-dashboard-banner='custom'] #page-my-index",
  );
  for (const declaration of css.matchAll(/(?:text|box)-shadow:\s*([^;]+);/g))
    expect(declaration[1]!.trim()).toMatch(/^none(?: !important)?$/);
});
it('gates component rules behind the theme root, including responsive and motion rules', () => {
  for (const selector of css.matchAll(/([^{}]+)\{/g)) {
    const value = selector[1]!.trim();
    if (value.startsWith('@') || /^(from|to)$/.test(value)) continue;
    expect(value).toMatch(/^html\[data-better-my-courses='dark'\]/);
  }
  expect(css).toContain('prefers-reduced-motion: reduce');
});
