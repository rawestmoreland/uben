/**
 * backupService.test.ts
 *
 * Covers payload serialization (what leaves the device) and restore (what is
 * applied on a fresh install). SQLite is mocked at the `getDatabase` boundary,
 * so these tests assert on the queries issued and the data shapes — they do
 * not execute SQL.
 *
 * Mock objects are defined INSIDE their factory functions; see
 * syncService.test.ts for why.
 */

import {
  BACKED_UP_SETTINGS_KEYS,
  BACKUP_PAYLOAD_VERSION,
  backupService,
  type BackupPayload,
} from '../backupService';

jest.mock('@/database/db', () => {
  const db = {
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
  };
  return { getDatabase: () => db };
});

jest.mock('../settingsService', () => ({
  SETTINGS_KEYS: {
    SHOW_ENGLISH_HINT: 'show_english_hint',
    ESZETT_PREFERENCE: 'eszett_preference',
    SELECTED_LEVELS: 'selected_levels',
    APP_LANGUAGE: 'app_language',
    QUIZ_SESSIONS_COMPLETED: 'quiz_sessions_completed',
    ADJECTIVE_DECLENSION_TRIAL_QUESTIONS_USED:
      'adjective_declension_trial_questions_used',
    ADJECTIVE_DECLENSION_DIFFICULTY: 'adjective_declension_difficulty',
    PRO_GRANDFATHER_MIGRATION_DONE: 'pro_grandfather_migration_done',
    GRANDFATHERED_B_LEVEL: 'grandfathered_b_level',
    GRANDFATHERED_WORD_CAP: 'grandfathered_word_cap',
  },
  settingsService: { getSetting: jest.fn(), setSetting: jest.fn() },
}));

const mockDb = jest.requireMock('@/database/db').getDatabase() as {
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
  withTransactionAsync: jest.Mock;
};
const mockSettings = jest.requireMock('../settingsService').settingsService as {
  getSetting: jest.Mock;
  setSetting: jest.Mock;
};

const PROGRESS_ROW = {
  ease_factor: 2.3,
  interval: 6,
  repetitions: 2,
  next_review_date: '2026-10-10',
  total_reviews: 3,
  correct_reviews: 2,
  last_reviewed_at: '2026-10-04 09:00:00',
  created_at: '2026-09-01 08:00:00',
};

function progressPayload(): BackupPayload['nounProgress'][number]['progress'] {
  return {
    easeFactor: 2.3,
    interval: 6,
    repetitions: 2,
    nextReviewDate: '2026-10-10',
    totalReviews: 3,
    correctReviews: 2,
    lastReviewedAt: '2026-10-04 09:00:00',
    createdAt: '2026-09-01 08:00:00',
    reviews: [
      { quality: 5, timeTakenMs: 900, reviewedAt: '2026-09-01 08:00:00' },
      { quality: 2, timeTakenMs: null, reviewedAt: '2026-10-04 09:00:00' },
    ],
  };
}

function emptyPayload(overrides: Partial<BackupPayload> = {}): BackupPayload {
  return {
    version: BACKUP_PAYLOAD_VERSION,
    createdAt: '2026-10-04T10:00:00.000Z',
    userNouns: [],
    userAdjectives: [],
    nounProgress: [],
    adjectiveProgress: [],
    settings: {},
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.getAllAsync.mockResolvedValue([]);
  mockDb.getFirstAsync.mockResolvedValue(null);
  mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  mockSettings.getSetting.mockResolvedValue(null);
});

