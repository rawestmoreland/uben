/**
 * verbPrepStats.test.ts
 *
 * Verb preposition quiz (issue #144): verb_prep progress must stay out of
 * the article stats (card totals, mastered, struggling), while still
 * counting as study activity.
 *
 * Runs the real queries against an in-memory SQLite database built by the
 * real migrations (Node 22.5+ only, via node:sqlite; skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import { statisticsService } from '@/services/statisticsService';
import { VocabularyService } from '@/services/vocabularyService';
import {
  describeWithSqlite,
  openTestDatabase,
  type NodeSqliteDatabase,
} from '@/test-utils/sqlite';
import { SpacedRepetitionService } from '../spacedRepetitionService';

let mockActiveDb: unknown;

jest.mock('@/database/db', () => ({ getDatabase: () => mockActiveDb }));

jest.mock('@/services/purchaseService', () => ({
  PRO_FREE_WORD_LIMIT: 5,
  purchaseService: { isProUnlocked: jest.fn().mockResolvedValue(true) },
}));

jest.mock('@/services/settingsService', () => ({
  settingsService: {
    getGrandfatheredWordCap: jest.fn().mockResolvedValue(false),
  },
}));

const service = new SpacedRepetitionService();
const vocabularyService = new VocabularyService();

describeWithSqlite('verb_prep cards against real SQLite', () => {
  let raw: NodeSqliteDatabase;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const opened = openTestDatabase();
    raw = opened.raw;
    mockActiveDb = opened.db;
    await runMigrations(opened.db as any);
    raw.exec(`
      INSERT INTO categories (id, name, display_name, display_order)
        VALUES (1, 'people', 'People', 1);
    `);
  });

  afterEach(() => {
    raw.close();
    jest.restoreAllMocks();
  });

  function insertNoun(german: string, article: string, plural: string): number {
    return Number(
      raw
        .prepare(
          'INSERT INTO nouns (german, article, plural, level, category_id) VALUES (?, ?, ?, ?, 1)',
        )
        .run(german, article, plural, 'A1').lastInsertRowid,
    );
  }

  function insertPattern(verb: string, preposition: string): number {
    return Number(
      raw
        .prepare(
          `INSERT INTO verb_prepositions (verb, preposition, case_governed, sentence, translation, level)
           VALUES (?, ?, 'akk', 'Ich ____ etwas.', 'translation', 'A2')`,
        )
        .run(verb, preposition).lastInsertRowid,
    );
  }

  async function articleStats() {
    const [userStats, mastered, struggling] = await Promise.all([
      vocabularyService.getUserStats(),
      statisticsService.getMasteredCount(),
      statisticsService.getStrugglingWordsCount(),
    ]);
    return { userStats, mastered, struggling };
  }

  it('tracks pattern progress independently and leaves article stats unchanged', async () => {
    const kind = insertNoun('Kind', 'das', 'Kinder');
    await service.createCardForWord('noun', kind);
    const before = await articleStats();

    // Five wrong answers on one pattern (a "struggling" card) plus a
    // mastered, not-yet-due card for another
    const warten = insertPattern('warten', 'auf');
    const denken = insertPattern('denken', 'an');
    const wartenCard = await service.createCardForWord('verb_prep', warten);
    for (let attempt = 0; attempt < 5; attempt++) {
      await service.recordReview(wartenCard, 0, 4000);
    }
    const denkenCard = await service.createCardForWord('verb_prep', denken);
    raw
      .prepare(
        "UPDATE card_progress SET interval = 30, next_review_date = date('now', '+30 days') WHERE id = ?",
      )
      .run(denkenCard);

    expect(await articleStats()).toEqual(before);
    expect(
      raw
        .prepare(
          "SELECT word_type, total_reviews FROM card_progress WHERE word_id = ? AND word_type = 'verb_prep'",
        )
        .all(warten),
    ).toEqual([{ word_type: 'verb_prep', total_reviews: 5 }]);
    // Pattern reviews still count as study activity (streak / heatmap)
    expect(await service.hasReviewedToday()).toBe(true);
  });

  it('keeps da(r)-/wo(r)- progress out of article stats', async () => {
    const kind = insertNoun('Kind', 'das', 'Kinder');
    await service.createCardForWord('noun', kind);
    const before = await articleStats();

    const warten = insertPattern('warten', 'auf');
    const pronounId = Number(
      raw
        .prepare(
          `INSERT INTO verb_preposition_pronouns (verb_preposition_id, da_sentence, da_translation, wo_sentence, wo_translation)
           VALUES (?, 'Ich warte ____.', 'da', '____ wartest du?', 'wo')`,
        )
        .run(warten).lastInsertRowid,
    );

    // Struggling (five wrong answers) and, on a second card, mastered
    const strugglingCard = await service.createCardForWord(
      'verb_prep_pronoun',
      pronounId,
    );
    for (let attempt = 0; attempt < 5; attempt++) {
      await service.recordReview(strugglingCard, 0, 4000);
    }
    const masteredCard = await service.createCardForWord(
      'verb_prep_pronoun',
      pronounId + 1,
    );
    raw
      .prepare(
        "UPDATE card_progress SET interval = 30, next_review_date = date('now', '+30 days') WHERE id = ?",
      )
      .run(masteredCard);

    expect(await articleStats()).toEqual(before);
    // Same pattern id, different card type: no collision with its verb_prep card
    const patternCard = await service.createCardForWord('verb_prep', warten);
    expect(patternCard).not.toBe(strugglingCard);
  });

  it('keeps a noun id and a pattern id with the same value on separate cards', async () => {
    const kind = insertNoun('Kind', 'das', 'Kinder');
    const pattern = insertPattern('warten', 'auf');
    expect(pattern).toBe(kind); // both are id 1: the cards must not collide

    const nounCard = await service.createCardForWord('noun', kind);
    const patternCard = await service.createCardForWord('verb_prep', pattern);

    expect(patternCard).not.toBe(nounCard);
    expect(
      raw.prepare('SELECT COUNT(*) AS count FROM card_progress').get(),
    ).toEqual({ count: 2 });
  });
});
