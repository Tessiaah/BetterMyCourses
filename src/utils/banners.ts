import { browser } from 'wxt/browser';

export const BANNERS_KEY = 'betterMyCourses.banners';
export const MAX_BANNER_LENGTH = 2_800_000;
export type BannerPage = 'home' | 'dashboard';
export type Banner = {
  mode: 'original' | 'custom' | 'plain';
  image: string;
  crop?: BannerCrop;
};
export type BannerCrop = {
  fit: 'fill' | 'fit' | 'stretch';
  zoom: number;
  x: number;
  y: number;
};
export const defaultCrop = (): BannerCrop => ({
  fit: 'fill',
  zoom: 1,
  x: 50,
  y: 50,
});
export function normalizeCrop(value: unknown): BannerCrop {
  const c =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const number = (key: string, fallback: number, min: number, max: number) =>
    typeof c[key] === 'number' && Number.isFinite(c[key])
      ? Math.min(max, Math.max(min, c[key] as number))
      : fallback;
  return {
    fit: c.fit === 'fit' || c.fit === 'stretch' ? c.fit : 'fill',
    zoom: number('zoom', 1, 1, 3),
    x: number('x', 50, 0, 100),
    y: number('y', 50, 0, 100),
  };
}
// Shared by the editor and the live banner, including responsive resizing.
export function bannerPlacement(
  width: number,
  height: number,
  boxWidth: number,
  boxHeight: number,
  value?: BannerCrop,
) {
  const crop = normalizeCrop(value);
  const scale =
    crop.fit === 'fit'
      ? Math.min(boxWidth / width, boxHeight / height)
      : Math.max(boxWidth / width, boxHeight / height);
  const w = (crop.fit === 'stretch' ? boxWidth : width * scale) * crop.zoom;
  const h = (crop.fit === 'stretch' ? boxHeight : height * scale) * crop.zoom;
  return {
    width: w,
    height: h,
    left: ((boxWidth - w) * crop.x) / 100,
    top: ((boxHeight - h) * crop.y) / 100,
    size: `${w}px ${h}px`,
    position: `${crop.x}% ${crop.y}%`,
  };
}
export type Banners = Record<BannerPage, Banner>;
export const defaultBanners = (): Banners => ({
  home: { mode: 'original', image: '' },
  dashboard: { mode: 'original', image: '' },
});

function normalizeBanner(value: unknown): Banner {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const image =
    typeof candidate.image === 'string' &&
    candidate.image.length <= MAX_BANNER_LENGTH &&
    /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      candidate.image,
    )
      ? candidate.image
      : '';
  const mode =
    candidate.mode === 'plain'
      ? 'plain'
      : candidate.mode === 'custom' && image
        ? 'custom'
        : 'original';
  return image
    ? { mode, image, crop: normalizeCrop(candidate.crop) }
    : { mode, image };
}
export function normalizeBanners(value: unknown): Banners {
  const candidate =
    typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    home: normalizeBanner(candidate.home),
    dashboard: normalizeBanner(candidate.dashboard),
  };
}
export async function readBanners(): Promise<Banners> {
  const result = await browser.storage.local.get(BANNERS_KEY);
  return normalizeBanners(result[BANNERS_KEY]);
}
export async function writeBanners(value: Banners): Promise<void> {
  await browser.storage.local.set({ [BANNERS_KEY]: normalizeBanners(value) });
}
export function watchBanners(callback: (value: Banners) => void): () => void {
  const listener: Parameters<
    typeof browser.storage.onChanged.addListener
  >[0] = (changes, area) => {
    if (area === 'local' && BANNERS_KEY in changes)
      callback(normalizeBanners(changes[BANNERS_KEY]?.newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
export function applyBanners(
  root: HTMLElement,
  value: Banners,
  enabled: boolean,
): void {
  for (const page of ['home', 'dashboard'] as const) {
    const attribute = page === 'home' ? 'bmcHomeBanner' : 'bmcDashboardBanner';
    const variable = `--bmc-${page}-banner`;
    root.style.removeProperty(variable);
    root.style.removeProperty(`--bmc-${page}-banner-size`);
    root.style.removeProperty(`--bmc-${page}-banner-position`);
    delete root.dataset[attribute];
    if (!enabled || value[page].mode === 'original') continue;
    root.dataset[attribute] = value[page].mode;
    if (value[page].mode === 'custom') {
      root.style.setProperty(variable, `url("${value[page].image}")`);
      const crop = normalizeCrop(value[page].crop);
      root.style.setProperty(
        `--bmc-${page}-banner-size`,
        crop.fit === 'fit'
          ? 'contain'
          : crop.fit === 'stretch'
            ? '100% 100%'
            : 'cover',
      );
      root.style.setProperty(
        `--bmc-${page}-banner-position`,
        `${crop.x}% ${crop.y}%`,
      );
    }
  }
}

// Decode a user-selected raster locally; cap stored images to fit storage.local.
// No remote URLs, SVG scripts, telemetry or additional filesystem permission.
export async function prepareBanner(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > 10_000_000)
    throw new Error('Choose an image smaller than 10 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas
      .getContext('2d')!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/webp', 0.85);
    if (image.length > MAX_BANNER_LENGTH)
      throw new Error('This image is too detailed. Choose a smaller image.');
    return image;
  } finally {
    bitmap.close();
  }
}
