/**
 * settingsService.test.ts
 *
 * Covers `getProUnlocked`'s legacy fallback (Üben Pro bundle, issue #69):
 * installs that unlocked the old, adjective-only entitlement before it was
 * folded into the Pro bundle must still read as fully unlocked.
 */

import { settingsService, SETTINGS_KEYS } from '../settingsService';

jest.mock('@/database/db', () => {
  const db = { getFirstAsync: jest.fn(), runAsync: jest.fn() };
  return { getDatabase: () => db };
});

const mockDb = jest.requireMock('@/database/db').getDatabase();

describe('settingsService.getProUnlocked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is true when PRO_UNLOCKED is set', async () => {
    mockDb.getFirstAsync.mockImplementation((_sql: string, [key]: string[]) =>
      Promise.resolve(
        key === SETTINGS_KEYS.PRO_UNLOCKED ? { value: 'true' } : null,
      ),
    );

    await expect(settingsService.getProUnlocked()).resolves.toBe(true);
  });

  it('falls back to the legacy adjective-only unlock for pre-bundle purchasers', async () => {
    mockDb.getFirstAsync.mockImplementation((_sql: string, [key]: string[]) =>
      Promise.resolve(
        key === SETTINGS_KEYS.ADJECTIVE_DECLENSION_UNLOCKED
          ? { value: 'true' }
          : null,
      ),
    );

    await expect(settingsService.getProUnlocked()).resolves.toBe(true);
  });

  it('is false when neither the new nor legacy flag is set', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);

    await expect(settingsService.getProUnlocked()).resolves.toBe(false);
  });
});
