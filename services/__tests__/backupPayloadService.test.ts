/**
 * backupPayloadService.test.ts
 *
 * Builds a payload on one real in-memory SQLite database (migrations applied)
 * and restores it onto a second, freshly migrated one, the "new device" case.
 * Node 22.5+ only (node:sqlite); skipped on older Node.
 */

import { runMigrations } from '@/database/migrations';
import { describeWithSqlite, openTestDatabase } from '@/test-utils/sqlite';
import { BACKUP_PAYLOAD_VERSION } from '@/types/backup';
import {
  BackupPayloadError,
  buildBackupPayload,
  restoreBackupPayload,
} from '../backupPayloadService';

type TestDb = ReturnType<typeof openTestDatabase>;

/** The vocabulary every install ships with. Row IDs differ per install on purpose. */
function seedShippedVocabulary({ raw }: TestDb, idOffset: number) {
  raw.exec(`INSERT INTO categories (name, display_name, display_order) VALUES ('people', 'People', 1);`);
  // Burn some IDs so the same noun has a DIFFERENT local id on each install.
  for (let i = 0; i < idOffset; i += 1) {
    raw.exec(`INSERT INTO nouns (german, article, category_id) VALUES ('Filler${i}', 'der', 1);`);
  }
  raw.exec(`
    INSERT INTO nouns (german, article, plural, english, level, category_id)
      VALUES ('Hund', 'der', 'Hunde', 'dog', 'A1', 1),
             ('Katze', 'die', 'Katzen', 'cat', 'A1', 1);
    INSERT INTO nouns (german, article, sense, category_id) VALUES ('See', 'der', 'lake', 1), ('See', 'die', 'sea', 1);
    INSERT INTO adjectives (german, english, level) VALUES ('gross', 'big', 'A1');
    INSERT INTO verbs (infinitive, english, level) VALUES ('gehen', 'to go', 'A1');
    INSERT INTO verb_prepositions (verb, preposition, case_governed, sentence, translation, kind)
      VALUES ('warten', 'auf', 'akk', 'Ich warte ____ meine Frau.', 'I wait for my wife.', 'verb');
    INSERT INTO verb_preposition_compounds (verb_preposition_id, form, sentence, translation)
      VALUES (1, 'da', 'Ich warte ____.', 'I wait for it.');
  `);
}

function idOf(
  { raw }: TestDb,
  table: string,
  where: string,
  ...params: unknown[]
): number {
  return (raw.prepare(`SELECT id FROM ${table} WHERE ${where}`).get(...params) as {
    id: number;
  }).id;
}

function addCard(
  { raw }: TestDb,
  type: string,
  wordId: number,
  fields: { interval: number; reps: number; next: string; reviews: number[] },
) {
  const result = raw
    .prepare(
      `INSERT INTO card_progress
         (word_type, word_id, ease_factor, interval, repetitions, next_review_date,
          total_reviews, correct_reviews, last_reviewed_at)
       VALUES (?, ?, 2.3, ?, ?, ?, ?, ?, '2026-11-01 10:00:00')`,
    )
    .run(type, wordId, fields.interval, fields.reps, fields.next, fields.reviews.length, fields.reviews.filter((q) => q >= 3).length);
  const cardId = Number(result.lastInsertRowid);
  fields.reviews.forEach((quality, index) => {
    raw
      .prepare(
        'INSERT INTO review_history (card_progress_id, quality, time_taken_ms, reviewed_at) VALUES (?, ?, ?, ?)',
      )
      .run(cardId, quality, 1200, `2026-10-0${index + 1} 09:00:00`);
  });
  return cardId;
}

