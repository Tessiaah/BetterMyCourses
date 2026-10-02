import { browser } from 'wxt/browser';
import { normalizeSettings, SETTINGS_KEY, type Settings } from './settings';

export async function readSettings(): Promise<Settings> {
  const result = await browser.storage.sync.get(SETTINGS_KEY);
  return normalizeSettings(result[SETTINGS_KEY]);
}

export async function writeSettings(settings: Settings): Promise<void> {
  await browser.storage.sync.set({
    [SETTINGS_KEY]: normalizeSettings(settings),
  });
}

export function watchSettings(
  onChange: (settings: Settings) => void,
): () => void {
  const listener: Parameters<
    typeof browser.storage.onChanged.addListener
  >[0] = (changes, area) => {
    if (area === 'sync' && SETTINGS_KEY in changes) {
      onChange(normalizeSettings(changes[SETTINGS_KEY]?.newValue));
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
