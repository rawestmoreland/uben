/**
 * purchaseService.test.ts
 *
 * Covers the one-time grandfather migration (Üben Pro bundle, issue #69):
 * users who already had B1+ selected, or already had more than the new
 * free word cap, before the Pro bundle shipped must keep that access.
 *
 * Mock objects are defined INSIDE their factory functions, not as external
 * variables, because jest.mock() factories run when the mocked module is
 * first required — before any module-level variable declarations below the
 * import have executed. References to the mock internals are obtained via
 * jest.requireMock() after the factories have already run.
 */

import { PRO_FREE_WORD_LIMIT, purchaseService } from '../purchaseService';

jest.mock('@/database/db', () => {
  const db = { getFirstAsync: jest.fn() };
  return { getDatabase: () => db };
});

jest.mock('../settingsService', () => ({
  settingsService: {
    getProGrandfatherMigrationDone: jest.fn(),
    setProGrandfatherMigrationDone: jest.fn(),
    getSelectedLevels: jest.fn(),
    getGrandfatheredBLevel: jest.fn(),
    setGrandfatheredBLevel: jest.fn(),
    getGrandfatheredWordCap: jest.fn(),
    setGrandfatheredWordCap: jest.fn(),
    getProUnlocked: jest.fn(),
    setProUnlocked: jest.fn(),
  },
}));

const mockDb = jest.requireMock('@/database/db').getDatabase();
const mockSettingsService = jest.requireMock('../settingsService').settingsService;

describe('purchaseService.runProGrandfatherMigration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSettingsService.getProGrandfatherMigrationDone.mockResolvedValue(false);
    mockSettingsService.getSelectedLevels.mockResolvedValue(['A1']);
    mockDb.getFirstAsync.mockResolvedValue({ count: 0 });
  });

  it('no-ops if the migration has already run', async () => {
    mockSettingsService.getProGrandfatherMigrationDone.mockResolvedValue(true);

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.getSelectedLevels).not.toHaveBeenCalled();
    expect(mockSettingsService.setGrandfatheredBLevel).not.toHaveBeenCalled();
  });

  it('grandfathers B-level access when the user already had B1+ selected', async () => {
    mockSettingsService.getSelectedLevels.mockResolvedValue(['A1', 'A2', 'B1+']);

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.setGrandfatheredBLevel).toHaveBeenCalledWith(true);
    expect(mockSettingsService.setProGrandfatherMigrationDone).toHaveBeenCalledWith(true);
  });

  it('does not grandfather B-level access when B1+ was never selected', async () => {
    mockSettingsService.getSelectedLevels.mockResolvedValue(['A1', 'A2']);

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.setGrandfatheredBLevel).not.toHaveBeenCalled();
  });

  it('grandfathers the word cap when the user already exceeded it', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: PRO_FREE_WORD_LIMIT + 1 });

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.setGrandfatheredWordCap).toHaveBeenCalledWith(true);
  });

  it('does not grandfather the word cap when the user is at or under the limit', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: PRO_FREE_WORD_LIMIT });

    await purchaseService.runProGrandfatherMigration();

    expect(mockSettingsService.setGrandfatheredWordCap).not.toHaveBeenCalled();
  });
});

describe('purchaseService.isProUnlocked', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is true when the user unlocked Pro directly', async () => {
    mockSettingsService.getProUnlocked.mockResolvedValue(true);

    await expect(purchaseService.isProUnlocked()).resolves.toBe(true);
  });

  it('is false when Pro was never unlocked', async () => {
    mockSettingsService.getProUnlocked.mockResolvedValue(false);

    await expect(purchaseService.isProUnlocked()).resolves.toBe(false);
  });
});
