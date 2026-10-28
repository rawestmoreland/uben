import {
  describeWithSqlite,
  openTestDatabase,
  type NodeSqliteDatabase,
} from '@/test-utils/sqlite';
import { migrations, runMigrations } from '../migrations';

// ── Mock db factory ───────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue(null), // default: migration not yet applied
    getAllAsync: jest.fn().mockResolvedValue([]), // default: no rows (e.g. PRAGMA table_info)
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('runMigrations()', () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates the migrations tracking table on first call', async () => {
    await runMigrations(mockDb as any);

    const createTableCall = mockDb.execAsync.mock.calls.find(
      ([sql]: [string]) =>
        sql.includes('CREATE TABLE IF NOT EXISTS migrations'),
    );
    expect(createTableCall).toBeDefined();
  });

  it('checks each migration version against the tracking table', async () => {
    await runMigrations(mockDb as any);

    for (const migration of migrations) {
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM migrations WHERE version = ?'),
        [migration.version],
      );
    }
  });

  it('applies all migrations when none have been applied yet', async () => {
    // getFirstAsync returns null for every check → all migrations are unapplied
    mockDb.getFirstAsync.mockResolvedValue(null);

    await runMigrations(mockDb as any);

    // Verify each migration version was recorded
    for (const migration of migrations) {
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO migrations (version) VALUES (?)',
        [migration.version],
      );
    }
  });

  it('records each migration in the tracking table after applying it', async () => {
    await runMigrations(mockDb as any);

    const insertCalls = mockDb.runAsync.mock.calls.filter(
      ([sql]: [string]) =>
        sql === 'INSERT INTO migrations (version) VALUES (?)',
    );

    expect(insertCalls).toHaveLength(migrations.length);
    migrations.forEach((migration, index) => {
      expect(insertCalls[index][1]).toEqual([migration.version]);
    });
  });

  it('skips migrations that are already recorded', async () => {
    // All migrations appear to be already applied
    mockDb.getFirstAsync.mockResolvedValue({ '1': 1 });

    await runMigrations(mockDb as any);

    const insertCalls = mockDb.runAsync.mock.calls.filter(
      ([sql]: [string]) =>
        sql === 'INSERT INTO migrations (version) VALUES (?)',
    );
    expect(insertCalls).toHaveLength(0);
  });

  it('applies only unapplied migrations in a partial state', async () => {
    // Migration 001 already applied; 002–012 not yet applied
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ '1': 1 }) // 001 → applied
      .mockResolvedValueOnce(null) // 002 → unapplied
      .mockResolvedValueOnce(null) // 003 → unapplied
      .mockResolvedValueOnce(null) // 004 → unapplied
      .mockResolvedValueOnce(null) // 005 → unapplied
      .mockResolvedValueOnce(null) // 006 → unapplied
      .mockResolvedValueOnce(null) // 007 → unapplied
      .mockResolvedValueOnce(null) // 008 → unapplied
      .mockResolvedValueOnce(null) // 009 → unapplied
      .mockResolvedValueOnce(null) // 010 → unapplied
      .mockResolvedValueOnce(null) // 011 → unapplied
      .mockResolvedValueOnce(null); // 012 → unapplied

    await runMigrations(mockDb as any);

    const insertCalls = mockDb.runAsync.mock.calls.filter(
      ([sql]: [string]) =>
        sql === 'INSERT INTO migrations (version) VALUES (?)',
    );

    expect(insertCalls).toHaveLength(11);
    expect(insertCalls[0][1]).toEqual(['002']);
    expect(insertCalls[1][1]).toEqual(['003']);
    expect(insertCalls[2][1]).toEqual(['004']);
    expect(insertCalls[3][1]).toEqual(['005']);
    expect(insertCalls[4][1]).toEqual(['006']);
    expect(insertCalls[5][1]).toEqual(['007']);
    expect(insertCalls[6][1]).toEqual(['008']);
    expect(insertCalls[7][1]).toEqual(['009']);
    expect(insertCalls[8][1]).toEqual(['010']);
    expect(insertCalls[9][1]).toEqual(['011']);
    expect(insertCalls[10][1]).toEqual(['012']);
  });

  it('calls each migration up() with the db object', async () => {
    const upSpies = migrations.map((m) => jest.spyOn(m, 'up'));

    await runMigrations(mockDb as any);

    for (const spy of upSpies) {
      expect(spy).toHaveBeenCalledWith(mockDb);
    }

    upSpies.forEach((spy) => spy.mockRestore());
  });
});

