import {
  readSettings,
  watchSettings,
  writeSettings,
} from '../../src/utils/preferences';
import type { Settings } from '../../src/utils/settings';
import './style.css';
import { browser } from 'wxt/browser';
import { registerTypography } from '../../src/utils/fonts';
import { normalizeLinkColor } from '../../src/utils/color';
import { initializeBannerControls } from '../../src/utils/popup-banners';

registerTypography(document.fonts, (path) => browser.runtime.getURL(path));
const color = document.querySelector<HTMLInputElement>('#link-color')!;
const presets = [...document.querySelectorAll<HTMLButtonElement>('.preset')];

const toggle = document.querySelector<HTMLButtonElement>('#enabled')!;
const label = document.querySelector<HTMLElement>('#switch-text')!;
const status = document.querySelector<HTMLElement>('#status')!;
let settings: Settings;
let saving = false;
let revision = 0;

function render(value: Settings): void {
  settings = value;
  color.value = value.linkColor;
  for (const preset of presets) {
    preset.setAttribute(
      'aria-pressed',
      String(preset.dataset.color === value.linkColor),
    );
  }
  toggle.setAttribute('aria-checked', String(value.enabled));
  label.textContent = value.enabled ? 'On' : 'Off';
  status.textContent = value.enabled
    ? 'Dark theme is enabled.'
    : 'Original MyCourses appearance.';
}

const stopWatching = watchSettings((value) => {
  revision++;
  render(value);
});
window.addEventListener('pagehide', stopWatching, { once: true });

async function initialize(): Promise<void> {
  const initialRevision = revision;
  try {
    const value = await readSettings();
    if (revision === initialRevision) render(value);
    toggle.disabled = false;
    color.disabled = false;
    for (const preset of presets) preset.disabled = false;
  } catch {
    status.textContent =
      'Could not load preference. Reopen the popup to retry.';
  }
}

async function save(next: Settings): Promise<void> {
  if (saving) return;
  saving = true;
  toggle.disabled = true;
  color.disabled = true;
  for (const preset of presets) preset.disabled = true;
  status.textContent = 'Saving preference...';
  try {
    await writeSettings(next);
    render(next);
  } catch {
    render(settings);
    status.textContent = 'Could not save. Please try again.';
  } finally {
    saving = false;
    toggle.disabled = false;
    color.disabled = false;
    for (const preset of presets) preset.disabled = false;
  }
}
toggle.addEventListener('click', () => {
  void save({ ...settings, enabled: !settings.enabled });
});
color.addEventListener('change', () => {
  void save({ ...settings, linkColor: normalizeLinkColor(color.value) });
});
for (const preset of presets) {
  preset.disabled = true;
  preset.addEventListener('click', () => {
    void save({
      ...settings,
      linkColor: normalizeLinkColor(preset.dataset.color),
    });
  });
}

void initialize();
initializeBannerControls();
