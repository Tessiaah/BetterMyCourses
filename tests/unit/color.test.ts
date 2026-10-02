import { expect, it } from 'vitest';
import {
  contrastRatio,
  normalizeLinkColor,
  DEFAULT_LINK_COLOR,
} from '../../src/utils/color';
import { normalizeSettings } from '../../src/utils/settings';
it('migrates previous preferences without losing the disabled state', () => {
  expect(normalizeSettings({ enabled: false, theme: 'inky-black' })).toEqual({
    enabled: false,
    theme: 'inky-black',
    linkColor: DEFAULT_LINK_COLOR,
    studyAssist: false,
  });
});
it('rejects invalid color data and preserves readable colors', () => {
  for (const value of [
    null,
    '#fff',
    'red',
    'url(https://example.org)',
    '#gggggg',
  ])
    expect(normalizeLinkColor(value)).toBe(DEFAULT_LINK_COLOR);
  expect(normalizeLinkColor('#A8C7B5')).toBe('#a8c7b5');
});
it('ensures even black, saturated and very dark custom colors meet AA', () => {
  for (const value of [
    '#000000',
    '#0000ff',
    '#550011',
    '#010101',
    '#ffff00',
    '#d8c3a0',
  ])
    expect(
      contrastRatio(normalizeLinkColor(value), '#191a1c'),
    ).toBeGreaterThanOrEqual(4.5);
});
