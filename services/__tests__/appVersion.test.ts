/**
 * appVersion.test.ts
 *
 * Covers the pure decision logic behind the in-app "update available" notice:
 * semver parsing/comparison, banner vs. blocking states, dismissal, and the
 * guards against bad `app_config` data.
 */

import {
  compareVersions,
  evaluateUpdate,
  parseVersion,
  type AppConfigRecord,
} from '../appVersion';

const config = (overrides: Partial<AppConfigRecord> = {}): AppConfigRecord => ({
  platform: 'ios',
  latest_version: '1.15.0',
  min_version: '',
  store_url: 'https://apps.apple.com/app/id123',
  message: '',
  ...overrides,
});

describe('parseVersion', () => {
  it('parses strict x.y.z', () => {
    expect(parseVersion('1.14.0')).toEqual([1, 14, 0]);
    expect(parseVersion(' 10.0.21 ')).toEqual([10, 0, 21]);
  });

  it.each(['1.14', 'v1.14.0', '1.14.0-beta', '1.14.x', '', null, undefined])(
    'rejects %p',
    (value) => {
      expect(parseVersion(value)).toBeNull();
    },
  );
});

describe('compareVersions', () => {
  it('compares numerically, not lexically', () => {
    expect(compareVersions('1.9.0', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareVersions('1.14.0', '1.14.0')).toBe(0);
  });

  it('returns null when either side is unparseable', () => {
    expect(compareVersions('1.14', '1.14.0')).toBeNull();
    expect(compareVersions('1.14.0', 'latest')).toBeNull();
  });
});

describe('evaluateUpdate', () => {
  const base = { installedVersion: '1.14.0', dismissedVersion: null };

  it('returns null without a config row', () => {
    expect(evaluateUpdate({ ...base, config: null })).toBeNull();
  });

  it('returns null when up to date or ahead of the store (e.g. in review)', () => {
    expect(evaluateUpdate({ ...base, config: config({ latest_version: '1.14.0' }) })).toBeNull();
    expect(evaluateUpdate({ ...base, config: config({ latest_version: '1.13.2' }) })).toBeNull();
  });

  it('returns an available update when behind latest_version', () => {
    expect(evaluateUpdate({ ...base, config: config() })).toEqual({
      status: 'available',
      latestVersion: '1.15.0',
      storeUrl: 'https://apps.apple.com/app/id123',
      message: null,
    });
  });

  it('passes through a trimmed custom message', () => {
    const result = evaluateUpdate({ ...base, config: config({ message: '  New quiz modes!  ' }) });
    expect(result?.message).toBe('New quiz modes!');
  });

  it('suppresses the banner once that exact version was dismissed', () => {
    expect(
      evaluateUpdate({ ...base, config: config(), dismissedVersion: '1.15.0' }),
    ).toBeNull();
  });

  it('shows the banner again when a newer version ships after a dismissal', () => {
    const result = evaluateUpdate({
      ...base,
      config: config({ latest_version: '1.16.0' }),
      dismissedVersion: '1.15.0',
    });
    expect(result?.status).toBe('available');
    expect(result?.latestVersion).toBe('1.16.0');
  });

  describe('min_version', () => {
    it('is required (and ignores dismissal) when installed < min_version', () => {
      const result = evaluateUpdate({
        ...base,
        config: config({ min_version: '1.14.1' }),
        dismissedVersion: '1.15.0',
      });
      expect(result?.status).toBe('required');
    });

    it('is only available when installed == min_version', () => {
      const result = evaluateUpdate({ ...base, config: config({ min_version: '1.14.0' }) });
      expect(result?.status).toBe('available');
    });

    it('ignores an empty or null min_version', () => {
      expect(evaluateUpdate({ ...base, config: config({ min_version: null }) })?.status).toBe(
        'available',
      );
    });

    it('ignores a min_version above latest_version (misconfiguration)', () => {
      const result = evaluateUpdate({
        ...base,
        config: config({ latest_version: '1.15.0', min_version: '2.0.0' }),
      });
      expect(result?.status).toBe('available');
    });

    it('ignores an unparseable min_version', () => {
      const result = evaluateUpdate({ ...base, config: config({ min_version: 'v1.15' }) });
      expect(result?.status).toBe('available');
    });
  });

  describe('bad data', () => {
    it('returns null for an unparseable installed version', () => {
      expect(evaluateUpdate({ ...base, installedVersion: 'dev', config: config() })).toBeNull();
    });

    it('returns null for an unparseable latest_version', () => {
      expect(evaluateUpdate({ ...base, config: config({ latest_version: '1.15' }) })).toBeNull();
    });

    it.each(['', 'javascript:alert(1)', 'http://apps.apple.com/app/id123', 'itms-apps://x'])(
      'returns null for an unusable store_url %p',
      (storeUrl) => {
        expect(evaluateUpdate({ ...base, config: config({ store_url: storeUrl }) })).toBeNull();
      },
    );
  });
});