// ── Migration 010: noun_plural cards ─────────────────────────────────────────

const migration010 = migrations.find((m) => m.version === '010')!;

describe('migration 010 (add_noun_plural_cards)', () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function executedSql(): string[] {
    return mockDb.execAsync.mock.calls.map(([sql]: [string]) => sql.trim());
  }

  it('widens the word_type CHECK to include noun_plural', async () => {
    await migration010.up(mockDb as any);

    const createCall = executedSql().find((sql) =>
      sql.startsWith('CREATE TABLE card_progress_rebuild'),
    );
    expect(createCall).toContain(
      "CHECK(word_type IN ('noun', 'verb', 'adjective', 'noun_plural'))",
    );
    expect(createCall).toContain('UNIQUE(word_type, word_id)');
  });

  it('turns foreign keys off around the rebuild so review_history is not cascade-deleted', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ foreign_keys: 1 });

    await migration010.up(mockDb as any);

    const sql = executedSql();
    const fkOff = sql.indexOf('PRAGMA foreign_keys = OFF;');
    const drop = sql.indexOf('DROP TABLE card_progress;');
    const rename = sql.indexOf(
      'ALTER TABLE card_progress_rebuild RENAME TO card_progress;',
    );
    const fkOn = sql.indexOf('PRAGMA foreign_keys = ON;');

    expect(fkOff).toBeGreaterThanOrEqual(0);
    expect(fkOff).toBeLessThan(drop);
    expect(drop).toBeLessThan(rename);
    expect(fkOn).toBeGreaterThan(rename);
  });

  it('runs the rebuild inside a transaction', async () => {
    await migration010.up(mockDb as any);
    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('re-enables foreign keys even when the rebuild fails', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ foreign_keys: 1 });
    mockDb.withTransactionAsync.mockRejectedValueOnce(new Error('disk full'));

    await expect(migration010.up(mockDb as any)).rejects.toThrow('disk full');
    expect(executedSql()).toContain('PRAGMA foreign_keys = ON;');
  });

  it('leaves foreign keys alone when they were already off', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ foreign_keys: 0 });

    await migration010.up(mockDb as any);

    const sql = executedSql();
    expect(sql).not.toContain('PRAGMA foreign_keys = OFF;');
    expect(sql).not.toContain('PRAGMA foreign_keys = ON;');
  });

  it('down() removes plural cards before restoring the narrower CHECK', async () => {
    await migration010.down!(mockDb as any);

    const sql = executedSql();
    const deleteCards = sql.indexOf(
      "DELETE FROM card_progress WHERE word_type = 'noun_plural';",
    );
    const createCall = sql.findIndex((statement) =>
      statement.startsWith('CREATE TABLE card_progress_rebuild'),
    );
    expect(deleteCards).toBeGreaterThanOrEqual(0);
    expect(deleteCards).toBeLessThan(createCall);
    expect(sql[createCall]).toContain(
      "CHECK(word_type IN ('noun', 'verb', 'adjective'))",
    );
  });
});

// ── Migration 011: verb_prepositions + verb_prep cards ───────────────────────

const migration011 = migrations.find((m) => m.version === '011')!;

describe('migration 011 (add_verb_prepositions)', () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function executedSql(): string[] {
    return mockDb.execAsync.mock.calls.map(([sql]: [string]) => sql.trim());
  }

  it('creates the verb_prepositions table', async () => {
    await migration011.up(mockDb as any);

    const createCall = executedSql().find((sql) =>
      sql.startsWith('CREATE TABLE IF NOT EXISTS verb_prepositions'),
    );
    expect(createCall).toBeDefined();
    expect(createCall).toContain(
      "CHECK(case_governed IN ('akk', 'dat', 'gen'))",
    );
    expect(createCall).toContain(
      'UNIQUE(verb, is_reflexive, preposition, sentence)',
    );
  });

  it('widens the word_type CHECK to include verb_prep', async () => {
    await migration011.up(mockDb as any);

    const createCall = executedSql().find((sql) =>
      sql.startsWith('CREATE TABLE card_progress_rebuild'),
    );
    expect(createCall).toContain(
      "CHECK(word_type IN ('noun', 'verb', 'adjective', 'noun_plural', 'verb_prep'))",
    );
  });

  it('down() removes verb_prep cards, restores the CHECK, then drops the table', async () => {
    await migration011.down!(mockDb as any);

    const sql = executedSql();
    const deleteCards = sql.indexOf(
      "DELETE FROM card_progress WHERE word_type = 'verb_prep';",
    );
    const createCall = sql.findIndex((statement) =>
      statement.startsWith('CREATE TABLE card_progress_rebuild'),
    );
    const dropTable = sql.indexOf('DROP TABLE IF EXISTS verb_prepositions;');
    expect(deleteCards).toBeGreaterThanOrEqual(0);
    expect(deleteCards).toBeLessThan(createCall);
    expect(sql[createCall]).toContain(
      "CHECK(word_type IN ('noun', 'verb', 'adjective', 'noun_plural'))",
    );
    expect(dropTable).toBeGreaterThan(createCall);
  });
});

