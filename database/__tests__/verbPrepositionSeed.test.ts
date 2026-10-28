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
import { adjectiveNounPrepositionsV2 } from '@/database/seeds/verb-prepositions/v2-adjectives-nouns';
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

const ALL_PATTERNS = [...verbPrepositionsV1, ...adjectiveNounPrepositionsV2];

describe('adjective and noun preposition seed data (#152)', () => {
  it('has a solid set of adjective and noun patterns', () => {
    const adjectives = adjectiveNounPrepositionsV2.filter(
      (pattern) => pattern.kind === 'adjective',
    );
    const nouns = adjectiveNounPrepositionsV2.filter(
      (pattern) => pattern.kind === 'noun',
    );
    expect(adjectives.length).toBeGreaterThanOrEqual(25);
    expect(nouns.length).toBeGreaterThanOrEqual(25);
    expect(adjectives.length + nouns.length).toBe(
      adjectiveNounPrepositionsV2.length,
    );
  });

  it('uses only adjective or noun kinds and never reflexive', () => {
    for (const pattern of adjectiveNounPrepositionsV2) {
      expect(['adjective', 'noun']).toContain(pattern.kind);
      expect(pattern.is_reflexive).toBeUndefined();
    }
  });

  it('capitalises noun head words and lowercases adjectives', () => {
    for (const pattern of adjectiveNounPrepositionsV2) {
      const first = pattern.verb.charAt(0);
      if (pattern.kind === 'noun') expect(first).toBe(first.toUpperCase());
      else expect(first).toBe(first.toLowerCase());
    }
  });

  it('uses only the cases and levels the schema allows', () => {
    for (const pattern of adjectiveNounPrepositionsV2) {
      expect(VALID_CASES).toContain(pattern.case_governed);
      expect(VALID_LEVELS).toContain(pattern.level);
    }
  });

  it('does not repeat a v1 verb pattern', () => {
    const verbSentences = new Set(verbPrepositionsV1.map((p) => p.sentence));
    for (const pattern of adjectiveNounPrepositionsV2) {
      expect(verbSentences.has(pattern.sentence)).toBe(false);
    }
  });
});

describe('verb preposition seed data', () => {
  it('has roughly 100 patterns', () => {
    expect(verbPrepositionsV1.length).toBeGreaterThanOrEqual(95);
    expect(verbPrepositionsV1.length).toBeLessThanOrEqual(120);
  });

  it('has exactly one blank in every sentence', () => {
    for (const pattern of ALL_PATTERNS) {
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
    for (const pattern of ALL_PATTERNS) {
      expect(QUIZ_PREPOSITIONS).toContain(pattern.preposition);
      for (const alt of pattern.alt_prepositions ?? []) {
        expect(QUIZ_PREPOSITIONS).toContain(alt);
      }
    }
  });

  it('never lists the primary preposition among alt_prepositions', () => {
    for (const pattern of ALL_PATTERNS) {
      expect(pattern.alt_prepositions ?? []).not.toContain(pattern.preposition);
    }
  });

  it('has no empty or duplicated alt_prepositions', () => {
    for (const pattern of ALL_PATTERNS) {
      if (pattern.alt_prepositions === undefined) continue;
      expect(pattern.alt_prepositions.length).toBeGreaterThan(0);
      expect(new Set(pattern.alt_prepositions).size).toBe(
        pattern.alt_prepositions.length,
      );
    }
  });

  it('has a verb, translation and non-blank text on every pattern', () => {
    for (const pattern of ALL_PATTERNS) {
      expect(pattern.verb.trim()).not.toBe('');
      expect(pattern.translation.trim()).not.toBe('');
      expect(pattern.sentence.replace('____', '').trim()).not.toBe('');
      if (pattern.english_trap !== undefined) {
        expect(pattern.english_trap.trim()).not.toBe('');
      }
    }
  });

  it('has no duplicate (verb, reflexive, preposition, sentence)', () => {
    const keys = ALL_PATTERNS.map(
      (p) =>
        `${p.verb}|${p.is_reflexive ? 1 : 0}|${p.preposition}|${p.sentence}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives sibling patterns of a verb distinct sentences', () => {
    // Sibling patterns must be told apart by their sentence alone, so two
    // patterns of one verb may never share a sentence.
    const seen = new Map<string, string>();
    for (const pattern of ALL_PATTERNS) {
      const key = `${pattern.kind ?? 'verb'}|${pattern.verb}|${pattern.is_reflexive ? 1 : 0}|${pattern.sentence}`;
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

    expect(countRows()).toBe(ALL_PATTERNS.length);
    for (const version of [
      '1.0.0_verb_prepositions_v1',
      '1.1.0_adjective_noun_prepositions_v2',
    ]) {
      expect(
        opened.raw
          .prepare('SELECT 1 FROM data_versions WHERE version = ?')
          .get(version),
      ).toBeTruthy();
    }
  });

  it('stores verbs, adjectives and nouns under their own kind', async () => {
    await seedVocabulary(opened.db as any);

    const kindOf = (head: string) =>
      (
        opened.raw
          .prepare('SELECT kind FROM verb_prepositions WHERE verb = ? LIMIT 1')
          .get(head) as { kind: string }
      ).kind;
    expect(kindOf('warten')).toBe('verb');
    expect(kindOf('stolz')).toBe('adjective');
    expect(kindOf('Angst')).toBe('noun');
    expect(
      (
        opened.raw
          .prepare(
            "SELECT COUNT(*) AS count FROM verb_prepositions WHERE kind = 'verb'",
          )
          .get() as { count: number }
      ).count,
    ).toBe(verbPrepositionsV1.length);
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

    // Force the version gates open so the INSERT OR IGNORE itself is exercised
    opened.raw.exec(
      "DELETE FROM data_versions WHERE version IN ('1.0.0_verb_prepositions_v1', '1.1.0_adjective_noun_prepositions_v2')",
    );
    await seedVocabulary(opened.db as any);

    expect(countRows()).toBe(ALL_PATTERNS.length);
    expect(
      opened.raw.prepare('SELECT id FROM verb_prepositions ORDER BY id').all(),
    ).toEqual(idsBefore);
  });
});
