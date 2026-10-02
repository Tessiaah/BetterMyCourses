import {
  defaultBanners,
  prepareBanner,
  readBanners,
  watchBanners,
  writeBanners,
  type BannerPage,
  type Banners,
  type Banner,
} from './banners';
import { browser } from 'wxt/browser';

export function initializeBannerControls(): void {
  document.getElementById('banner-editor')!.addEventListener('click', () => {
    void browser.runtime.openOptionsPage();
  });
  const status = document.querySelector<HTMLElement>('#banner-status')!;
  const groups = [
    ...document.querySelectorAll<HTMLFieldSetElement>('[data-banner-page]'),
  ];
  let banners = defaultBanners();
  let ready = false;
  let saving = false;
  let revision = 0;
  function render(value: Banners): void {
    banners = value;
    for (const group of groups) {
      const banner = value[group.dataset.bannerPage as BannerPage];
      const select = group.querySelector<HTMLSelectElement>('select')!;
      select.value = banner.mode;
      select.disabled = !ready || saving;
      select.querySelector<HTMLOptionElement>('[value="custom"]')!.disabled =
        !banner.image;
      group.querySelector<HTMLInputElement>('input')!.disabled =
        !ready || saving;
      group.querySelector<HTMLButtonElement>('button')!.disabled =
        !ready || saving || (banner.mode === 'original' && !banner.image);
      const preview = group.querySelector<HTMLImageElement>('img')!;
      preview.hidden = banner.mode !== 'custom';
      if (banner.image) preview.src = banner.image;
      else preview.removeAttribute('src');
    }
  }
  const stop = watchBanners((value) => {
    revision++;
    render(value);
  });
  window.addEventListener('pagehide', stop, { once: true });
  const initialRevision = revision;
  void readBanners()
    .then((value) => {
      ready = true;
      render(revision === initialRevision ? value : banners);
    })
    .catch(() => {
      status.textContent = 'Could not load banners. Reopen the popup to retry.';
    });

  async function save(
    page: BannerPage,
    create: () => Promise<Banner>,
  ): Promise<void> {
    if (!ready || saving) return;
    saving = true;
    render(banners);
    status.textContent = 'Saving banner...';
    try {
      const banner = await create();
      const next = { ...(await readBanners()), [page]: banner };
      await writeBanners(next);
      render(next);
      status.textContent = `${page === 'home' ? 'Home' : 'Dashboard'} banner saved on this device.`;
    } catch (error) {
      status.textContent =
        error instanceof Error && /Choose|image is too/.test(error.message)
          ? error.message
          : 'Could not save banner. Try another image or retry.';
    } finally {
      saving = false;
      render(banners);
    }
  }
  for (const group of groups) {
    const page = group.dataset.bannerPage as BannerPage;
    const select = group.querySelector<HTMLSelectElement>('select')!;
    const file = group.querySelector<HTMLInputElement>('input')!;
    select.addEventListener('change', () => {
      const mode = select.value as Banner['mode'];
      void save(page, async () => ({ ...banners[page], mode }));
    });
    file.addEventListener('change', () => {
      const selected = file.files?.[0];
      if (!selected) return;
      void save(page, async () => ({
        mode: 'custom',
        image: await prepareBanner(selected),
      })).finally(() => {
        file.value = '';
      });
    });
    group.querySelector('button')!.addEventListener('click', () => {
      void save(page, async () => ({ mode: 'original', image: '' }));
    });
  }
}
