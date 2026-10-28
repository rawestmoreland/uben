/**
 * verbPrepositionBrowse.test.ts
 *
 * Verb preposition cheat sheet (issue #150): patterns grouped by preposition,
 * multi-preposition verbs under each preposition with their contrast visible,
 * mastery where progress exists, and every seeded pattern reachable.
 *
 * The grouping tests are pure. The last block runs the real query against an
 * in-memory SQLite database built by the real migrations and seed (Node
 * 22.5+ only, via node:sqlite; skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import { seedVocabulary } from '@/database/seed';
import { verbPrepositionsV2 } from '@/database/seeds/verb-prepositions/v2-core';
import { describeWithSqlite, openTestDatabase } from '@/test-utils/sqlite';
import {
  getMastery,
  groupPatternsByPreposition,
  VerbPrepositionBrowseService,
  type VerbPrepositionPatternRow,
} from '../verbPrepositionBrowseService';

let mockActiveDb: unknown;

jest.mock('@/database/db', () => ({ getDatabase: () => mockActiveDb }));

function row(
  overrides: Partial<VerbPrepositionPatternRow> = {},
): VerbPrepositionPatternRow {
  return {
    id: 1,
    verb: 'warten',
    is_reflexive: 0,
    preposition: 'auf',
    alt_prepositions: null,
    case_governed: 'akk',
    sentence: 'Ich warte ____ meine Frau.',
    translation: "I'm waiting for my wife.",
    total_reviews: null,
    correct_reviews: null,
    interval: null,
    ...overrides,
  };
}

describe('getMastery', () => {
  it('is new without a progress row or reviews', () => {
    expect(getMastery(null)).toBe('new');
    expect(getMastery({ total_reviews: 0, interval: 0 })).toBe('new');
  });

  it('is learning until the interval reaches 21 days', () => {
    expect(getMastery({ total_reviews: 3, interval: 20 })).toBe('learning');
    expect(getMastery({ total_reviews: 3, interval: 21 })).toBe('mastered');
  });
});

describe('groupPatternsByPreposition', () => {
  it('groups patterns under their preposition in button-grid order', () => {
    const { sections } = groupPatternsByPreposition([
      row({ id: 1, verb: 'zählen', preposition: 'zu' }),
      row({ id: 2, verb: 'warten', preposition: 'auf' }),
      row({ id: 3, verb: 'denken', preposition: 'an' }),
      row({ id: 4, verb: 'glauben', preposition: 'an' }),
    ]);

    expect(sections.map((section) => section.preposition)).toEqual([
      'an',
      'auf',
      'zu',
    ]);
    expect(sections[0].data.map((item) => item.pattern)).toEqual([
      'denken an',
      'glauben an',
    ]);
  });

  it('puts prepositions outside the grid after it, alphabetically', () => {
    const { sections } = groupPatternsByPreposition([
      row({ id: 1, preposition: 'wegen' }),
      row({ id: 2, preposition: 'ohne' }),
      row({ id: 3, preposition: 'zu' }),
    ]);

    expect(sections.map((section) => section.preposition)).toEqual([
      'zu',
      'ohne',
      'wegen',
    ]);
  });

  it('shows the case, a reflexive pattern name and a filled-in example', () => {
    const { sections } = groupPatternsByPreposition([
      row({
        verb: 'freuen',
        is_reflexive: 1,
        sentence: 'Ich freue mich schon ____ das Wochenende.',
      }),
    ]);

    const [item] = sections[0].data;
    expect(item.pattern).toBe('sich freuen auf');
    expect(item.caseLabel).toBe('+ Akk.');
    expect(item.example).toEqual({
      before: 'Ich freue mich schon ',
      preposition: 'auf',
      after: ' das Wochenende.',
    });
  });

  it('capitalises the preposition when the blank opens the sentence', () => {
    const { sections } = groupPatternsByPreposition([
      row({ sentence: '____ wen wartest du?' }),
    ]);
    expect(sections[0].data[0].example.preposition).toBe('Auf');
  });

  it('lists a multi-preposition verb under each preposition with its contrast', () => {
    const { sections, patternCount } = groupPatternsByPreposition([
      row({
        id: 1,
        verb: 'freuen',
        is_reflexive: 1,
        preposition: 'auf',
        translation: 'to look forward to',
      }),
      row({
        id: 2,
        verb: 'freuen',
        is_reflexive: 1,
        preposition: 'über',
        translation: 'to be glad about',
      }),
    ]);

    expect(patternCount).toBe(2);
    const auf = sections.find((section) => section.preposition === 'auf');
    const über = sections.find((section) => section.preposition === 'über');
    expect(auf?.data[0].translation).toBe('to look forward to');
    expect(auf?.data[0].contrastPatterns).toEqual(['sich freuen über']);
    expect(über?.data[0].translation).toBe('to be glad about');
    expect(über?.data[0].contrastPatterns).toEqual(['sich freuen auf']);
  });

  it('does not treat a reflexive and a non-reflexive verb as contrasting patterns', () => {
    const { sections } = groupPatternsByPreposition([
      row({ id: 1, verb: 'freuen', is_reflexive: 1, preposition: 'auf' }),
      row({ id: 2, verb: 'freuen', is_reflexive: 0, preposition: 'über' }),
    ]);
    // Same verb string, but only same-reflexivity patterns are siblings
    for (const item of sections.flatMap((section) => section.data)) {
      expect(item.contrastPatterns).toEqual([]);
    }
  });

  it('also lists a synonym pattern under its accepted alternate', () => {
    const { sections, patternCount } = groupPatternsByPreposition([
      row({
        id: 7,
        verb: 'bewerben',
        is_reflexive: 1,
        preposition: 'um',
        alt_prepositions: '["auf"]',
      }),
    ]);

    expect(patternCount).toBe(1);
    const um = sections.find((section) => section.preposition === 'um');
    const auf = sections.find((section) => section.preposition === 'auf');
    expect(um?.data[0].isAlternate).toBe(false);
    expect(auf?.data[0].isAlternate).toBe(true);
    expect(auf?.data[0].pattern).toBe('sich bewerben auf');
    expect(auf?.data[0].primaryPreposition).toBe('um');
    expect(auf?.data[0].example.preposition).toBe('auf');
  });

  it('gives every list item a unique key', () => {
    const { sections } = groupPatternsByPreposition([
      row({ id: 7, preposition: 'um', alt_prepositions: '["auf"]' }),
      row({ id: 8, preposition: 'auf' }),
    ]);
    const keys = sections.flatMap((section) => section.data.map((i) => i.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('reports mastery and the number of started patterns', () => {
    const { sections, startedCount } = groupPatternsByPreposition([
      row({ id: 1, verb: 'a', total_reviews: null }),
      row({
        id: 2,
        verb: 'b',
        total_reviews: 2,
        correct_reviews: 1,
        interval: 6,
      }),
      row({
        id: 3,
        verb: 'c',
        total_reviews: 9,
        correct_reviews: 9,
        interval: 40,
      }),
    ]);

    const byId = Object.fromEntries(
      sections[0].data.map((item) => [item.id, item]),
    );
    expect(byId[1].mastery).toBe('new');
    expect(byId[2].mastery).toBe('learning');
    expect(byId[3].mastery).toBe('mastered');
    expect(startedCount).toBe(2);
  });

  it('lists a pattern once however many examples it has, showing the first', () => {
    const { sections, patternCount } = groupPatternsByPreposition([
      row({ id: 1, sentence: 'Ich warte ____ meine Frau.' }),
      row({ id: 2, sentence: 'Wir warten ____ den Bus.' }),
      row({ id: 3, verb: 'hoffen', sentence: 'Ich hoffe ____ Regen.' }),
    ]);

    expect(patternCount).toBe(2);
    expect(sections[0].data.map((item) => item.pattern)).toEqual([
      'hoffen auf',
      'warten auf',
    ]);
    const warten = sections[0].data.find((i) => i.pattern === 'warten auf');
    expect(warten?.id).toBe(1);
    expect(warten?.example.after).toBe(' meine Frau.');
  });

  it("combines the progress of a pattern's examples", () => {
    const reviewed = (id: number, interval: number) =>
      row({ id, total_reviews: 2, correct_reviews: 1, interval });

    const mastery = (rows: VerbPrepositionPatternRow[]) =>
      groupPatternsByPreposition(rows).sections[0].data[0];

    const bothNew = mastery([row({ id: 1 }), row({ id: 2 })]);
    expect(bothNew.mastery).toBe('new');

    const oneStarted = mastery([reviewed(1, 6), row({ id: 2 })]);
    expect(oneStarted.mastery).toBe('learning');

    const bothMastered = mastery([reviewed(1, 30), reviewed(2, 25)]);
    expect(bothMastered.mastery).toBe('mastered');
    expect(bothMastered.totalReviews).toBe(4);
    expect(bothMastered.correctReviews).toBe(2);

    const { startedCount } = groupPatternsByPreposition([
      reviewed(1, 6),
      row({ id: 2 }),
    ]);
    expect(startedCount).toBe(1);
  });

  it('handles no patterns at all', () => {
    expect(groupPatternsByPreposition([])).toEqual({
      sections: [],
      patternCount: 0,
      startedCount: 0,
    });
  });
});

describeWithSqlite('verbPrepositionBrowseService against real SQLite', () => {
  async function openSeededDb() {
    const { raw, db } = openTestDatabase();
    mockActiveDb = db;
    await runMigrations(db as never);
    await seedVocabulary(db as never);
    return raw;
  }

  it('reaches every seeded pattern before any progress exists', async () => {
    await openSeededDb();
    const data =
      await new VerbPrepositionBrowseService().getPatternsByPreposition();

    const ids = new Set(
      data.sections.flatMap((section) => section.data.map((item) => item.id)),
    );
    // Each pattern is listed once, whatever its number of example sentences
    const patternCount = new Set(
      verbPrepositionsV2.map(
        (p) => `${p.verb}|${p.is_reflexive ? 1 : 0}|${p.preposition}`,
      ),
    ).size;
    expect(data.patternCount).toBe(patternCount);
    expect(ids.size).toBe(patternCount);
    expect(data.startedCount).toBe(0);
    expect(
      data.sections.every((section) =>
        section.data.every((item) => item.mastery === 'new'),
      ),
    ).toBe(true);
  });

  it('shows mastery from verb_prep progress only', async () => {
    const raw = await openSeededDb();
    const first = raw
      .prepare(
        'SELECT id, verb, is_reflexive, preposition FROM verb_prepositions ORDER BY id LIMIT 1',
      )
      .get() as {
      id: number;
      verb: string;
      is_reflexive: number;
      preposition: string;
    };
    // Every example of the first pattern is mastered
    const patternRows = raw
      .prepare(
        `SELECT id FROM verb_prepositions
         WHERE verb = ? AND is_reflexive = ? AND preposition = ?`,
      )
      .all(first.verb, first.is_reflexive, first.preposition) as {
      id: number;
    }[];
    expect(patternRows.length).toBeGreaterThan(1);
    for (const { id } of patternRows) {
      raw
        .prepare(
          `INSERT INTO card_progress
             (word_type, word_id, interval, repetitions, total_reviews, correct_reviews)
           VALUES ('verb_prep', ?, 30, 4, 4, 4)`,
        )
        .run(id);
    }
    // Progress for a different card type with the same word_id must not leak in
    const other = raw
      .prepare('SELECT MAX(id) AS id FROM verb_prepositions')
      .get() as { id: number };
    raw
      .prepare(
        `INSERT INTO card_progress
           (word_type, word_id, interval, repetitions, total_reviews, correct_reviews)
         VALUES ('noun', ?, 30, 4, 4, 4)`,
      )
      .run(other.id);

    const data =
      await new VerbPrepositionBrowseService().getPatternsByPreposition();
    const items = data.sections.flatMap((section) => section.data);

    expect(items.find((item) => item.id === first.id)?.mastery).toBe(
      'mastered',
    );
    expect(
      items
        .filter((item) => item.mastery !== 'new')
        .every((item) => item.id === first.id),
    ).toBe(true);
    expect(data.startedCount).toBe(1);
  });
});

describe('verb preposition patterns translations', () => {
  const locales = ['en', 'fr', 'hu', 'it', 'pl', 'pt', 'ru', 'tr', 'zh'];

  const keyPaths = (value: unknown, prefix = ''): string[] =>
    typeof value === 'object' && value !== null
      ? Object.entries(value).flatMap(([key, child]) =>
          keyPaths(child, `${prefix}${key}.`),
        )
      : [prefix];

  it.each(locales)('%s defines every key that en does', (locale) => {
    const english = require('@/locales/en.json').app.verb_preposition_patterns;
    const messages = require(`@/locales/${locale}.json`).app
      .verb_preposition_patterns;
    expect(keyPaths(messages).sort()).toEqual(keyPaths(english).sort());
  });
});
