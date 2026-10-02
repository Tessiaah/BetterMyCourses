import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  SETTINGS_KEY,
} from '../../src/utils/settings';
import { applyTheme } from '../../src/utils/activation';

const storage = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
}));
vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      sync: { get: storage.get, set: storage.set },
      onChanged: {
        addListener: storage.addListener,
        removeListener: storage.removeListener,
      },
    },
  },
}));
import {
  readSettings,
  watchSettings,
  writeSettings,
} from '../../src/utils/preferences';

beforeEach(() => vi.clearAllMocks());

describe('settings contract', () => {
  it.each([undefined, null, 7, 'bad', {}, { enabled: 'false' }])(
    'uses enabled defaults for malformed value %j',
    (value) => {
      expect(normalizeSettings(value)).toEqual(DEFAULT_SETTINGS);
    },
  );
  it('preserves an explicit disabled preference and normalizes an unsupported theme', () => {
    expect(normalizeSettings({ enabled: false, theme: 'unknown' })).toEqual({
      enabled: false,
      theme: 'inky-black',
      linkColor: DEFAULT_SETTINGS.linkColor,
    });
  });
  it('reads only the settings key and defaults on first installation', async () => {
    storage.get.mockResolvedValue({});
    expect(await readSettings()).toEqual(DEFAULT_SETTINGS);
    expect(storage.get).toHaveBeenCalledWith(SETTINGS_KEY);
  });
  it('stores no course information', async () => {
    storage.set.mockResolvedValue(undefined);
    await writeSettings({ ...DEFAULT_SETTINGS, enabled: false });
    expect(storage.set).toHaveBeenCalledWith({
      [SETTINGS_KEY]: { ...DEFAULT_SETTINGS, enabled: false },
    });
  });
  it('propagates persistence errors for popup recovery', async () => {
    storage.set.mockRejectedValue(new Error('Quota exceeded'));
    await expect(writeSettings({ ...DEFAULT_SETTINGS })).rejects.toThrow(
      'Quota exceeded',
    );
  });
  it('ignores unrelated storage changes and removes its listener on cleanup', () => {
    const callback = vi.fn();
    const stop = watchSettings(callback);
    const listener = storage.addListener.mock.calls[0]![0];
    listener({ [SETTINGS_KEY]: { newValue: { enabled: false } } }, 'local');
    listener({ unrelated: { newValue: 123 } }, 'sync');
    expect(callback).not.toHaveBeenCalled();
    listener({ [SETTINGS_KEY]: { newValue: { enabled: false } } }, 'sync');
    expect(callback).toHaveBeenCalledWith({
      enabled: false,
      theme: 'inky-black',
      linkColor: DEFAULT_SETTINGS.linkColor,
    });
    listener({ [SETTINGS_KEY]: {} }, 'sync');
    expect(callback).toHaveBeenLastCalledWith(DEFAULT_SETTINGS);
    stop();
    expect(storage.removeListener).toHaveBeenCalledWith(listener);
  });
  it('removes its root state completely when disabled', () => {
    const root = {
      dataset: { existing: 'keep' },
      style: { setProperty: vi.fn(), removeProperty: vi.fn() },
    } as unknown as HTMLElement;
    applyTheme(root, { ...DEFAULT_SETTINGS });
    expect(root.dataset.betterMyCourses).toBe('dark');
    applyTheme(root, { ...DEFAULT_SETTINGS, enabled: false });
    expect(root.dataset).toEqual({ existing: 'keep' });
    expect(root.style.removeProperty).toHaveBeenCalledTimes(4);
    expect(root.style.removeProperty).toHaveBeenCalledWith('--bmc-user-link');
  });
});
