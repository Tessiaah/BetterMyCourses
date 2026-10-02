import { expect, it, vi } from 'vitest';
vi.mock('wxt/browser', () => ({ browser: { storage: {} } }));
import {
  applyBanners,
  defaultBanners,
  normalizeBanners,
  MAX_BANNER_LENGTH,
  normalizeCrop,
  bannerPlacement,
} from '../../src/utils/banners';

it('preserves original banners on install and malformed settings', () => {
  for (const value of [undefined, null, {}, 'bad'])
    expect(normalizeBanners(value)).toEqual(defaultBanners());
});

it('migrates old banners to fill and bounds unsafe crop values', () => {
  expect(normalizeCrop(undefined)).toEqual({
    fit: 'fill',
    zoom: 1,
    x: 50,
    y: 50,
  });
  expect(normalizeCrop({ fit: 'bad', zoom: Infinity, x: -40, y: 900 })).toEqual(
    { fit: 'fill', zoom: 1, x: 0, y: 100 },
  );
  expect(
    normalizeBanners({
      home: { mode: 'custom', image: 'data:image/png;base64,AAAA' },
    }).home.crop?.fit,
  ).toBe('fill');
});
it('fills, fits and stretches without losing the source aspect ratio in fill or fit', () => {
  const crop = { fit: 'fill' as const, zoom: 1, x: 50, y: 50 };
  const fill = bannerPlacement(1000, 500, 2000, 400, crop);
  expect(fill).toMatchObject({ width: 2000, height: 1000, left: 0, top: -300 });
  expect(
    bannerPlacement(1000, 500, 2000, 400, { ...crop, fit: 'fit' }),
  ).toMatchObject({ width: 800, height: 400, left: 600, top: 0 });
  expect(
    bannerPlacement(1000, 500, 2000, 400, { ...crop, fit: 'stretch' }),
  ).toMatchObject({ width: 2000, height: 400, left: 0, top: 0 });
  expect(
    bannerPlacement(1000, 500, 2000, 400, { ...crop, zoom: 2, x: 100, y: 0 }),
  ).toMatchObject({ width: 4000, height: 2000, left: -2000, top: -0 });
  for (const width of [390, 1366, 1440, 1920]) {
    const layout = bannerPlacement(1000, 500, width, 180, crop);
    expect(layout.width).toBeGreaterThanOrEqual(width);
    expect(layout.height).toBeGreaterThanOrEqual(180);
    expect(layout.width / layout.height).toBe(2);
  }
});
it('allows only bounded local raster images and rejects remote URLs or SVG', () => {
  for (const image of [
    'https://example.org/image.jpg',
    'data:image/svg+xml;base64,AAAA',
    'data:image/png;base64,' + 'A'.repeat(MAX_BANNER_LENGTH),
  ])
    expect(
      normalizeBanners({ home: { mode: 'custom', image } }).home.mode,
    ).toBe('original');
  expect(
    normalizeBanners({
      home: { mode: 'custom', image: 'data:image/webp;base64,AAAA' },
    }).home.mode,
  ).toBe('custom');
});
it('handles independent page preferences and cleans owned state when disabled', () => {
  const root = {
    dataset: { unrelated: 'keep' },
    style: { setProperty: vi.fn(), removeProperty: vi.fn() },
  } as unknown as HTMLElement;
  const settings = normalizeBanners({
    home: { mode: 'plain' },
    dashboard: { mode: 'custom', image: 'data:image/png;base64,AAAA' },
  });
  applyBanners(root, settings, true);
  expect(root.dataset.bmcHomeBanner).toBe('plain');
  expect(root.dataset.bmcDashboardBanner).toBe('custom');
  expect(root.style.setProperty).toHaveBeenCalledWith(
    '--bmc-dashboard-banner',
    'url("data:image/png;base64,AAAA")',
  );
  applyBanners(root, settings, false);
  expect(root.dataset).toEqual({ unrelated: 'keep' });
  expect(root.style.removeProperty).toHaveBeenCalledWith(
    '--bmc-dashboard-banner',
  );
  expect(root.style.removeProperty).toHaveBeenCalledWith(
    '--bmc-dashboard-banner-size',
  );
  expect(root.style.removeProperty).toHaveBeenCalledWith(
    '--bmc-dashboard-banner-position',
  );
});
