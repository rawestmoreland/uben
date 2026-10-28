/**
 * verbPrepositionSeed.test.ts
 *
 * Verb preposition quiz (issue #146): validates the authored seed data and
 * that seeding is idempotent, and replaces a previously seeded broader list
 * without leaving orphaned progress, against a real in-memory SQLite database
 * (Node 22.5+ only, via node:sqlite; the DB tests are skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import { seedVocabulary } from '@/database/seed';
import { verbPrepositionsV2 } from '@/database/seeds/verb-prepositions/v2-core';
import { describeWithSqlite, openTestDatabase } from '@/test-utils/sqlite';

/** The prepositions the quiz can show as buttons (see #144). */
const QUIZ_PREPOSITIONS = [
  'auf',
  'an',
  'für',
  'über',
  'mit',
  'von',
  'um',
  'zu',
  'bei',
  'nach',
  'in',
  'aus',
  'vor',
];

const VALID_CASES = ['akk', 'dat', 'gen'];
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

describe('verb preposition seed data', () => {
  it('has two example sentences for every pattern', () => {
    const examplesPerPattern = new Map<string, number>();
    for (const pattern of verbPrepositionsV2) {
      const key = `${pattern.verb}|${pattern.is_reflexive ? 1 : 0}|${pattern.preposition}`;
      examplesPerPattern.set(key, (examplesPerPattern.get(key) ?? 0) + 1);
    }
    expect(examplesPerPattern.size).toBe(57);
    for (const count of examplesPerPattern.values()) {
      expect(count).toBe(2);
    }
  });

  it('uses standard spelling, leaving ss/ß to the display preference', () => {
    // The Swiss spellings an unconverted source list is likely to contain
    for (const pattern of verbPrepositionsV2) {
      expect(`${pattern.sentence} ${pattern.translation}`).not.toMatch(
        /heisst|gross|Fussball|Strasse|Fuss\b/,
      );
    }
  });

  it('has exactly one blank in every sentence', () => {
    for (const pattern of verbPrepositionsV2) {
      expect(pattern.sentence.split('____')).toHaveLength(2);
    }
  });

  it('uses only valid case and level values', () => {
    for (const pattern of verbPrepositionsV2) {
      expect(VALID_CASES).toContain(pattern.case_governed);
      expect(VALID_LEVELS).toContain(pattern.level);
    }
  });

  it('uses only quiz prepositions as answers and alternates', () => {
    for (const pattern of verbPrepositionsV2) {
      expect(QUIZ_PREPOSITIONS).toContain(pattern.preposition);
      for (const alt of pattern.alt_prepositions ?? []) {
        expect(QUIZ_PREPOSITIONS).toContain(alt);
      }
    }
  });

  it('never lists the primary preposition among alt_prepositions', () => {
    for (const pattern of verbPrepositionsV2) {
      expect(pattern.alt_prepositions ?? []).not.toContain(pattern.preposition);
    }
  });

  it('has no empty or duplicated alt_prepositions', () => {
    for (const pattern of verbPrepositionsV2) {
      if (pattern.alt_prepositions === undefined) continue;
      expect(pattern.alt_prepositions.length).toBeGreaterThan(0);
      expect(new Set(pattern.alt_prepositions).size).toBe(
        pattern.alt_prepositions.length,
      );
    }
  });

  it('has a verb, translation and non-blank text on every pattern', () => {
    for (const pattern of verbPrepositionsV2) {
      expect(pattern.verb.trim()).not.toBe('');
      expect(pattern.translation.trim()).not.toBe('');
      expect(pattern.sentence.replace('____', '').trim()).not.toBe('');
      if (pattern.english_trap !== undefined) {
        expect(pattern.english_trap.trim()).not.toBe('');
      }
    }
  });

  it('has no duplicate (verb, reflexive, preposition, sentence)', () => {
    const keys = verbPrepositionsV2.map(
      (p) =>
        `${p.verb}|${p.is_reflexive ? 1 : 0}|${p.preposition}|${p.sentence}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives sibling patterns of a verb distinct sentences', () => {
    // Sibling patterns must be told apart by their sentence alone, so two
    // patterns of one verb may never share a sentence.
    const seen = new Map<string, string>();
    for (const pattern of verbPrepositionsV2) {
      const key = `${pattern.verb}|${pattern.is_reflexive ? 1 : 0}|${pattern.sentence}`;
      expect(seen.has(key)).toBe(false);
      seen.set(key, pattern.preposition);
    }
  });

  it('covers every quiz preposition', () => {
    const used = new Set(verbPrepositionsV2.map((p) => p.preposition));
    for (const preposition of QUIZ_PREPOSITIONS) {
      expect(used).toContain(preposition);
    }
  });

  it('has no alternate that is the answer of a sibling pattern of the same verb', () => {
    // An alternate is a synonym for this sentence. If it were also a separate
    // pattern of the verb, it would be both a distractor and a correct answer.
    for (const pattern of verbPrepositionsV2) {
      for (const alt of pattern.alt_prepositions ?? []) {
        const sibling = verbPrepositionsV2.find(
          (other) =>
            other.verb === pattern.verb &&
            Boolean(other.is_reflexive) === Boolean(pattern.is_reflexive) &&
            other.preposition === alt,
        );
        expect(sibling).toBeUndefined();
      }
    }
  });
});

describeWithSqlite('verb preposition seeding against real SQLite', () => {
  let opened: ReturnType<typeof openTestDatabase>;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    opened = openTestDatabase();
    await runMigrations(opened.db as any);
  });

  afterEach(() => {
    opened.raw.close();
    jest.restoreAllMocks();
  });

  const countRows = () =>
    (
      opened.raw
        .prepare('SELECT COUNT(*) AS count FROM verb_prepositions')
        .get() as { count: number }
    ).count;

  it('inserts every pattern and records the data version', async () => {
    await seedVocabulary(opened.db as any);

    expect(countRows()).toBe(verbPrepositionsV2.length);
    expect(
      opened.raw
        .prepare('SELECT 1 FROM data_versions WHERE version = ?')
        .get('1.2.0_verb_prepositions_v3'),
    ).toBeTruthy();
  });

  it('stores alt_prepositions as JSON and null when absent', async () => {
    await seedVocabulary(opened.db as any);

    const bewerben = opened.raw
      .prepare(
        "SELECT alt_prepositions FROM verb_prepositions WHERE verb = 'bewerben' AND preposition = 'um' LIMIT 1",
      )
      .get() as { alt_prepositions: string };
    expect(JSON.parse(bewerben.alt_prepositions)).toEqual(['auf']);

    const warten = opened.raw
      .prepare(
        "SELECT alt_prepositions FROM verb_prepositions WHERE verb = 'warten' LIMIT 1",
      )
      .get() as { alt_prepositions: string | null };
    expect(warten.alt_prepositions).toBeNull();
  });

  it('is idempotent when the seed is re-run', async () => {
    await seedVocabulary(opened.db as any);
    const idsBefore = opened.raw
      .prepare('SELECT id FROM verb_prepositions ORDER BY id')
      .all();

    // Force the version gate open so the INSERT OR IGNORE itself is exercised
    opened.raw.exec(
      "DELETE FROM data_versions WHERE version = '1.2.0_verb_prepositions_v3'",
    );
    await seedVocabulary(opened.db as any);

    expect(countRows()).toBe(verbPrepositionsV2.length);
    expect(
      opened.raw.prepare('SELECT id FROM verb_prepositions ORDER BY id').all(),
    ).toEqual(idsBefore);
  });
  describe('replacing a previously seeded list', () => {
    const insertLegacyPattern = (sentence: string) =>
      Number(
        opened.raw
          .prepare(
            `INSERT INTO verb_prepositions
               (verb, is_reflexive, preposition, case_governed, sentence, translation)
             VALUES ('schimpfen', 0, 'über', 'akk', ?, 'She grumbles.')`,
          )
          .run(sentence).lastInsertRowid,
      );

    const insertCard = (wordId: number) =>
      Number(
        opened.raw
          .prepare(
            `INSERT INTO card_progress (word_type, word_id, total_reviews)
             VALUES ('verb_prep', ?, 3)`,
          )
          .run(wordId).lastInsertRowid,
      );

    it('retires patterns that are no longer seeded, with their progress', async () => {
      const staleId = insertLegacyPattern('Sie schimpft ____ das Wetter.');
      const staleCardId = insertCard(staleId);
      opened.raw
        .prepare(
          'INSERT INTO review_history (card_progress_id, quality) VALUES (?, 4)',
        )
        .run(staleCardId);

      await seedVocabulary(opened.db as any);

      const count = (sql: string) =>
        (opened.raw.prepare(sql).get() as { count: number }).count;
      expect(
        count(
          "SELECT COUNT(*) AS count FROM verb_prepositions WHERE verb = 'schimpfen'",
        ),
      ).toBe(0);
      expect(
        count(
          "SELECT COUNT(*) AS count FROM card_progress WHERE word_type = 'verb_prep'",
        ),
      ).toBe(0);
      expect(count('SELECT COUNT(*) AS count FROM review_history')).toBe(0);
      expect(countRows()).toBe(verbPrepositionsV2.length);
    });

    it('keeps the id and progress of patterns that are still seeded', async () => {
      const kept = verbPrepositionsV2[0];
      const keptId = Number(
        opened.raw
          .prepare(
            `INSERT INTO verb_prepositions
               (verb, is_reflexive, preposition, case_governed, sentence, translation)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            kept.verb,
            kept.is_reflexive ? 1 : 0,
            kept.preposition,
            kept.case_governed,
            kept.sentence,
            kept.translation,
          ).lastInsertRowid,
      );
      insertCard(keptId);

      await seedVocabulary(opened.db as any);

      expect(
        opened.raw
          .prepare(
            'SELECT id FROM verb_prepositions WHERE verb = ? AND sentence = ?',
          )
          .get(kept.verb, kept.sentence),
      ).toEqual({ id: keptId });
      expect(
        opened.raw
          .prepare(
            "SELECT total_reviews FROM card_progress WHERE word_type = 'verb_prep' AND word_id = ?",
          )
          .get(keptId),
      ).toEqual({ total_reviews: 3 });
      expect(countRows()).toBe(verbPrepositionsV2.length);
    });
  });
});
