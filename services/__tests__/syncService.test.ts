/**
 * syncService.test.ts
 *
 * Mock objects are defined INSIDE their factory functions (not as external
 * variables), because jest.mock() factories run when the mocked module is
 * first required — which happens during the import of syncService, before
 * any module-level variable declarations below the import have executed.
 *
 * References to the mock internals are obtained via jest.requireMock() after
 * the factories have already run.
 */

import { syncService } from '../syncService';

// ── Module mocks ───────────────────────────────────────────────────────────

jest.mock('@/database/db', () => {
  // Self-contained: no external variable references
  const db = {
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    execAsync: jest.fn(),
    withTransactionAsync: jest.fn(),
  };
  return { getDatabase: () => db };
});

jest.mock('@/services/settingsService', () => ({
  settingsService: {
    getSetting: jest.fn(),
    setSetting: jest.fn(),
  },
}));

// Mutable variables for controlling PocketBase config per-test.
// Must start with "mock" so Jest's hoisting plugin allows the reference.
let mockPbUrl: string = 'http://test.example.com';
let mockPbApiKey: string | undefined = 'test-api-key';

jest.mock('@/constants/pocketbase', () => ({
  // Getters are called lazily at test-run time, after the let vars are initialised
  get PB_URL() {
    return mockPbUrl;
  },
  get PB_API_KEY() {
    return mockPbApiKey;
  },
  SYNC_CONFIG: {
    PAGE_SIZE: 200,
    LAST_SYNC_KEYS: {
      categories: 'last_sync_categories',
      nouns: 'last_sync_nouns',
      noun_translations: 'last_sync_noun_translations',
    },
  },
  formatPocketBaseTimestamp: (ts: string) => ts.replace('T', ' '),
}));

// ── References to mock internals ──────────────────────────────────────────
// Resolved after the factories above have run (triggered by the syncService import)

const mockDb = jest.requireMock('@/database/db').getDatabase() as {
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  execAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
};

const mockSettingsService = jest.requireMock(
  '@/services/settingsService',
).settingsService as {
  getSetting: jest.Mock;
  setSetting: jest.Mock;
};

// ── Test helpers ───────────────────────────────────────────────────────────

function makeListResponse<T>(items: T[]) {
  return { page: 1, perPage: 200, totalPages: 1, totalItems: items.length, items };
}

const emptyListResponse = makeListResponse([]);

function makeFetchOk(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response);
}

const sampleCategory = {
  id: 'cat123',
  name: 'animals',
  display_name: 'Animals',
  display_order: 1,
  created: '2026-01-01 00:00:00.000Z',
  updated: '2026-01-01 00:00:00.000Z',
};

const sampleNoun = {
  id: 'noun456',
  german: 'Hund',
  article: 'der' as const,
  plural: 'Hunde',
  english: 'dog',
  level: 'A1',
  category: 'cat123',
  expand: { category: sampleCategory },
  created: '2026-01-01 00:00:00.000Z',
  updated: '2026-01-01 00:00:00.000Z',
};

// ── Test suite ─────────────────────────────────────────────────────────────

