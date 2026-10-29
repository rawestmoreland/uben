/**
 * verbPrepositionQuiz.test.ts
 *
 * What the verb preposition quiz screen (issue #148) relies on beyond the
 * question service: answering a pattern writes to card_progress and
 * review_history through the same calls the session hook makes, and every
 * locale carries the quiz's UI strings.
 *
 * The SQLite block needs Node 22.5+ (node:sqlite); it is skipped on older Node.
 */

import { runMigrations } from '@/database/migrations';
import {
  describeWithSqlite,
  openTestDatabase,
  type NodeSqliteDatabase,
} from '@/test-utils/sqlite';
import { SpacedRepetitionService } from '../spacedRepetitionService';
import { isCorrectPreposition } from '../verbPrepositionService';

let mockActiveDb: unknown;

jest.mock('@/database/db', () => ({ getDatabase: () => mockActiveDb }));

const service = new SpacedRepetitionService();

describeWithSqlite('answering a verb preposition card', () => {
  let raw: NodeSqliteDatabase;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const opened = openTestDatabase();
    raw = opened.raw;
    mockActiveDb = opened.db;
    await runMigrations(opened.db as any);
  });

  afterEach(() => {
    raw.close();
    jest.restoreAllMocks();
  });

  function insertPattern(preposition: string, alts?: string[]): number {
    return Number(
      raw
        .prepare(
          `INSERT INTO verb_prepositions
             (verb, is_reflexive, preposition, alt_prepositions, case_governed, sentence, translation, level)
           VALUES ('warten', 0, ?, ?, 'akk', 'Ich warte ____ meine Frau.', 'gloss', 'A2')`,
        )
        .run(preposition, alts ? JSON.stringify(alts) : null).lastInsertRowid,
    );
  }

  function rowsFor(wordId: number) {
    const progress = raw
      .prepare(
        "SELECT * FROM card_progress WHERE word_type = 'verb_prep' AND word_id = ?",
      )
      .all(wordId) as Record<string, number | string>[];
    const history = raw
      .prepare(
        `SELECT rh.* FROM review_history rh
         JOIN card_progress cp ON cp.id = rh.card_progress_id
         WHERE cp.word_type = 'verb_prep' AND cp.word_id = ?`,
      )
      .all(wordId) as Record<string, number | string>[];
    return { progress, history };
  }

  it('creates the verb_prep card for a new pattern and records the review', async () => {
    const wordId = insertPattern('auf');

    const session = await service.getVerbPrepositionSession(20, 5);
    const [card] = session.cards;
    expect(card.id).toBe(0);
    expect(isCorrectPreposition(card.question, 'auf')).toBe(true);

    // The same two calls the session hook makes for a new card
    const cardProgressId = await service.createCardForWord(
      'verb_prep',
      card.word_id,
    );
    await service.recordReview(cardProgressId, 5, 1200);

    const { progress, history } = rowsFor(wordId);
    expect(progress).toHaveLength(1);
    expect(progress[0]).toMatchObject({
      total_reviews: 1,
      correct_reviews: 1,
      repetitions: 1,
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ quality: 5, time_taken_ms: 1200 });
  });

  it('records a wrong answer as a lapse and keeps the card due', async () => {
    const wordId = insertPattern('auf');
    const cardProgressId = await service.createCardForWord('verb_prep', wordId);

    await service.recordReview(cardProgressId, 1, 4000);

    const { progress, history } = rowsFor(wordId);
    expect(progress[0]).toMatchObject({
      total_reviews: 1,
      correct_reviews: 0,
      repetitions: 0,
    });
    expect(history).toHaveLength(1);

    // Not graduated, so it is served again as a due card rather than as new
    const next = await service.getVerbPrepositionSession(20, 5);
    expect(next.dueCount).toBe(1);
    expect(next.newCount).toBe(0);
    expect(next.cards[0].id).toBe(cardProgressId);
  });

  it('does not touch article or plural progress', async () => {
    const wordId = insertPattern('auf');
    const cardProgressId = await service.createCardForWord('verb_prep', wordId);
    await service.recordReview(cardProgressId, 5, 900);

    const other = raw
      .prepare(
        "SELECT COUNT(*) AS count FROM card_progress WHERE word_type != 'verb_prep'",
      )
      .get() as { count: number };
    expect(other.count).toBe(0);
  });

  it('grades an accepted alternate as correct', async () => {
    insertPattern('um', ['auf']);

    const { cards } = await service.getVerbPrepositionSession(20, 5);

    expect(isCorrectPreposition(cards[0].question, 'um')).toBe(true);
    expect(isCorrectPreposition(cards[0].question, 'auf')).toBe(true);
    expect(isCorrectPreposition(cards[0].question, 'für')).toBe(false);
  });
});

describe('verb preposition quiz translations', () => {
  const locales: Record<string, any> = {
    en: require('@/locales/en.json'),
    fr: require('@/locales/fr.json'),
    hu: require('@/locales/hu.json'),
    it: require('@/locales/it.json'),
    pl: require('@/locales/pl.json'),
    pt: require('@/locales/pt.json'),
    ru: require('@/locales/ru.json'),
    tr: require('@/locales/tr.json'),
    zh: require('@/locales/zh.json'),
  };

  const keyPaths = (value: unknown, prefix = ''): string[] =>
    typeof value === 'object' && value !== null
      ? Object.entries(value).flatMap(([key, child]) =>
          keyPaths(child, `${prefix}${key}.`),
        )
      : [prefix];

  it.each(Object.keys(locales))(
    '%s defines every verb_preposition_quiz key that en does',
    (locale) => {
      expect(
        keyPaths(locales[locale].app.verb_preposition_quiz).sort(),
      ).toEqual(keyPaths(locales.en.app.verb_preposition_quiz).sort());
    },
  );

  it.each(Object.keys(locales))('%s has the home tile strings', (locale) => {
    const tile = locales[locale].app.home_screen.tiles.prepositions;
    expect(tile.title).toEqual(expect.any(String));
    expect(tile.subtitle).toEqual(expect.any(String));
  });
});
