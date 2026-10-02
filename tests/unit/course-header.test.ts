import { expect, it } from 'vitest';
import { isLightHeaderSurface } from '../../src/utils/course-header';

it('detects opaque and translucent pale header panels, leaving dark and transparent surfaces alone', () => {
  for (const color of [
    'rgb(255, 255, 255)',
    'rgba(255, 255, 255, 0.85)',
    'rgb(193 193 193 / 0.9)',
  ])
    expect(isLightHeaderSurface(color)).toBe(true);
  for (const color of [
    'rgb(6, 6, 6)',
    'rgba(255, 255, 255, 0.1)',
    'rgba(0, 0, 0, 0)',
    'transparent',
  ])
    expect(isLightHeaderSurface(color)).toBe(false);
});