// ── Migration 012: verb_preposition_pronouns + verb_prep_pronoun cards ──────

const migration012 = migrations.find((m) => m.version === '012')!;

describe('migration 012 (add_verb_preposition_pronouns)', () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function executedSql(): string[] {
    return mockDb.execAsync.mock.calls.map(([sql]: [string]) => sql.trim());
  }

  it('creates the verb_preposition_pronouns table linked to its pattern', async () => {
    await migration012.up(mockDb as any);

    const createCall = executedSql().find((sql) =>
      sql.startsWith('CREATE TABLE IF NOT EXISTS verb_preposition_pronouns'),
    );
    expect(createCall).toBeDefined();
    expect(createCall).toContain(
      'FOREIGN KEY (verb_preposition_id) REFERENCES verb_prepositions(id) ON DELETE CASCADE',
    );
    expect(createCall).toContain('UNIQUE(verb_preposition_id)');
  });

  it('widens the word_type CHECK to include verb_prep_pronoun', async () => {
    await migration012.up(mockDb as any);

    const createCall = executedSql().find((sql) =>
      sql.startsWith('CREATE TABLE card_progress_rebuild'),
    );
    expect(createCall).toContain(
      "CHECK(word_type IN ('noun', 'verb', 'adjective', 'noun_plural', 'verb_prep', 'verb_prep_pronoun'))",
    );
  });

  it('down() removes verb_prep_pronoun cards, restores the CHECK, then drops the table', async () => {
    await migration012.down!(mockDb as any);

    const sql = executedSql();
    const deleteCards = sql.indexOf(
      "DELETE FROM card_progress WHERE word_type = 'verb_prep_pronoun';",
    );
    const createCall = sql.findIndex((statement) =>
      statement.startsWith('CREATE TABLE card_progress_rebuild'),
    );
    const dropTable = sql.indexOf(
      'DROP TABLE IF EXISTS verb_preposition_pronouns;',
    );
    expect(deleteCards).toBeGreaterThanOrEqual(0);
    expect(deleteCards).toBeLessThan(createCall);
    expect(sql[createCall]).toContain(
      "CHECK(word_type IN ('noun', 'verb', 'adjective', 'noun_plural', 'verb_prep'))",
    );
    expect(dropTable).toBeGreaterThan(createCall);
  });
});

// ── Real SQLite (node:sqlite) ────────────────────────────────────────────────
//
// The mock-based tests above can't prove the SQL actually runs. These run
// every migration against a real in-memory SQLite database via Node's
// built-in `node:sqlite` (Node 22.5+). Older Node versions skip them.