describeWithSqlite('backupPayloadService', () => {
  let source: TestDb;
  let target: TestDb;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    source = openTestDatabase();
    target = openTestDatabase();
    await runMigrations(source.db as any);
    await runMigrations(target.db as any);
    seedShippedVocabulary(source, 0);
    seedShippedVocabulary(target, 7);
  });

  afterEach(() => {
    source.raw.close();
    target.raw.close();
    jest.restoreAllMocks();
  });

  function buildCards() {
    addCard(source, 'noun', idOf(source, 'nouns', "german = 'Hund'"), {
      interval: 6, reps: 2, next: '2026-11-20', reviews: [4, 5],
    });
    addCard(source, 'noun_plural', idOf(source, 'nouns', "german = 'Hund'"), {
      interval: 1, reps: 1, next: '2026-11-16', reviews: [3],
    });
    // Same German word, different meaning: must land on the right row.
    addCard(source, 'noun', idOf(source, 'nouns', "german = 'See' AND sense = 'sea'"), {
      interval: 14, reps: 4, next: '2026-12-01', reviews: [5, 5, 4],
    });
    addCard(source, 'adjective', idOf(source, 'adjectives', "german = 'gross'"), {
      interval: 3, reps: 2, next: '2026-11-18', reviews: [4],
    });
    addCard(source, 'verb', idOf(source, 'verbs', "infinitive = 'gehen'"), {
      interval: 2, reps: 1, next: '2026-11-17', reviews: [3],
    });
    addCard(source, 'verb_prep', 1, { interval: 6, reps: 2, next: '2026-11-21', reviews: [4, 4] });
    addCard(source, 'verb_prep_compound', 1, { interval: 1, reps: 1, next: '2026-11-16', reviews: [5] });
  }

  it('never puts a local integer id in the payload', async () => {
    buildCards();
    const payload = await buildBackupPayload(source.db as any);
    const json = JSON.stringify(payload);
    expect(payload.version).toBe(BACKUP_PAYLOAD_VERSION);
    expect(payload.cards).toHaveLength(7);
    expect(json).not.toMatch(/word_id|card_progress_id/);
  });

  it('restores cards, intervals and history onto a fresh install with different ids', async () => {
    buildCards();
    const payload = await buildBackupPayload(source.db as any);

    const summary = await restoreBackupPayload(target.db as any, payload);

    expect(summary).toMatchObject({ restoredCards: 7, skippedCards: 0, restoredReviews: 11 });

    const hundId = idOf(target, 'nouns', "german = 'Hund'");
    expect(hundId).not.toBe(idOf(source, 'nouns', "german = 'Hund'"));
    const hundCard = target.raw
      .prepare("SELECT * FROM card_progress WHERE word_type = 'noun' AND word_id = ?")
      .get(hundId) as Record<string, unknown>;
    expect(hundCard).toMatchObject({
      interval: 6, repetitions: 2, next_review_date: '2026-11-20', ease_factor: 2.3,
      total_reviews: 2, correct_reviews: 2,
    });
    const history = target.raw
      .prepare('SELECT quality FROM review_history WHERE card_progress_id = ? ORDER BY reviewed_at')
      .all(hundCard.id) as { quality: number }[];
    expect(history.map((row) => row.quality)).toEqual([4, 5]);

    // Study days aren't in the payload: they are rebuilt from the restored
    // review history so the streak survives a restore
    const studyDays = target.raw
      .prepare('SELECT COUNT(*) AS count FROM study_days')
      .get() as { count: number };
    expect(studyDays.count).toBeGreaterThan(0);

    // The sense-qualified card lands on "die See", not "der See".
    const seaId = idOf(target, 'nouns', "german = 'See' AND sense = 'sea'");
    expect(
      target.raw.prepare("SELECT interval FROM card_progress WHERE word_type = 'noun' AND word_id = ?").get(seaId),
    ).toEqual({ interval: 14 });
    const lakeId = idOf(target, 'nouns', "german = 'See' AND sense = 'lake'");
    expect(
      target.raw.prepare("SELECT 1 FROM card_progress WHERE word_type = 'noun' AND word_id = ?").get(lakeId),
    ).toBeUndefined();
  });

  it('overwrites a local card and its history for the same word', async () => {
    buildCards();
    const payload = await buildBackupPayload(source.db as any);
    addCard(target, 'noun', idOf(target, 'nouns', "german = 'Hund'"), {
      interval: 99, reps: 9, next: '2030-01-01', reviews: [1, 1, 1, 1],
    });

    await restoreBackupPayload(target.db as any, payload);

    const hundId = idOf(target, 'nouns', "german = 'Hund'");
    const card = target.raw
      .prepare("SELECT id, interval FROM card_progress WHERE word_type = 'noun' AND word_id = ?")
      .get(hundId) as { id: number; interval: number };
    expect(card.interval).toBe(6);
    const rows = target.raw
      .prepare('SELECT quality FROM review_history WHERE card_progress_id = ? ORDER BY reviewed_at')
      .all(card.id);
    expect(rows).toEqual([{ quality: 4 }, { quality: 5 }]);
  });

  it('skips and counts cards for words this install does not have', async () => {
    buildCards();
    const payload = await buildBackupPayload(source.db as any);
    target.raw.exec("DELETE FROM adjectives WHERE german = 'gross'; DELETE FROM verbs WHERE infinitive = 'gehen';");

    const summary = await restoreBackupPayload(target.db as any, payload);

    expect(summary.restoredCards).toBe(5);
    expect(summary.skippedCards).toBe(2);
  });

  it('re-creates user-added words without duplicating words that already exist', async () => {
    source.raw.exec(`
      INSERT INTO nouns (german, article, plural, english, category_id, is_user_added)
        VALUES ('Handy', 'das', 'Handys', 'mobile phone', 1, 1);
    `);
    const handyId = idOf(source, 'nouns', "german = 'Handy'");
    addCard(source, 'noun', handyId, { interval: 4, reps: 2, next: '2026-11-19', reviews: [4] });
    // A user-added word that the target already has (e.g. it was added there too).
    target.raw.exec(`
      INSERT INTO nouns (german, article, category_id, is_user_added) VALUES ('Handy', 'das', 1, 1);
    `);
    source.raw.exec(`
      INSERT INTO nouns (german, article, category_id, is_user_added) VALUES ('Laptop', 'der', 1, 1);
    `);
    const payload = await buildBackupPayload(source.db as any);

    const summary = await restoreBackupPayload(target.db as any, payload);

    expect(summary.addedWords).toBe(1); // Laptop only
    const handyRows = target.raw.prepare("SELECT COUNT(*) AS n FROM nouns WHERE german = 'Handy'").get();
    expect(handyRows).toEqual({ n: 1 });
    expect(
      target.raw.prepare("SELECT COUNT(*) AS n FROM nouns WHERE german = 'Laptop' AND is_user_added = 1").get(),
    ).toEqual({ n: 1 });
    expect(summary.restoredCards).toBe(1);
  });

  it('does not duplicate a word when the backup holds its second article', async () => {
    source.raw.exec(`
      INSERT INTO nouns (german, article, article_alt, category_id, is_user_added)
        VALUES ('Joghurt', 'der', 'das', 1, 1);
    `);
    target.raw.exec(`
      INSERT INTO nouns (german, article, article_alt, category_id) VALUES ('Joghurt', 'das', 'der', 1);
    `);
    const payload = await buildBackupPayload(source.db as any);

    const summary = await restoreBackupPayload(target.db as any, payload);

    expect(summary.addedWords).toBe(0);
    expect(target.raw.prepare("SELECT COUNT(*) AS n FROM nouns WHERE german = 'Joghurt'").get()).toEqual({ n: 1 });
  });

  it('restores only allow-listed settings', async () => {
    source.raw.exec(`
      INSERT INTO settings (key, value) VALUES
        ('show_english_hint', 'false'), ('selected_levels', '["A1"]'),
        ('pro_unlocked', 'true'), ('selected_categories', '[3,4]'), ('interstitial_session_count', '9');
    `);
    const payload = await buildBackupPayload(source.db as any);
    expect(Object.keys(payload.settings).sort()).toEqual(['selected_levels', 'show_english_hint']);

    // A tampered/hand-edited payload can't smuggle in other keys either.
    (payload.settings as Record<string, string>).pro_unlocked = 'true';
    await restoreBackupPayload(target.db as any, payload);

    const keys = (target.raw.prepare('SELECT key FROM settings').all() as { key: string }[]).map((r) => r.key);
    expect(keys).toContain('show_english_hint');
    expect(keys).not.toContain('pro_unlocked');
    expect(keys).not.toContain('selected_categories');
  });

  it('is atomic: a failure mid-restore leaves the database untouched', async () => {
    buildCards();
    const payload = await buildBackupPayload(source.db as any);
    const realRun = target.db.runAsync;
    let writes = 0;
    (target.db as any).runAsync = async (sql: string, params?: unknown[]) => {
      if (sql.includes('INSERT INTO review_history') && (writes += 1) === 3) {
        throw new Error('disk full');
      }
      return realRun(sql, params);
    };

    await expect(restoreBackupPayload(target.db as any, payload)).rejects.toThrow('disk full');

    expect(target.raw.prepare('SELECT COUNT(*) AS n FROM card_progress').get()).toEqual({ n: 0 });
    expect(target.raw.prepare('SELECT COUNT(*) AS n FROM review_history').get()).toEqual({ n: 0 });
  });

  it('skips a malformed card instead of failing the whole restore', async () => {
    buildCards();
    const payload = await buildBackupPayload(source.db as any);
    payload.cards.push(['noun', ['Hund', 'der', null], -1, 0, 0, 'not-a-date', 0, 0, null, 'x', []] as any);
    payload.cards.push('garbage' as any);

    const summary = await restoreBackupPayload(target.db as any, payload);

    expect(summary.restoredCards).toBe(7);
    expect(summary.skippedCards).toBe(2);
  });

  it('refuses a payload newer than the app understands, and non-payloads', async () => {
    await expect(
      restoreBackupPayload(target.db as any, { version: BACKUP_PAYLOAD_VERSION + 1 }),
    ).rejects.toMatchObject({ code: 'unsupported_version' });
    await expect(restoreBackupPayload(target.db as any, null)).rejects.toBeInstanceOf(BackupPayloadError);
    await expect(restoreBackupPayload(target.db as any, { version: 1 })).rejects.toMatchObject({ code: 'invalid' });
  });
});
