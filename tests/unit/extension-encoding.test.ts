import { expect, it } from 'vitest';
import { assertExtensionText } from '../../scripts/verify-extension';

const bytes = (value: string) => new TextEncoder().encode(value);

it('accepts ordinary UTF-8 math, supplementary characters and escaped noncharacters', () => {
  expect(() =>
    assertExtensionText(bytes('Σ ∫ sähkö 😀'), 'theme.js'),
  ).not.toThrow();
  expect(() =>
    assertExtensionText(bytes(String.raw`const end="\uFFFF";`), 'theme.js'),
  ).not.toThrow();
});

it('rejects malformed, truncated and surrogate UTF-8 encodings', () => {
  for (const sequence of [
    [0xc0, 0xaf],
    [0xe2, 0x82],
    [0xed, 0xa0, 0x80],
  ])
    expect(() =>
      assertExtensionText(new Uint8Array(sequence), 'theme.js'),
    ).toThrow('invalid UTF-8');
});

it('rejects every Unicode noncharacter that Chromium disallows in extension sources', () => {
  const points = Array.from({ length: 32 }, (_, i) => 0xfdd0 + i);
  for (let plane = 0; plane <= 16; plane++)
    points.push(plane * 0x10000 + 0xfffe, plane * 0x10000 + 0xffff);
  for (const point of points)
    expect(() =>
      assertExtensionText(bytes(String.fromCodePoint(point)), 'theme.js'),
    ).toThrow('Chromium rejects literal U+');
});