describeWithSqlite('migrations against real SQLite', () => {
  let raw: NodeSqliteDatabase;
  let db: ReturnType<typeof openTestDatabase>['db'];

  beforeEach(() => {
    ({ raw, db } = openTestDatabase());
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    raw.close();
    jest.restoreAllMocks();
  });

  /** Apply every migration up to `version` and record them, so runMigrations() only has the later ones left. */
  async function migrateTo(version: string) {
    for (const migration of migrations.filter((m) => m.version <= version)) {
      await migration.up(db as any);
    }
    raw.exec(
      'CREATE TABLE migrations (version TEXT PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
    );
    for (const migration of migrations.filter((m) => m.version <= version)) {
      raw.prepare('INSERT INTO migrations (version) VALUES (?)').run(
        migration.version,
      );
    }
  }

  function insertNoun(german: string, article: string, plural: string | null) {
    raw.exec(
      "INSERT OR IGNORE INTO categories (id, name, display_name, display_order) VALUES (1, 'general', 'General', 1)",
    );
    return Number(
      raw
        .prepare(
          'INSERT INTO nouns (german, article, plural, category_id) VALUES (?, ?, ?, 1)',
        )
        .run(german, article, plural).lastInsertRowid,
    );
  }

  function insertCard(wordType: string, wordId: number, interval = 0) {
    return Number(
      raw
        .prepare(
          'INSERT INTO card_progress (word_type, word_id, interval, total_reviews, correct_reviews) VALUES (?, ?, ?, 3, 2)',
        )
        .run(wordType, wordId, interval).lastInsertRowid,
    );
  }

  function count(sql: string): number {
    return (raw.prepare(sql).get() as { count: number }).count;
  }

  it('applies cleanly to a fresh database and allows article + plural cards for one noun', async () => {
    await runMigrations(db as any);

    const kindId = insertNoun('Kind', 'das', 'Kinder');
    insertCard('noun', kindId);
    insertCard('noun_plural', kindId);

    expect(count('SELECT COUNT(*) AS count FROM card_progress')).toBe(2);
    expect(() => insertCard('noun_plural', kindId)).toThrow(/UNIQUE/);
    expect(() => insertCard('pronoun', kindId)).toThrow(/CHECK/);
  });

  it('upgrades from 009 without losing card progress or review history', async () => {
    await migrateTo('009');

    const kindId = insertNoun('Kind', 'das', 'Kinder');
    const hundId = insertNoun('Hund', 'der', 'Hunde');
    const kindCard = insertCard('noun', kindId, 6);
    const hundCard = insertCard('noun', hundId, 21);
    insertCard('verb', 1);
    insertCard('adjective', 1);
    for (const cardId of [kindCard, kindCard, hundCard]) {
      raw
        .prepare(
          'INSERT INTO review_history (card_progress_id, quality) VALUES (?, 4)',
        )
        .run(cardId);
    }
    const progressBefore = raw
      .prepare('SELECT * FROM card_progress ORDER BY id')
      .all();

    await runMigrations(db as any);

    expect(
      raw.prepare('SELECT version FROM migrations ORDER BY version').all(),
    ).toHaveLength(migrations.length);
    expect(raw.prepare('SELECT * FROM card_progress ORDER BY id').all()).toEqual(
      progressBefore,
    );
    expect(count('SELECT COUNT(*) AS count FROM review_history')).toBe(3);
    expect(raw.prepare('PRAGMA foreign_keys').get()).toEqual({
      foreign_keys: 1,
    });
    expect(raw.prepare('PRAGMA foreign_key_check').all()).toEqual([]);

    // Plural progress is independent of the noun's existing article card
    const pluralCard = insertCard('noun_plural', kindId);
    expect(pluralCard).toBeGreaterThan(Math.max(kindCard, hundCard));

    const indexes = raw
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'card_progress' AND name LIKE 'idx_%' ORDER BY name",
      )
      .all();
    expect(indexes).toEqual([
      { name: 'idx_card_progress_next_review' },
      { name: 'idx_card_progress_word' },
    ]);

    // The review_history foreign key still points at the rebuilt table
    raw.prepare('DELETE FROM card_progress WHERE id = ?').run(kindCard);
    expect(count('SELECT COUNT(*) AS count FROM review_history')).toBe(1);
  });

  it('down() drops plural cards and their history but keeps everything else', async () => {
    await runMigrations(db as any);

    const kindId = insertNoun('Kind', 'das', 'Kinder');
    const articleCard = insertCard('noun', kindId);
    const pluralCard = insertCard('noun_plural', kindId);
    for (const cardId of [articleCard, pluralCard]) {
      raw
        .prepare(
          'INSERT INTO review_history (card_progress_id, quality) VALUES (?, 4)',
        )
        .run(cardId);
    }

    await migration010.down!(db as any);

    expect(
      raw.prepare('SELECT id, word_type FROM card_progress').all(),
    ).toEqual([{ id: articleCard, word_type: 'noun' }]);
    expect(
      raw.prepare('SELECT card_progress_id FROM review_history').all(),
    ).toEqual([{ card_progress_id: articleCard }]);
    expect(() => insertCard('noun_plural', kindId)).toThrow(/CHECK/);
  });

  // ── Migration 011 ──────────────────────────────────────────────────────────

  function insertPattern(
    verb: string,
    preposition: string,
    sentence: string,
    options: { reflexive?: boolean; caseGoverned?: string; remoteId?: string | null } = {},
  ): number {
    const { reflexive = false, caseGoverned = 'akk', remoteId = null } = options;
    return Number(
      raw
        .prepare(
          'INSERT INTO verb_prepositions (verb, is_reflexive, preposition, case_governed, sentence, translation, remote_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        .run(
          verb,
          reflexive ? 1 : 0,
          preposition,
          caseGoverned,
          sentence,
          'translation',
          remoteId,
        ).lastInsertRowid,
    );
  }

  it('stores several patterns for one verb but rejects duplicates', async () => {
    await runMigrations(db as any);

    insertPattern('freuen', 'auf', 'Ich freue mich schon ____ das Wochenende.', {
      reflexive: true,
    });
    insertPattern('freuen', 'über', 'Ich freue mich ____ das Geschenk.', {
      reflexive: true,
    });

    expect(count('SELECT COUNT(*) AS count FROM verb_prepositions')).toBe(2);
    expect(() =>
      insertPattern('freuen', 'auf', 'Ich freue mich schon ____ das Wochenende.', {
        reflexive: true,
      }),
    ).toThrow(/UNIQUE/);
    expect(() =>
      insertPattern('warten', 'auf', 'Ich warte ____ meine Frau.', {
        caseGoverned: 'nom',
      }),
    ).toThrow(/CHECK/);
  });

  it('keeps remote_id unique only when it is set', async () => {
    await runMigrations(db as any);

    insertPattern('warten', 'auf', 'Ich warte ____ meine Frau.');
    insertPattern('denken', 'an', 'Ich denke ____ dich.');
    insertPattern('glauben', 'an', 'Ich glaube ____ dich.', { remoteId: 'abc' });

    expect(() =>
      insertPattern('hoffen', 'auf', 'Ich hoffe ____ Regen.', { remoteId: 'abc' }),
    ).toThrow(/UNIQUE/);
  });

  it('allows one verb_prep card per pattern, independent of other card types', async () => {
    await runMigrations(db as any);

    const pattern = insertPattern('warten', 'auf', 'Ich warte ____ meine Frau.');
    insertCard('verb', pattern);
    insertCard('verb_prep', pattern);

    expect(count('SELECT COUNT(*) AS count FROM card_progress')).toBe(2);
    expect(() => insertCard('verb_prep', pattern)).toThrow(/UNIQUE/);
  });

  it('upgrades from 010 without losing card progress or review history', async () => {
    await migrateTo('010');

    const kindId = insertNoun('Kind', 'das', 'Kinder');
    const articleCard = insertCard('noun', kindId, 6);
    const pluralCard = insertCard('noun_plural', kindId, 3);
    for (const cardId of [articleCard, pluralCard]) {
      raw
        .prepare(
          'INSERT INTO review_history (card_progress_id, quality) VALUES (?, 4)',
        )
        .run(cardId);
    }
    const progressBefore = raw
      .prepare('SELECT * FROM card_progress ORDER BY id')
      .all();

    await runMigrations(db as any);

    expect(
      raw.prepare('SELECT version FROM migrations ORDER BY version').all(),
    ).toHaveLength(migrations.length);
    expect(raw.prepare('SELECT * FROM card_progress ORDER BY id').all()).toEqual(
      progressBefore,
    );
    expect(count('SELECT COUNT(*) AS count FROM review_history')).toBe(2);
    expect(raw.prepare('PRAGMA foreign_keys').get()).toEqual({
      foreign_keys: 1,
    });
    expect(raw.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    expect(count('SELECT COUNT(*) AS count FROM verb_prepositions')).toBe(0);
  });

  it('down() drops verb_prep cards, their history, and the table but keeps everything else', async () => {
    await runMigrations(db as any);

    const kindId = insertNoun('Kind', 'das', 'Kinder');
    const pluralCard = insertCard('noun_plural', kindId);
    const pattern = insertPattern('warten', 'auf', 'Ich warte ____ meine Frau.');
    const patternCard = insertCard('verb_prep', pattern);
    for (const cardId of [pluralCard, patternCard]) {
      raw
        .prepare(
          'INSERT INTO review_history (card_progress_id, quality) VALUES (?, 4)',
        )
        .run(cardId);
    }

    await migration011.down!(db as any);

    expect(
      raw.prepare('SELECT id, word_type FROM card_progress').all(),
    ).toEqual([{ id: pluralCard, word_type: 'noun_plural' }]);
    expect(
      raw.prepare('SELECT card_progress_id FROM review_history').all(),
    ).toEqual([{ card_progress_id: pluralCard }]);
    expect(() => insertCard('verb_prep', pattern)).toThrow(/CHECK/);
    expect(
      raw
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'verb_prepositions'",
        )
        .all(),
    ).toEqual([]);
    expect(raw.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
  });
});
