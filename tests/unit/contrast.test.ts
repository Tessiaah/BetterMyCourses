import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const css = readFileSync('src/theme/tokens.css', 'utf8');
const token = (name: string) =>
  css.match(new RegExp(`--bmc-${name}: [^;]*?(#[\\da-f]{6})`))![1]!;
const luminance = (hex: string) => {
  const c = hex
    .slice(1)
    .match(/../g)!
    .map((v) => {
      const n = parseInt(v, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
  return c[0]! * 0.2126 + c[1]! * 0.7152 + c[2]! * 0.0722;
};
const contrast = (a: string, b: string) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

it('keeps body, metadata, placeholders, links and semantic text at WCAG AA', () => {
  for (const text of [
    'text',
    'secondary',
    'muted',
    'link',
    'link-hover',
    'accent',
    'danger',
    'success',
  ]) {
    for (const surface of ['page', 'panel', 'hover', 'control']) {
      expect(
        contrast(token(text), token(surface)),
        `${text} on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
  expect(contrast(token('control'), token('accent'))).toBeGreaterThanOrEqual(
    4.5,
  );
  expect(contrast(token('accent'), token('control'))).toBeGreaterThanOrEqual(3);
  for (const background of ['#151516', '#29292b', '#202022'])
    expect(contrast('#f1efea', background)).toBeGreaterThanOrEqual(4.5);
  // Worst-case white photo behind the Home title's 65% black backdrop.
  expect(contrast(token('text'), '#595959')).toBeGreaterThanOrEqual(4.5);
});
