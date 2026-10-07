import { afterEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({
  query: vi.fn(),
  sendMessage: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
}));
vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      id: 'own-extension',
      onMessage: {
        addListener: api.addListener,
        removeListener: api.removeListener,
      },
    },
    tabs: { query: api.query, sendMessage: api.sendMessage },
  },
}));
import {
  BANNER_GEOMETRY_MESSAGE,
  normalizeBannerGeometry,
  readOpenBannerGeometry,
  registerBannerGeometry,
} from '../../src/utils/banner-geometry';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it('accepts only finite banner dimensions for the requested page', () => {
  expect(
    normalizeBannerGeometry(
      { page: 'dashboard', width: 2550.5, height: 300 },
      'dashboard',
    ),
  ).toEqual({ page: 'dashboard', width: 2550.5, height: 300 });
  for (const value of [
    null,
    {},
    { page: 'home', width: 2550, height: 300 },
    { page: 'dashboard', width: Infinity, height: 300 },
    { page: 'dashboard', width: 2550, height: 0 },
    { page: 'dashboard', width: 999999, height: 300 },
  ])
    expect(normalizeBannerGeometry(value, 'dashboard')).toBeUndefined();
});
it('queries only matching tabs in this window and skips unavailable or incorrect pages', async () => {
  api.query.mockResolvedValue([
    { id: 1, lastAccessed: 1 },
    { id: 2, lastAccessed: 2 },
    { id: 3, lastAccessed: 3, discarded: true },
  ]);
  api.sendMessage.mockImplementation(async (id: number) =>
    id === 1
      ? { page: 'dashboard', width: 2550, height: 300 }
      : { page: 'home', width: 900, height: 400 },
  );
  await expect(readOpenBannerGeometry('dashboard')).resolves.toEqual({
    page: 'dashboard',
    width: 2550,
    height: 300,
  });
  expect(api.query).toHaveBeenCalledWith({
    currentWindow: true,
    url: ['https://mycourses.aalto.fi/my/*'],
  });
  expect(api.sendMessage.mock.calls.map((call) => call[0])).toEqual([2, 1]);
  expect(api.sendMessage).toHaveBeenLastCalledWith(
    1,
    { type: BANNER_GEOMETRY_MESSAGE, page: 'dashboard' },
    { frameId: 0 },
  );
  api.query.mockRejectedValue(new Error('Unavailable context'));
  await expect(readOpenBannerGeometry('dashboard')).resolves.toBeUndefined();
});
it('answers only its own extension and the visible banner page, then removes its listener', () => {
  const element = {
    getBoundingClientRect: () => ({ width: 2556, height: 304 }),
  };
  const query = vi.fn().mockReturnValue(element);
  const body = { id: 'page-my-index' };
  vi.stubGlobal('document', { body, querySelector: query });
  vi.stubGlobal('getComputedStyle', () => ({
    borderLeftWidth: '3px',
    borderRightWidth: '3px',
    borderTopWidth: '2px',
    borderBottomWidth: '2px',
  }));
  const stop = registerBannerGeometry();
  const listener = api.addListener.mock.calls[0]![0];
  const respond = vi.fn();
  listener(
    { type: BANNER_GEOMETRY_MESSAGE, page: 'dashboard' },
    { id: 'foreign-extension' },
    respond,
  );
  expect(respond).not.toHaveBeenCalled();
  listener(
    { type: BANNER_GEOMETRY_MESSAGE, page: 'dashboard' },
    { id: 'own-extension' },
    respond,
  );
  expect(respond).toHaveBeenCalledWith({
    page: 'dashboard',
    width: 2550,
    height: 300,
  });
  expect(query).toHaveBeenCalledWith('.aaltouserpageheader');
  body.id = 'page-mod-quiz-attempt';
  respond.mockClear();
  listener(
    { type: BANNER_GEOMETRY_MESSAGE, page: 'dashboard' },
    { id: 'own-extension' },
    respond,
  );
  expect(respond).toHaveBeenCalledWith(null);
  stop();
  expect(api.removeListener).toHaveBeenCalledWith(listener);
});
