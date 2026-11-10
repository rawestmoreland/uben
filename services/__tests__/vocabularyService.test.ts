/**
 * vocabularyService.test.ts
 *
 * Covers the free-tier word cap enforced by `addUserNoun` (Üben Pro bundle,
 * issue #69) — Pro users and grandfathered users must bypass the cap,
 * everyone else must be blocked once they hit PRO_FREE_WORD_LIMIT.
 *
 * Mock objects are defined INSIDE their factory functions, not as external
 * variables, because jest.mock() factories run when the mocked module is
 * first required — before any module-level variable declarations below the
 * import have executed. References to the mock internals are obtained via
 * jest.requireMock() after the factories have already run.
 */

import { VocabularyService } from '../vocabularyService';

jest.mock('@/database/db', () => {
  const db = {
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    execAsync: jest.fn(),
    withTransactionAsync: jest.fn(),
  };
  return { getDatabase: () => db };
});

jest.mock('@/services/purchaseService', () => ({
  PRO_FREE_WORD_LIMIT: 5,
  purchaseService: {
    isProUnlocked: jest.fn(),
  },
}));

jest.mock('@/services/settingsService', () => ({
  settingsService: {
    getGrandfatheredWordCap: jest.fn(),
  },
}));

const mockDb = jest.requireMock('@/database/db').getDatabase();
const mockPurchaseService = jest.requireMock('@/services/purchaseService').purchaseService;
const mockSettingsService = jest.requireMock('@/services/settingsService').settingsService;

const newNoun = {
  german: 'Tisch',
  article: 'der' as const,
  category_id: 1,
};

describe('vocabularyService.addUserNoun — free-tier word cap', () => {
  let vocabularyService: VocabularyService;

  beforeEach(() => {
    jest.clearAllMocks();
    vocabularyService = new VocabularyService();

    // Default happy-path DB responses: category exists, no duplicate, insert succeeds.
    mockDb.getFirstAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM categories')) return Promise.resolve({ '1': 1 });
      if (sql.includes('FROM nouns WHERE german')) return Promise.resolve(null);
      if (sql.includes('COUNT(*)')) return Promise.resolve({ count: 0 });
      return Promise.resolve(null);
    });
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 42 });
  });

  it('blocks a free-tier user who has already reached the cap', async () => {
    mockPurchaseService.isProUnlocked.mockResolvedValue(false);
    mockSettingsService.getGrandfatheredWordCap.mockResolvedValue(false);
    mockDb.getFirstAsync.mockImplementation((sql: string) => {
      if (sql.includes('COUNT(*)')) return Promise.resolve({ count: 5 });
      return Promise.resolve(null);
    });

    const result = await vocabularyService.addUserNoun(newNoun);

    expect(result.success).toBe(false);
    expect(result.limitReached).toBe(true);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('allows a free-tier user under the cap', async () => {
    mockPurchaseService.isProUnlocked.mockResolvedValue(false);
    mockSettingsService.getGrandfatheredWordCap.mockResolvedValue(false);
    mockDb.getFirstAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM categories')) return Promise.resolve({ '1': 1 });
      if (sql.includes('FROM nouns WHERE german')) return Promise.resolve(null);
      if (sql.includes('COUNT(*)')) return Promise.resolve({ count: 4 });
      return Promise.resolve(null);
    });

    const result = await vocabularyService.addUserNoun(newNoun);

    expect(result.success).toBe(true);
    expect(mockDb.runAsync).toHaveBeenCalled();
  });

  it('bypasses the cap for Pro users', async () => {
    mockPurchaseService.isProUnlocked.mockResolvedValue(true);
    mockSettingsService.getGrandfatheredWordCap.mockResolvedValue(false);
    mockDb.getFirstAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM categories')) return Promise.resolve({ '1': 1 });
      if (sql.includes('FROM nouns WHERE german')) return Promise.resolve(null);
      if (sql.includes('COUNT(*)')) return Promise.resolve({ count: 50 });
      return Promise.resolve(null);
    });

    const result = await vocabularyService.addUserNoun(newNoun);

    expect(result.success).toBe(true);
    expect(mockDb.runAsync).toHaveBeenCalled();
  });

  it('bypasses the cap for grandfathered users', async () => {
    mockPurchaseService.isProUnlocked.mockResolvedValue(false);
    mockSettingsService.getGrandfatheredWordCap.mockResolvedValue(true);
    mockDb.getFirstAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM categories')) return Promise.resolve({ '1': 1 });
      if (sql.includes('FROM nouns WHERE german')) return Promise.resolve(null);
      if (sql.includes('COUNT(*)')) return Promise.resolve({ count: 50 });
      return Promise.resolve(null);
    });

    const result = await vocabularyService.addUserNoun(newNoun);

    expect(result.success).toBe(true);
    expect(mockDb.runAsync).toHaveBeenCalled();
  });
});