describe('syncService.syncIfOnline()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPbUrl = 'http://test.example.com';
    mockPbApiKey = 'test-api-key';

    // Suppress console output during tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Default db behaviours
    mockDb.withTransactionAsync.mockImplementation(
      async (cb: () => Promise<void>) => cb(),
    );
    mockDb.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);

    // Default settings behaviours
    mockSettingsService.getSetting.mockResolvedValue(null);
    mockSettingsService.setSetting.mockResolvedValue(undefined);

    // Default fetch: all three collections return empty lists + count checks
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeFetchOk(emptyListResponse)) // categories
      .mockResolvedValueOnce(makeFetchOk(emptyListResponse)) // nouns
      .mockResolvedValueOnce(makeFetchOk(emptyListResponse)) // noun_translations
      .mockResolvedValueOnce(makeFetchOk({ ...emptyListResponse, totalItems: 0 })) // patchSync: nouns count
      .mockResolvedValueOnce(makeFetchOk({ ...emptyListResponse, totalItems: 0 })); // patchSync: translations count
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Configuration checks ───────────────────────────────────────────────

  describe('configuration checks', () => {
    it('returns skipped when PB_API_KEY is not set', async () => {
      mockPbApiKey = undefined;

      const result = await syncService.syncIfOnline();

      expect(result).toEqual({ status: 'skipped' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns skipped when PB_URL is empty', async () => {
      mockPbUrl = '';

      const result = await syncService.syncIfOnline();

      expect(result).toEqual({ status: 'skipped' });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  // ── Successful sync ────────────────────────────────────────────────────

  describe('successful sync', () => {
    it('returns synced status with zero counts when no data to sync', async () => {
      const result = await syncService.syncIfOnline();

      expect(result).toMatchObject({
        status: 'synced',
        categoriesSynced: 0,
        nounsSynced: 0,
      });
    });

    it('fetches categories before nouns', async () => {
      await syncService.syncIfOnline();

      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls[0][0]).toContain('/api/collections/categories/records');
      expect(calls[1][0]).toContain('/api/collections/nouns/records');
    });

    it('calls getSetting with per-collection keys at start', async () => {
      await syncService.syncIfOnline();

      expect(mockSettingsService.getSetting).toHaveBeenCalledWith(
        'last_sync_categories',
      );
      expect(mockSettingsService.getSetting).toHaveBeenCalledWith(
        'last_sync_nouns',
      );
      expect(mockSettingsService.getSetting).toHaveBeenCalledWith(
        'last_sync_noun_translations',
      );
    });

    it('calls setSetting with per-collection keys after successful sync', async () => {
      await syncService.syncIfOnline();

      expect(mockSettingsService.setSetting).toHaveBeenCalledWith(
        'last_sync_categories',
        expect.any(String),
      );
      expect(mockSettingsService.setSetting).toHaveBeenCalledWith(
        'last_sync_nouns',
        expect.any(String),
      );
      expect(mockSettingsService.setSetting).toHaveBeenCalledWith(
        'last_sync_noun_translations',
        expect.any(String),
      );
    });

    it('includes filter query param in the fetch URL when lastSync is set', async () => {
      mockSettingsService.getSetting.mockResolvedValue(
        '2026-01-01T00:00:00.000Z',
      );

      await syncService.syncIfOnline();

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(fetchUrl).toContain('filter=');
      // URLSearchParams encodes spaces as '+'; decode both '+' and percent-encoding
      const decodedUrl = decodeURIComponent(fetchUrl).replace(/\+/g, ' ');
      expect(decodedUrl).toContain('2026-01-01 00:00:00.000Z');
    });

    it('does not include filter param when lastSync is null', async () => {
      mockSettingsService.getSetting.mockResolvedValue(null);

      await syncService.syncIfOnline();

      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(fetchUrl).not.toContain('filter=');
    });
  });

  // ── Error handling ─────────────────────────────────────────────────────

  describe('error handling', () => {
    it('returns error status when fetch throws a network error', async () => {
      // Reset the two-response queue from beforeEach, then set the error response
      (global.fetch as jest.Mock)
        .mockReset()
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await syncService.syncIfOnline();

      expect(result).toEqual({ status: 'error', error: 'Network error' });
    });

    it('returns error when fetch returns a non-ok response', async () => {
      (global.fetch as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await syncService.syncIfOnline();

      expect(result.status).toBe('error');
      expect(result.error).toContain('500');
    });

    it('does not call setSetting when sync fails', async () => {
      (global.fetch as jest.Mock)
        .mockReset()
        .mockRejectedValueOnce(new Error('Offline'));

      await syncService.syncIfOnline();

      expect(mockSettingsService.setSetting).not.toHaveBeenCalled();
    });
  });

  // ── upsertCategories pathways ──────────────────────────────────────────

  describe('upsertCategories pathways', () => {
    beforeEach(() => {
      // Override fetch: categories has one record, nouns and noun_translations are empty
      (global.fetch as jest.Mock)
        .mockReset()
        .mockResolvedValueOnce(makeFetchOk(makeListResponse([sampleCategory])))
        .mockResolvedValueOnce(makeFetchOk(emptyListResponse)) // nouns
        .mockResolvedValueOnce(makeFetchOk(emptyListResponse)) // noun_translations
        .mockResolvedValueOnce(makeFetchOk({ ...emptyListResponse, totalItems: 0 })) // patchSync: nouns count
        .mockResolvedValueOnce(makeFetchOk({ ...emptyListResponse, totalItems: 0 })); // patchSync: translations count
    });

    it('runs INSERT … ON CONFLICT DO UPDATE for each category (primary path)', async () => {
      await syncService.syncIfOnline();

      const insertCall = (mockDb.runAsync as jest.Mock).mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO categories') && sql.includes('ON CONFLICT'),
      );

      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toEqual([
        sampleCategory.name,
        sampleCategory.display_name,
        sampleCategory.display_order,
        sampleCategory.id,
      ]);
    });

    it('falls back to UPDATE WHERE name = ? on UNIQUE name conflict', async () => {
      // INSERT throws UNIQUE constraint error; UPDATE fallback succeeds
      mockDb.runAsync
        .mockRejectedValueOnce(
          new Error('UNIQUE constraint failed: categories.name'),
        )
        .mockResolvedValueOnce({ changes: 1 });

      await syncService.syncIfOnline();

      const updateCall = (mockDb.runAsync as jest.Mock).mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE categories') && sql.includes('WHERE name = ?'),
      );

      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toEqual([
        sampleCategory.display_name,
        sampleCategory.display_order,
        sampleCategory.id,
        sampleCategory.name,
      ]);
    });

    it('logs a warning and continues on non-UNIQUE errors', async () => {
      mockDb.runAsync.mockRejectedValueOnce(
        new Error('Some unexpected database error'),
      );

      await syncService.syncIfOnline();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upsert category'),
        expect.any(String),
      );
    });
  });

  // ── upsertNouns pathways ───────────────────────────────────────────────

  describe('upsertNouns pathways', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockReset();
      // Set up the local categories map (remote_id → local id)
      mockDb.getAllAsync.mockResolvedValue([{ id: 1, remote_id: 'cat123' }]);
    });

    function setNounsFetch(nouns: unknown[]) {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(makeFetchOk(emptyListResponse)) // categories
        .mockResolvedValueOnce(makeFetchOk(makeListResponse(nouns))) // nouns
        .mockResolvedValueOnce(makeFetchOk(emptyListResponse)) // noun_translations
        .mockResolvedValueOnce(makeFetchOk({ ...emptyListResponse, totalItems: 0 })) // patchSync: nouns count
        .mockResolvedValueOnce(makeFetchOk({ ...emptyListResponse, totalItems: 0 })); // patchSync: translations count
    }

    it('updates an existing noun via UPDATE WHERE remote_id when found', async () => {
      setNounsFetch([sampleNoun]);
      // Existing noun found by remote_id
      mockDb.getFirstAsync.mockResolvedValue({ id: 42 });

      await syncService.syncIfOnline();

      const updateCall = (mockDb.runAsync as jest.Mock).mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE nouns') && sql.includes('WHERE remote_id = ?'),
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toContain(sampleNoun.id);
    });

    it('inserts a new noun when no remote_id match is found', async () => {
      setNounsFetch([sampleNoun]);
      // No existing noun found
      mockDb.getFirstAsync.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await syncService.syncIfOnline();

      const insertCall = (mockDb.runAsync as jest.Mock).mock.calls.find(
        ([sql]: [string]) => sql.includes('INSERT INTO nouns'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall[1]).toContain(sampleNoun.id);
    });

    it('only assigns remote_id for user-added words on UNIQUE conflict (preserves user data)', async () => {
      setNounsFetch([sampleNoun]);
      mockDb.getFirstAsync
        .mockResolvedValueOnce(null) // No remote_id match
        .mockResolvedValueOnce({ id: 10, is_user_added: 1 }); // User-added word found
      mockDb.runAsync
        .mockRejectedValueOnce(
          new Error('UNIQUE constraint failed: nouns.german, nouns.article'),
        )
        .mockResolvedValueOnce({ changes: 1 });

      await syncService.syncIfOnline();

      const updateCall = (mockDb.runAsync as jest.Mock).mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('SET remote_id = ?') && sql.includes('WHERE german = ?'),
      );
      expect(updateCall).toBeDefined();
      // Should not overwrite user-owned fields
      const sql = updateCall[0] as string;
      expect(sql).not.toContain('plural');
      expect(sql).not.toContain('english');
    });

    it('updates plural/english/level for pre-seeded words on UNIQUE conflict', async () => {
      setNounsFetch([sampleNoun]);
      mockDb.getFirstAsync
        .mockResolvedValueOnce(null) // No remote_id match
        .mockResolvedValueOnce({ id: 5, is_user_added: 0 }); // Pre-seeded word
      mockDb.runAsync
        .mockRejectedValueOnce(
          new Error('UNIQUE constraint failed: nouns.german, nouns.article'),
        )
        .mockResolvedValueOnce({ changes: 1 });

      await syncService.syncIfOnline();

      const updateCall = (mockDb.runAsync as jest.Mock).mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('UPDATE nouns') && sql.includes('plural = ?'),
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[1]).toContain(sampleNoun.plural);
      expect(updateCall[1]).toContain(sampleNoun.id); // remote_id
    });

    it('skips a noun when its category remote_id is not in the local map', async () => {
      const nounWithUnknownCategory = {
        ...sampleNoun,
        category: 'unknown_cat_id',
        expand: undefined,
      };
      setNounsFetch([nounWithUnknownCategory]);

      const result = await syncService.syncIfOnline();

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown category'),
      );
      expect(result).toMatchObject({ nounsSynced: 0 });
    });

    it('runs all noun upserts inside a single transaction', async () => {
      const secondNoun = {
        ...sampleNoun,
        id: 'noun789',
        german: 'Katze',
        article: 'die' as const,
      };
      setNounsFetch([sampleNoun, secondNoun]);
      mockDb.getFirstAsync.mockResolvedValue(null);
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      await syncService.syncIfOnline();

      // One transaction for nouns (categories were empty → no transaction there)
      expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
    });
  });
});
