import { bannerPlacement, type Banners } from './banners';
import { bannerBox, pageBanner } from './banner-geometry';

// Observe only the active custom banner's dimensions. No polling, content reads,
// per-element recoloring, or observation of the rest of the Moodle document.
export function createBannerLayout() {
  let current: Banners | undefined;
  let enabled = false;
  let generation = 0;
  let observer: ResizeObserver | undefined;
  let disposed = false;
  function update(value: Banners, active: boolean) {
    current = value;
    enabled = active;
    const revision = ++generation;
    observer?.disconnect();
    if (disposed || !active || document.readyState === 'loading') return;
    const page =
      document.body.id === 'page-site-index'
        ? 'home'
        : document.body.id === 'page-my-index'
          ? 'dashboard'
          : undefined;
    if (!page || value[page].mode !== 'custom') return;
    const element = pageBanner(page);
    if (!element) return;
    const image = new Image();
    image.onload = () => {
      if (disposed || revision !== generation) return;
      const render = () => {
        if (disposed || revision !== generation) return;
        const box = bannerBox(element);
        if (!box.width || !box.height) return;
        const placement = bannerPlacement(
          image.naturalWidth,
          image.naturalHeight,
          box.width,
          box.height,
          value[page].crop,
        );
        document.documentElement.style.setProperty(
          `--bmc-${page}-banner-size`,
          placement.size,
        );
      };
      render();
      observer = new ResizeObserver(render);
      observer.observe(element);
    };
    image.src = value[page].image;
  }
  const ready = () => {
    if (current) update(current, enabled);
  };
  document.addEventListener('DOMContentLoaded', ready, { once: true });
  return {
    update,
    dispose() {
      disposed = true;
      generation++;
      observer?.disconnect();
      document.removeEventListener('DOMContentLoaded', ready);
    },
  };
}
