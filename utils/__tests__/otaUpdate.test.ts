import {
  OTA_CHECK_INTERVAL_MS,
  formatInstalledUpdate,
  isSafeToReload,
  shouldCheckForUpdate,
} from '../otaUpdate';

describe('shouldCheckForUpdate', () => {
  const now = 1_700_000_000_000;

  it('checks when no check has happened yet', () => {
    expect(shouldCheckForUpdate(now, null)).toBe(true);
  });

  it('skips a check inside the interval', () => {
    expect(shouldCheckForUpdate(now, now - 1000)).toBe(false);
    expect(
      shouldCheckForUpdate(now, now - (OTA_CHECK_INTERVAL_MS - 1)),
    ).toBe(false);
  });

  it('checks once the interval has passed', () => {
    expect(shouldCheckForUpdate(now, now - OTA_CHECK_INTERVAL_MS)).toBe(true);
    expect(shouldCheckForUpdate(now, now - 24 * 60 * 60 * 1000)).toBe(true);
  });

  it('checks when the clock moved backwards', () => {
    expect(shouldCheckForUpdate(now, now + 60_000)).toBe(true);
  });

  it('honours a custom interval', () => {
    expect(shouldCheckForUpdate(now, now - 5000, 1000)).toBe(true);
    expect(shouldCheckForUpdate(now, now - 500, 1000)).toBe(false);
  });
});

describe('isSafeToReload', () => {
  it.each(['/', '/index', '/progress', '/reference', '/words', '/settings'])(
    'allows the %s tab',
    (pathname) => {
      expect(isSafeToReload(pathname)).toBe(true);
    },
  );

  it.each([
    '/quiz',
    '/verb-quiz',
    '/plural-quiz',
    '/adjective-quiz',
    '/verb-preposition-quiz',
    '/verb-preposition-compound-quiz',
    '/add-word',
    '/backup',
    '/paywall',
    '/some-future-screen',
  ])('blocks %s', (pathname) => {
    expect(isSafeToReload(pathname)).toBe(false);
  });
});

describe('formatInstalledUpdate', () => {
  it('labels the embedded bundle', () => {
    expect(
      formatInstalledUpdate({
        updateId: null,
        createdAt: null,
        isEmbeddedLaunch: true,
      }),
    ).toBe('embedded');
  });

  it('treats a launch without an update id as embedded', () => {
    expect(
      formatInstalledUpdate({
        updateId: null,
        createdAt: null,
        isEmbeddedLaunch: false,
      }),
    ).toBe('embedded');
  });

  it('shows the short id and UTC creation date of an OTA update', () => {
    expect(
      formatInstalledUpdate({
        updateId: 'a1b2c3d4-0000-4000-8000-000000000000',
        createdAt: new Date('2026-11-20T23:30:00Z'),
        isEmbeddedLaunch: false,
      }),
    ).toBe('update a1b2c3d4 · 2026-11-20');
  });

  it('omits the date when it is missing or invalid', () => {
    const base = {
      updateId: 'a1b2c3d4-0000-4000-8000-000000000000',
      isEmbeddedLaunch: false,
    };
    expect(formatInstalledUpdate({ ...base, createdAt: null })).toBe(
      'update a1b2c3d4',
    );
    expect(
      formatInstalledUpdate({ ...base, createdAt: new Date('nope') }),
    ).toBe('update a1b2c3d4');
  });
});