describe('createBackupPayload', () => {
  it('keys progress by word (never by local id) and attaches each card its own reviews', async () => {
    mockDb.getAllAsync.mockImplementation(async (sql: string) => {
      if (sql.includes("cp.word_type = 'noun'")) {
        return [
          { id: 11, remote_id: 'abc123', german: 'Hund', article: 'der', sense: null, ...PROGRESS_ROW },
          { id: 12, remote_id: null, german: 'Bank', article: 'die', sense: 'seat', ...PROGRESS_ROW },
        ];
      }
      if (sql.includes('FROM review_history')) {
        return [
          { card_progress_id: 11, quality: 5, time_taken_ms: 900, reviewed_at: '2026-09-01 08:00:00' },
          { card_progress_id: 12, quality: 3, time_taken_ms: null, reviewed_at: '2026-09-02 08:00:00' },
          { card_progress_id: 11, quality: 2, time_taken_ms: 4000, reviewed_at: '2026-10-04 09:00:00' },
        ];
      }
      return [];
    });

    const payload = await backupService.createBackupPayload();

    expect(payload.version).toBe(BACKUP_PAYLOAD_VERSION);
    expect(payload.nounProgress).toHaveLength(2);
    const [hund, bank] = payload.nounProgress;
    expect(hund).toMatchObject({ remoteId: 'abc123', german: 'Hund', article: 'der', sense: null });
    expect(hund.progress.reviews.map((r) => r.quality)).toEqual([5, 2]);
    expect(bank).toMatchObject({ remoteId: null, sense: 'seat' });
    expect(bank.progress.reviews.map((r) => r.quality)).toEqual([3]);
    expect(JSON.stringify(payload)).not.toContain('card_progress_id');
    expect(JSON.stringify(payload.nounProgress)).not.toMatch(/"id"/);
  });

  it('includes user-added words with their category name', async () => {
    mockDb.getAllAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('WHERE n.is_user_added = 1')) {
        return [
          {
            remote_id: null, german: 'Tisch', article: 'der', sense: null, plural: 'Tische',
            english: 'table', level: 'A1', category_name: 'home', created_at: '2026-09-01 08:00:00',
          },
        ];
      }
      if (sql.includes('FROM adjectives WHERE is_user_added = 1')) {
        return [{ german: 'schnell', english: 'fast', level: null, created_at: '2026-09-02 08:00:00' }];
      }
      return [];
    });

    const payload = await backupService.createBackupPayload();

    expect(payload.userNouns).toEqual([
      expect.objectContaining({ german: 'Tisch', categoryName: 'home', plural: 'Tische' }),
    ]);
    expect(payload.userAdjectives).toEqual([
      expect.objectContaining({ german: 'schnell', english: 'fast' }),
    ]);
  });

  it('only reads whitelisted settings and never includes pro_unlocked', async () => {
    mockSettings.getSetting.mockImplementation(async (key: string) =>
      key === 'app_language' ? 'it' : key === 'pro_unlocked' ? 'true' : null,
    );

    const payload = await backupService.createBackupPayload();

    expect(payload.settings).toEqual({ app_language: 'it' });
    const requestedKeys = mockSettings.getSetting.mock.calls.map(([key]) => key);
    expect(requestedKeys).toEqual([...BACKED_UP_SETTINGS_KEYS]);
    expect(requestedKeys).not.toContain('pro_unlocked');
    expect(requestedKeys).not.toContain('selected_categories');
  });
});