describe('vocabularyService.addUserNoun — second article (article_alt)', () => {
  let vocabularyService: VocabularyService;

  beforeEach(() => {
    jest.clearAllMocks();
    vocabularyService = new VocabularyService();
    mockPurchaseService.isProUnlocked.mockResolvedValue(true);
    mockSettingsService.getGrandfatheredWordCap.mockResolvedValue(true);
    mockDb.getFirstAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM categories')) return Promise.resolve({ '1': 1 });
      return Promise.resolve(null);
    });
    mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 7 });
  });

  it('stores the second article alongside the primary one', async () => {
    const result = await vocabularyService.addUserNoun({
      german: 'Gleichgesinnte',
      article: 'der',
      article_alt: 'die',
      category_id: 1,
    });

    expect(result.success).toBe(true);
    const insert = mockDb.runAsync.mock.calls.find(([sql]: [string]) =>
      sql.includes('INSERT INTO nouns'),
    );
    expect(insert[0]).toContain('article_alt');
    expect(insert[1].slice(0, 3)).toEqual(['Gleichgesinnte', 'der', 'die']);
  });

  it('stores NULL when no second article is given', async () => {
    await vocabularyService.addUserNoun({
      german: 'Tisch',
      article: 'der',
      category_id: 1,
    });

    const insert = mockDb.runAsync.mock.calls.find(([sql]: [string]) =>
      sql.includes('INSERT INTO nouns'),
    );
    expect(insert[1].slice(0, 3)).toEqual(['Tisch', 'der', null]);
  });

  it('checks both articles against the stored article and article_alt for duplicates', async () => {
    await vocabularyService.addUserNoun({
      german: 'Gleichgesinnte',
      article: 'der',
      article_alt: 'die',
      category_id: 1,
    });

    const duplicateCheck = mockDb.getFirstAsync.mock.calls.find(
      ([sql]: [string]) => sql.includes('article_alt IN'),
    );
    expect(duplicateCheck[1]).toEqual([
      'Gleichgesinnte',
      'der',
      'die',
      'der',
      'die',
    ]);
  });

  it('rejects a word whose article is already taken as another word\'s second article', async () => {
    mockDb.getFirstAsync.mockImplementation((sql: string) => {
      if (sql.includes('FROM categories')) return Promise.resolve({ '1': 1 });
      if (sql.includes('FROM nouns WHERE german')) {
        return Promise.resolve({ id: 3, is_user_added: 0 });
      }
      return Promise.resolve(null);
    });

    const result = await vocabularyService.addUserNoun({
      german: 'Gleichgesinnte',
      article: 'die',
      category_id: 1,
    });

    expect(result.success).toBe(false);
    expect(result.existingId).toBe(3);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('rejects a second article equal to the first', async () => {
    const result = await vocabularyService.addUserNoun({
      german: 'Tisch',
      article: 'der',
      article_alt: 'der',
      category_id: 1,
    });

    expect(result.success).toBe(false);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('checkNounExists also matches a noun by its second article', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ is_user_added: 1 });

    const result = await vocabularyService.checkNounExists('Gleichgesinnte', 'die');

    expect(result).toEqual({ exists: true, isUserAdded: true });
    const [sql, params] = mockDb.getFirstAsync.mock.calls[0];
    expect(sql).toContain('article_alt = ?');
    expect(params).toEqual(['Gleichgesinnte', 'die', 'die']);
  });
});
