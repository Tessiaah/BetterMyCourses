import { browser } from 'wxt/browser';
import type { BannerPage } from './banners';

export const BANNER_GEOMETRY_MESSAGE = 'betterMyCourses.bannerGeometry';
export type BannerGeometry = {
  page: BannerPage;
  width: number;
  height: number;
};
const selectors: Record<BannerPage, string> = {
  home: '.aaltositepageheader',
  dashboard: '.aaltouserpageheader',
};
export function pageBanner(page: BannerPage): HTMLElement | null {
  return document.querySelector<HTMLElement>(selectors[page]);
}
// CSS backgrounds use the padding box. Keep preview and site measurements equal,
// including fractional dimensions and native borders, without reading pixels.
export function bannerBox(element: HTMLElement) {
  const box = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return {
    width:
      box.width -
      parseFloat(style.borderLeftWidth) -
      parseFloat(style.borderRightWidth),
    height:
      box.height -
      parseFloat(style.borderTopWidth) -
      parseFloat(style.borderBottomWidth),
  };
}
export function normalizeBannerGeometry(
  value: unknown,
  page: BannerPage,
): BannerGeometry | undefined {
  if (!value || typeof value !== 'object') return;
  const candidate = value as Record<string, unknown>;
  if (candidate.page !== page) return;
  for (const key of ['width', 'height']) {
    const dimension = candidate[key];
    if (
      typeof dimension !== 'number' ||
      !Number.isFinite(dimension) ||
      dimension < 1 ||
      dimension > 32768
    )
      return;
  }
  return {
    page,
    width: candidate.width as number,
    height: candidate.height as number,
  };
}
export function registerBannerGeometry(): () => void {
  const listener: Parameters<
    typeof browser.runtime.onMessage.addListener
  >[0] = (message, sender, respond) => {
    if (
      sender.id !== browser.runtime.id ||
      message?.type !== BANNER_GEOMETRY_MESSAGE
    )
      return;
    const page: BannerPage | undefined =
      document.body?.id === 'page-site-index'
        ? 'home'
        : document.body?.id === 'page-my-index'
          ? 'dashboard'
          : undefined;
    if (!page || message.page !== page) {
      respond(null);
      return;
    }
    const element = pageBanner(page);
    respond(
      element
        ? (normalizeBannerGeometry({ page, ...bannerBox(element) }, page) ??
            null)
        : null,
    );
  };
  // Older fixture APIs and unavailable extension contexts keep estimated previews.
  browser.runtime.onMessage?.addListener(listener);
  return () => browser.runtime.onMessage?.removeListener(listener);
}
export async function readOpenBannerGeometry(
  page: BannerPage,
): Promise<BannerGeometry | undefined> {
  try {
    const tabs = await browser.tabs.query({
      currentWindow: true,
      url:
        page === 'home'
          ? [
              'https://mycourses.aalto.fi/',
              'https://mycourses.aalto.fi/?*',
              'https://mycourses.aalto.fi/index.php*',
            ]
          : ['https://mycourses.aalto.fi/my/*'],
    });
    tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
    for (const tab of tabs) {
      if (tab.id === undefined || tab.discarded || tab.frozen) continue;
      try {
        const value = await browser.tabs.sendMessage(
          tab.id,
          { type: BANNER_GEOMETRY_MESSAGE, page },
          { frameId: 0 },
        );
        const geometry = normalizeBannerGeometry(value, page);
        if (geometry) return geometry;
      } catch {
        /* A tab loaded before the extension update may have no listener. */
      }
    }
  } catch {
    /* Missing tab access leaves the explicitly estimated shapes usable. */
  }
}
