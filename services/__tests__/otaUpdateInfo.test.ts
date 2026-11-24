/**
 * otaUpdateInfo.test.ts
 *
 * Covers the pure formatting behind the OTA line on the Settings version row.
 */

import {
  formatOtaUpdateInfo,
  getOtaUpdateInfo,
  type OtaUpdateSource,
} from '../otaUpdateInfo';

const source = (overrides: Partial<OtaUpdateSource> = {}): OtaUpdateSource => ({
  isEnabled: true,
  isEmbeddedLaunch: false,
  updateId: '3f2a9c1b-7d4e-4a55-9b0c-1234567890ab',
  // Local noon, so the local calendar date is the same in every time zone.
  createdAt: new Date(2026, 10, 20, 12, 0, 0),
  ...overrides,
});

describe('getOtaUpdateInfo', () => {
  it('describes a running OTA update', () => {
    expect(getOtaUpdateInfo(source())).toEqual({
      shortId: '3f2a9c1b',
      publishedOn: '2026-11-20',
    });
  });

  it('returns null on the bundle embedded in the store build', () => {
    expect(getOtaUpdateInfo(source({ isEmbeddedLaunch: true }))).toBeNull();
  });

  it('returns null when expo-updates is disabled', () => {
    expect(getOtaUpdateInfo(source({ isEnabled: false }))).toBeNull();
  });

  it.each([null, undefined, ''])('returns null for update id %p', (updateId) => {
    expect(getOtaUpdateInfo(source({ updateId }))).toBeNull();
  });

  it.each([null, undefined, new Date('nope')])(
    'leaves the date out for createdAt %p',
    (createdAt) => {
      expect(getOtaUpdateInfo(source({ createdAt }))).toEqual({
        shortId: '3f2a9c1b',
        publishedOn: null,
      });
    },
  );
});

describe('formatOtaUpdateInfo', () => {
  it('joins id and date', () => {
    expect(
      formatOtaUpdateInfo({ shortId: '3f2a9c1b', publishedOn: '2026-11-20' }),
    ).toBe('OTA 3f2a9c1b · 2026-11-20');
  });

  it('omits an unknown date', () => {
    expect(formatOtaUpdateInfo({ shortId: '3f2a9c1b', publishedOn: null })).toBe(
      'OTA 3f2a9c1b',
    );
  });
});
