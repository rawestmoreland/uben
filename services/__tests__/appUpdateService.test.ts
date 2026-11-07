/**
 * appUpdateService.test.ts
 *
 * Covers fetching the `app_config` row, the once-a-day cache, offline
 * fallback (a cached mandatory update must still be enforced), dismissal and
 * the "never throws" contract.
 */

import { appUpdateService } from '../appUpdateService';

jest.mock('@/services/settingsService', () => ({
  SETTINGS_KEYS: {
    APP_UPDATE_CACHE: 'app_update_cache',
    APP_UPDATE_DISMISSED_VERSION: 'app_update_dismissed_version',
  },
  settingsService: { getSetting: jest.fn(), setSetting: jest.fn() },
}));

let mockPbUrl: string = 'http://test.example.com';
let mockPbApiKey: string | undefined = 'test-api-key';

jest.mock('@/constants/pocketbase', () => ({
  get PB_URL() {
    return mockPbUrl;
  },
  get PB_API_KEY() {
    return mockPbApiKey;
  },
}));

const mockSettings = jest.requireMock('@/services/settingsService').settingsService;

const DAY_MS = 24 * 60 * 60 * 1000;

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'abc',
  platform: 'ios',
  latest_version: '1.15.0',
  min_version: '',
  store_url: 'https://apps.apple.com/app/id123',
  message: '',
  ...overrides,
});

const fetchOk = (items: unknown[]) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ items }) });

/** Back the mocked settings table with a plain object. */
function useSettingsStore(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  mockSettings.getSetting.mockImplementation((key: string) =>
    Promise.resolve(store[key] ?? null),
  );
  mockSettings.setSetting.mockImplementation((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  });
  return store;
}

describe('appUpdateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPbUrl = 'http://test.example.com';
    mockPbApiKey = 'test-api-key';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn().mockImplementation(() => fetchOk([row()]));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('check()', () => {
    it('fetches this platform and reports an available update', async () => {
      useSettingsStore();

      const result = await appUpdateService.check('ios', '1.14.0');

      expect(result).toEqual({
        status: 'available',
        latestVersion: '1.15.0',
        storeUrl: 'https://apps.apple.com/app/id123',
        message: null,
      });
      const url = decodeURIComponent((global.fetch as jest.Mock).mock.calls[0][0]);
      expect(url).toContain('/api/collections/app_config/records?');
      expect(url).toContain("filter=(platform='ios')");
      expect(url).toContain('key=test-api-key');
    });

    it('returns null when already up to date', async () => {
      useSettingsStore();
      expect(await appUpdateService.check('ios', '1.15.0')).toBeNull();
    });

    it('returns null and caches the miss when PocketBase has no row', async () => {
      const store = useSettingsStore();
      global.fetch = jest.fn().mockImplementation(() => fetchOk([]));

      expect(await appUpdateService.check('android', '1.14.0')).toBeNull();
      expect(JSON.parse(store.app_update_cache).config).toBeNull();
    });

    it('does not require PB_API_KEY (collection is public) and omits it', async () => {
      useSettingsStore();
      mockPbApiKey = undefined;

      await appUpdateService.check('ios', '1.14.0');

      const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(url).not.toContain('key=');
    });

    it('skips the network entirely when PB_URL is empty', async () => {
      useSettingsStore();
      mockPbUrl = '';

      expect(await appUpdateService.check('ios', '1.14.0')).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('caching', () => {
    it('uses the cache without fetching within 24 hours', async () => {
      useSettingsStore({
        app_update_cache: JSON.stringify({ checkedAt: Date.now() - DAY_MS / 2, config: row() }),
      });

      const result = await appUpdateService.check('ios', '1.14.0');

      expect(result?.status).toBe('available');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('re-fetches once the cache is older than 24 hours', async () => {
      const store = useSettingsStore({
        app_update_cache: JSON.stringify({
          checkedAt: Date.now() - DAY_MS - 1000,
          config: row({ latest_version: '1.14.0' }),
        }),
      });

      const result = await appUpdateService.check('ios', '1.14.0');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result?.latestVersion).toBe('1.15.0');
      expect(JSON.parse(store.app_update_cache).config.latest_version).toBe('1.15.0');
    });

    it('keeps enforcing a cached mandatory update while offline', async () => {
      useSettingsStore({
        app_update_cache: JSON.stringify({
          checkedAt: Date.now() - 2 * DAY_MS,
          config: row({ min_version: '1.14.5' }),
        }),
      });
      global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));

      const result = await appUpdateService.check('ios', '1.14.0');

      expect(result?.status).toBe('required');
    });

    it('does not refresh the cache timestamp when the fetch fails', async () => {
      const stale = JSON.stringify({ checkedAt: Date.now() - 2 * DAY_MS, config: row() });
      const store = useSettingsStore({ app_update_cache: stale });
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

      await appUpdateService.check('ios', '1.14.0');

      expect(store.app_update_cache).toBe(stale);
    });

    it('ignores a corrupt cache and fetches', async () => {
      useSettingsStore({ app_update_cache: '{not json' });

      const result = await appUpdateService.check('ios', '1.14.0');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(result?.status).toBe('available');
    });
  });

  describe('failure handling', () => {
    it('resolves null on a network error with no cache', async () => {
      useSettingsStore();
      global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed'));

      await expect(appUpdateService.check('ios', '1.14.0')).resolves.toBeNull();
    });

    it('resolves null on a non-OK response', async () => {
      useSettingsStore();
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

      await expect(appUpdateService.check('ios', '1.14.0')).resolves.toBeNull();
    });

    it('resolves null instead of throwing when the settings table fails', async () => {
      mockSettings.getSetting.mockRejectedValue(new Error('db closed'));

      await expect(appUpdateService.check('ios', '1.14.0')).resolves.toBeNull();
    });
  });

  describe('dismiss()', () => {
    it('hides the banner for that version but not a newer one', async () => {
      useSettingsStore();

      await appUpdateService.dismiss('1.15.0');
      expect(await appUpdateService.check('ios', '1.14.0')).toBeNull();

      global.fetch = jest
        .fn()
        .mockImplementation(() => fetchOk([row({ latest_version: '1.16.0' })]));
      // Force a re-fetch by expiring the cache.
      const cache = JSON.parse(
        (await mockSettings.getSetting('app_update_cache')) as string,
      );
      await mockSettings.setSetting(
        'app_update_cache',
        JSON.stringify({ ...cache, checkedAt: Date.now() - 2 * DAY_MS }),
      );

      const result = await appUpdateService.check('ios', '1.14.0');
      expect(result?.latestVersion).toBe('1.16.0');
    });

    it('never throws when saving fails', async () => {
      mockSettings.setSetting.mockRejectedValue(new Error('db closed'));
      await expect(appUpdateService.dismiss('1.15.0')).resolves.toBeUndefined();
    });
  });
});
