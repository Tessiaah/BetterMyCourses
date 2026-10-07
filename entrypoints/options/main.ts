import { browser } from 'wxt/browser';
import { registerTypography } from '../../src/utils/fonts';
import {
  bannerPlacement,
  defaultCrop,
  normalizeCrop,
  prepareBanner,
  readBanners,
  writeBanners,
  type Banner,
  type BannerPage,
} from '../../src/utils/banners';
import './style.css';
import {
  bannerBox,
  readOpenBannerGeometry,
  type BannerGeometry,
} from '../../src/utils/banner-geometry';

registerTypography(document.fonts, (path) => browser.runtime.getURL(path));
const get = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const page = get<HTMLSelectElement>('page');
const preview = get<HTMLDivElement>('preview');
const status = get<HTMLParagraphElement>('status');
const file = get<HTMLInputElement>('file');
const fit = get<HTMLSelectElement>('fit');
const sliders = ['zoom', 'x', 'y'].map((id) => get<HTMLInputElement>(id));
const save = get<HTMLButtonElement>('save');
const cancel = get<HTMLButtonElement>('cancel');
let draft: Banner = { mode: 'original', image: '' };
let image = new Image();
let dirty = false;
let busy = true;
let generation = 0;
let activePage: BannerPage = 'home';
const drafts = new Map<BannerPage, Banner>();
let geometry: BannerGeometry | undefined;
let sizeRevision = 0;
let disposed = false;
function renderShape() {
  const matched = geometry?.page === activePage ? geometry : undefined;
  preview.style.aspectRatio = String(
    matched ? matched.width / matched.height : 4.8,
  );
  const name = activePage === 'home' ? 'Home' : 'Dashboard';
  get('preview-size').textContent = matched
    ? `${name} preview matches the open page (${Math.round(matched.width)} × ${Math.round(matched.height)}).`
    : `Open ${name} in this browser window to preview its exact crop. Showing an approximate size until then.`;
}
async function refreshPreviewSize() {
  const revision = ++sizeRevision;
  const requestedPage = activePage;
  const measured = await readOpenBannerGeometry(requestedPage);
  if (disposed || revision !== sizeRevision || requestedPage !== activePage)
    return;
  geometry = measured;
  render();
}
function render() {
  renderShape();
  const crop = normalizeCrop(draft.crop);
  fit.value = crop.fit;
  sliders.forEach((input) => {
    const key = input.id as 'zoom' | 'x' | 'y';
    input.value = String(crop[key]);
    get<HTMLOutputElement>(`${key}-value`).value =
      key === 'zoom' ? `${crop[key].toFixed(2)}×` : `${Math.round(crop[key])}%`;
  });
  get<HTMLFieldSetElement>('crop-controls').disabled = busy || !draft.image;
  save.disabled = busy || !dirty || !draft.image;
  cancel.disabled = busy || !dirty;
  page.disabled = busy;
  file.disabled = busy;
  get('empty').hidden = !!draft.image;
  get('fit-help').textContent =
    crop.fit === 'fit'
      ? 'Shows the complete image. Different aspect ratios leave black space.'
      : crop.fit === 'stretch'
        ? 'Fills every edge by stretching the image. Proportions may change.'
        : 'Fill uses the entire banner without distorting the image.';
  preview.style.backgroundImage = draft.image
    ? `url("${draft.image}")`
    : 'none';
  if (draft.image && image.naturalWidth) {
    const box = bannerBox(preview);
    const layout = bannerPlacement(
      image.naturalWidth,
      image.naturalHeight,
      box.width,
      box.height,
      crop,
    );
    preview.style.backgroundSize = layout.size;
    preview.style.backgroundPosition = layout.position;
  }
}
async function decode() {
  const revision = ++generation;
  const next = new Image();
  next.src = draft.image;
  if (draft.image) await next.decode();
  if (revision === generation) {
    image = next;
    render();
  }
}
async function load() {
  activePage = page.value as BannerPage;
  geometry = undefined;
  void refreshPreviewSize();
  busy = true;
  render();
  try {
    const banners = await readBanners();
    draft = { ...(drafts.get(activePage) ?? banners[activePage]) };
    dirty = drafts.has(activePage);
    await decode();
    status.textContent = draft.image
      ? 'Adjust the framing, then save your banner.'
      : 'Choose an image to start editing.';
  } catch {
    status.textContent =
      'Could not load the banner. Reopen this page to retry.';
  } finally {
    busy = false;
    render();
  }
}
page.addEventListener('change', () => {
  if (dirty) drafts.set(activePage, { ...draft });
  void load();
});
fit.addEventListener('change', () => {
  draft.crop = {
    ...normalizeCrop(draft.crop),
    fit: fit.value as 'fill' | 'fit' | 'stretch',
  };
  dirty = true;
  render();
});
sliders.forEach((input) =>
  input.addEventListener('input', () => {
    draft.crop = {
      ...normalizeCrop(draft.crop),
      [input.id]: Number(input.value),
    };
    dirty = true;
    render();
  }),
);
get('reset').addEventListener('click', () => {
  draft.crop = defaultCrop();
  dirty = true;
  render();
});
const refreshGeometry = () => void refreshPreviewSize();
window.addEventListener('focus', refreshGeometry);
window.addEventListener('resize', refreshGeometry, { passive: true });
file.addEventListener('change', async () => {
  const selected = file.files?.[0];
  if (!selected) return;
  busy = true;
  render();
  status.textContent = 'Preparing image...';
  try {
    const source = await prepareBanner(selected);
    draft = { mode: 'custom', image: source, crop: defaultCrop() };
    await decode();
    dirty = true;
    status.textContent = 'Image ready. Adjust the framing, then save.';
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : 'Could not open this image.';
  } finally {
    busy = false;
    file.value = '';
    render();
  }
});
save.addEventListener('click', async () => {
  busy = true;
  render();
  status.textContent = 'Saving banner...';
  try {
    const banners = await readBanners();
    await writeBanners({
      ...banners,
      [page.value]: { ...draft, mode: 'custom' },
    });
    dirty = false;
    drafts.delete(activePage);
    status.textContent =
      'Banner saved. Your open MyCourses page updates automatically.';
  } catch {
    status.textContent =
      'Could not save the banner. Your changes are still here; try again.';
  } finally {
    busy = false;
    render();
  }
});
cancel.addEventListener('click', () => {
  drafts.delete(activePage);
  void load();
});
let drag:
  | {
      pointer: number;
      x: number;
      y: number;
      crop: ReturnType<typeof defaultCrop>;
    }
  | undefined;
