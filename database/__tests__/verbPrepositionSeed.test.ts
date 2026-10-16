/**
 * verbPrepositionSeed.test.ts
 *
 * Verb preposition quiz (issue #146): validates the authored seed data and
 * that seeding is idempotent against a real in-memory SQLite database
 * (Node 22.5+ only, via node:sqlite; the DB test is skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import { seedVocabulary } from '@/database/seed';
import { verbPrepositionsV1 } from '@/database/seeds/verb-prepositions/v1-initial';
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
  it('has roughly 100 patterns', () => {
    expect(verbPrepositionsV1.length).toBeGreaterThanOrEqual(95);
    expect(verbPrepositionsV1.length).toBeLessThanOrEqual(120);
  });

  it('has exactly one blank in every sentence', () => {
    for (const pattern of verbPrepositionsV1) {
      expect(pattern.sentence.split('____')).toHaveLength(2);
    }
  });

  it('uses only valid case and level values', () => {
    for (const pattern of verbPrepositionsV1) {
      expect(VALID_CASES).toContain(pattern.case_governed);
      expect(VALID_LEVELS).toContain(pattern.level);
    }
  });

  it('uses only quiz prepositions as answers and alternates', () => {
    for (const pattern of verbPrepositionsV1) {
      expect(QUIZ_PREPOSITIONS).toContain(pattern.preposition);
      for (const alt of pattern.alt_prepositions ?? []) {
        expect(QUIZ_PREPOSITIONS).toContain(alt);
      }
    }
  });

  it('never lists the primary preposition among alt_prepositions', () => {
    for (const pattern of verbPrepositionsV1) {
      expect(pattern.alt_prepositions ?? []).not.toContain(pattern.preposition);
    }
  });

  it('has no empty or duplicated alt_prepositions', () => {
    for (const pattern of verbPrepositionsV1) {
      if (pattern.alt_prepositions === undefined) continue;
      expect(pattern.alt_prepositions.length).toBeGreaterThan(0);
      expect(new Set(pattern.alt_prepositions).size).toBe(
        pattern.alt_prepositions.length,
      );
    }
  });

  it('has a verb, translation and non-blank text on every pattern', () => {
    for (const pattern of verbPrepositionsV1) {
      expect(pattern.verb.trim()).not.toBe('');
      expect(pattern.translation.trim()).not.toBe('');
      expect(pattern.sentence.replace('____', '').trim()).not.toBe('');
      if (pattern.english_trap !== undefined) {
        expect(pattern.english_trap.trim()).not.toBe('');
      }
    }
  });

  it('has no duplicate (verb, reflexive, preposition, sentence)', () => {
    const keys = verbPrepositionsV1.map(
      (p) =>
        `${p.verb}|${p.is_reflexive ? 1 : 0}|${p.preposition}|${p.sentence}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives sibling patterns of a verb distinct sentences', () => {
    // Sibling patterns must be told apart by their sentence alone, so two
    // patterns of one verb may never share a sentence.
    const seen = new Map<string, string>();
    for (const pattern of verbPrepositionsV1) {
      const key = `${pattern.verb}|${pattern.is_reflexive ? 1 : 0}|${pattern.sentence}`;
      expect(seen.has(key)).toBe(false);
      seen.set(key, pattern.preposition);
    }
  });

  it('covers every quiz preposition', () => {
    const used = new Set(verbPrepositionsV1.map((p) => p.preposition));
    for (const preposition of QUIZ_PREPOSITIONS) {
      expect(used).toContain(preposition);
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

    expect(countRows()).toBe(verbPrepositionsV1.length);
    expect(
      opened.raw
        .prepare('SELECT 1 FROM data_versions WHERE version = ?')
        .get('1.0.0_verb_prepositions_v1'),
    ).toBeTruthy();
  });

  it('stores alt_prepositions as JSON and null when absent', async () => {
    await seedVocabulary(opened.db as any);

    const schimpfen = opened.raw
      .prepare(
        "SELECT alt_prepositions FROM verb_prepositions WHERE verb = 'schimpfen'",
      )
      .get() as { alt_prepositions: string };
    expect(JSON.parse(schimpfen.alt_prepositions)).toEqual(['auf']);

    const warten = opened.raw
      .prepare(
        "SELECT alt_prepositions FROM verb_prepositions WHERE verb = 'warten'",
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
      "DELETE FROM data_versions WHERE version = '1.0.0_verb_prepositions_v1'",
    );
    await seedVocabulary(opened.db as any);

    expect(countRows()).toBe(verbPrepositionsV1.length);
    expect(
      opened.raw.prepare('SELECT id FROM verb_prepositions ORDER BY id').all(),
    ).toEqual(idsBefore);
  });
});