describe('restoreFromPayload', () => {
  it('rejects payloads from a newer app version without touching the database', async () => {
    await expect(
      backupService.restoreFromPayload(emptyPayload({ version: BACKUP_PAYLOAD_VERSION + 1 })),
    ).rejects.toThrow(/newer version/);
    expect(mockDb.withTransactionAsync).not.toHaveBeenCalled();
  });

  it('rejects malformed payloads', async () => {
    await expect(
      backupService.restoreFromPayload({} as BackupPayload),
    ).rejects.toThrow(/not valid/);
  });

  it('upserts progress for a known noun and replaces its review history', async () => {
    mockDb.getFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM nouns') && sql.includes('remote_id = ?')) return { id: 7 };
      if (sql.includes('FROM card_progress')) return { id: 42 };
      return null;
    });

    const result = await backupService.restoreFromPayload(
      emptyPayload({
        nounProgress: [
          { remoteId: 'abc123', german: 'Hund', article: 'der', sense: null, progress: progressPayload() },
        ],
      }),
    );

    expect(result).toMatchObject({ restoredCards: 1, restoredReviews: 2, skippedCards: 0 });
    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);

    const sqlCalls = mockDb.runAsync.mock.calls.map(([sql]) => sql as string);
    expect(sqlCalls[0]).toContain('INSERT INTO card_progress');
    expect(sqlCalls[0]).toContain('ON CONFLICT(word_type, word_id) DO UPDATE');
    expect(mockDb.runAsync.mock.calls[0][1].slice(0, 2)).toEqual(['noun', 7]);
    expect(sqlCalls[1]).toContain('DELETE FROM review_history');
    expect(mockDb.runAsync.mock.calls[1][1]).toEqual([42]);
    expect(sqlCalls.filter((sql) => sql.includes('INSERT INTO review_history'))).toHaveLength(2);
  });

  it('skips cards whose word is not on this install and counts them', async () => {
    const result = await backupService.restoreFromPayload(
      emptyPayload({
        nounProgress: [
          { remoteId: 'gone', german: 'Unbekannt', article: 'das', sense: null, progress: progressPayload() },
        ],
      }),
    );

    expect(result).toMatchObject({ restoredCards: 0, skippedCards: 1 });
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('falls back to the natural key when the remote_id is unknown locally', async () => {
    mockDb.getFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('remote_id = ?')) return null;
      if (sql.includes('COALESCE(sense')) return { id: 9 };
      if (sql.includes('FROM card_progress')) return { id: 50 };
      return null;
    });

    const result = await backupService.restoreFromPayload(
      emptyPayload({
        nounProgress: [
          { remoteId: 'stale', german: 'Hund', article: 'der', sense: null, progress: progressPayload() },
        ],
      }),
    );

    expect(result.restoredCards).toBe(1);
    expect(mockDb.runAsync.mock.calls[0][1].slice(0, 2)).toEqual(['noun', 9]);
  });

  it('creates a missing user noun in its category, falling back to the first category', async () => {
    mockDb.getFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('WHERE name = ?')) return null; // category name unknown
      if (sql.includes('FROM categories ORDER BY')) return { id: 3 };
      return null;
    });

    const result = await backupService.restoreFromPayload(
      emptyPayload({
        userNouns: [
          {
            remoteId: null, german: 'Tisch', article: 'der', sense: null, plural: 'Tische',
            english: 'table', level: 'A1', categoryName: 'renamed_category', createdAt: '2026-09-01 08:00:00',
          },
        ],
      }),
    );

    expect(result.restoredUserWords).toBe(1);
    const [sql, params] = mockDb.runAsync.mock.calls[0];
    expect(sql).toContain('INSERT INTO nouns');
    expect(params).toEqual(['Tisch', 'der', null, 'Tische', 'table', 'A1', 3, '2026-09-01 08:00:00']);
  });

  it('does not duplicate a user noun that already exists', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ id: 5 });

    const result = await backupService.restoreFromPayload(
      emptyPayload({
        userNouns: [
          {
            remoteId: null, german: 'Tisch', article: 'der', sense: null, plural: null,
            english: null, level: null, categoryName: null, createdAt: '2026-09-01 08:00:00',
          },
        ],
      }),
    );

    expect(result.restoredUserWords).toBe(0);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('restores adjective progress by german word', async () => {
    mockDb.getFirstAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM adjectives')) return { id: 4 };
      if (sql.includes('FROM card_progress')) return { id: 60 };
      return null;
    });

    const result = await backupService.restoreFromPayload(
      emptyPayload({ adjectiveProgress: [{ german: 'schnell', progress: progressPayload() }] }),
    );

    expect(result.restoredCards).toBe(1);
    expect(mockDb.runAsync.mock.calls[0][1].slice(0, 2)).toEqual(['adjective', 4]);
  });

  it('writes only whitelisted settings from the payload', async () => {
    await backupService.restoreFromPayload(
      emptyPayload({
        settings: { app_language: 'pl', pro_unlocked: 'true', selected_categories: '[1,2]' },
      }),
    );

    expect(mockSettings.setSetting).toHaveBeenCalledTimes(1);
    expect(mockSettings.setSetting).toHaveBeenCalledWith('app_language', 'pl');
  });
});