preview.addEventListener('pointerdown', (event) => {
  if (!draft.image || busy || !image.naturalWidth) return;
  drag = {
    pointer: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    crop: normalizeCrop(draft.crop),
  };
  preview.setPointerCapture(event.pointerId);
});
preview.addEventListener('pointermove', (event) => {
  if (!drag || drag.pointer !== event.pointerId) return;
  const { width, height } = bannerBox(preview);
  const layout = bannerPlacement(
    image.naturalWidth,
    image.naturalHeight,
    width,
    height,
    drag.crop,
  );
  const position = (start: number, delta: number, remaining: number) =>
    Math.abs(remaining) < 1
      ? start
      : Math.min(100, Math.max(0, start + (delta / remaining) * 100));
  draft.crop = {
    ...drag.crop,
    x: position(drag.crop.x, event.clientX - drag.x, width - layout.width),
    y: position(drag.crop.y, event.clientY - drag.y, height - layout.height),
  };
  dirty = true;
  render();
});
preview.addEventListener('lostpointercapture', () => {
  drag = undefined;
});
preview.addEventListener('pointerup', (event) => {
  if (preview.hasPointerCapture(event.pointerId))
    preview.releasePointerCapture(event.pointerId);
});
const observer = new ResizeObserver(render);
observer.observe(preview);
window.addEventListener(
  'pagehide',
  () => {
    disposed = true;
    sizeRevision++;
    observer.disconnect();
    window.removeEventListener('focus', refreshGeometry);
    window.removeEventListener('resize', refreshGeometry);
  },
  { once: true },
);
window.addEventListener('beforeunload', (event) => {
  if (dirty || drafts.size) {
    event.preventDefault();
    event.returnValue = '';
  }
});
void load();
