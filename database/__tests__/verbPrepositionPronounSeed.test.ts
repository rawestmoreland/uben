/**
 * verbPrepositionPronounSeed.test.ts
 *
 * da(r)-/wo(r)- quiz (issue #151): validates the authored sentences against
 * the patterns they belong to, and that seeding links and de-duplicates them
 * against a real in-memory SQLite database (Node 22.5+ only, via node:sqlite;
 * the DB tests are skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import { seedVocabulary } from '@/database/seed';
import { verbPrepositionsV1 } from '@/database/seeds/verb-prepositions/v1-initial';
import { verbPrepositionPronounsV1 } from '@/database/seeds/verb-prepositions/v1-pronouns';
import { buildPronounQuestion } from '@/services/verbPrepositionPronounService';
import { describeWithSqlite, openTestDatabase } from '@/test-utils/sqlite';

function findPattern(entry: (typeof verbPrepositionPronounsV1)[number]) {
  return verbPrepositionsV1.filter(
    (pattern) =>
      pattern.verb === entry.verb &&
      Boolean(pattern.is_reflexive) === Boolean(entry.is_reflexive) &&
      pattern.preposition === entry.preposition,
  );
}

describe('verb preposition pronoun seed data', () => {
  it('has a good spread of patterns', () => {
    expect(verbPrepositionPronounsV1.length).toBeGreaterThanOrEqual(50);
  });

  it('matches exactly one seeded pattern per entry', () => {
    for (const entry of verbPrepositionPronounsV1) {
      expect(findPattern(entry)).toHaveLength(1);
    }
  });

  it('has no duplicate patterns', () => {
    const keys = verbPrepositionPronounsV1.map(
      (entry) =>
        `${entry.verb}|${entry.is_reflexive ? 1 : 0}|${entry.preposition}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('has exactly one blank in every sentence, with text around it', () => {
    for (const entry of verbPrepositionPronounsV1) {
      for (const sentence of [entry.da_sentence, entry.wo_sentence]) {
        expect(sentence.split('____')).toHaveLength(2);
        expect(sentence.replace('____', '').trim()).not.toBe('');
      }
      expect(entry.da_translation.trim()).not.toBe('');
      expect(entry.wo_translation.trim()).not.toBe('');
    }
  });

  it('opens every wo(r)- sentence with the blank and never the da(r)- one', () => {
    for (const entry of verbPrepositionPronounsV1) {
      expect(entry.wo_sentence.startsWith('____ ')).toBe(true);
      expect(entry.wo_sentence.endsWith('?')).toBe(true);
      expect(entry.da_sentence.startsWith('____')).toBe(false);
    }
  });

  it('skips patterns with synonym alternates', () => {
    for (const entry of verbPrepositionPronounsV1) {
      expect(findPattern(entry)[0].alt_prepositions).toBeUndefined();
    }
  });

  it('builds a question for both forms of every entry', () => {
    for (const entry of verbPrepositionPronounsV1) {
      const pattern = findPattern(entry)[0];
      for (const format of ['da', 'wo'] as const) {
        const question = buildPronounQuestion(
          {
            verb: pattern.verb,
            is_reflexive: pattern.is_reflexive ? 1 : 0,
            preposition: pattern.preposition,
            case_governed: pattern.case_governed,
            sentence: format === 'da' ? entry.da_sentence : entry.wo_sentence,
            translation:
              format === 'da' ? entry.da_translation : entry.wo_translation,
          },
          format,
        );
        expect(question).not.toBeNull();
        expect(question!.completedSentence).not.toContain('____');
      }
    }
  });
});

describeWithSqlite(
  'verb preposition pronoun seeding against real SQLite',
  () => {
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
          .prepare('SELECT COUNT(*) AS count FROM verb_preposition_pronouns')
          .get() as { count: number }
      ).count;

    it('inserts every entry linked to its pattern and records the data version', async () => {
      await seedVocabulary(opened.db as any);

      expect(countRows()).toBe(verbPrepositionPronounsV1.length);

      const warten = opened.raw
        .prepare(
          `SELECT vp.verb, vp.preposition, vpp.da_sentence, vpp.wo_sentence
         FROM verb_preposition_pronouns vpp
         JOIN verb_prepositions vp ON vp.id = vpp.verb_preposition_id
         WHERE vp.verb = 'warten'`,
        )
        .get() as Record<string, string>;
      expect(warten.preposition).toBe('auf');
      expect(warten.da_sentence).toContain('____');
      expect(warten.wo_sentence).toContain('____');

      const version = opened.raw
        .prepare('SELECT 1 FROM data_versions WHERE version = ?')
        .get('1.0.0_verb_preposition_pronouns_v1');
      expect(version).toBeDefined();
    });

    it('is idempotent and keeps row ids stable', async () => {
      await seedVocabulary(opened.db as any);
      const idsBefore = opened.raw
        .prepare('SELECT id FROM verb_preposition_pronouns ORDER BY id')
        .all();

      await seedVocabulary(opened.db as any);

      expect(countRows()).toBe(verbPrepositionPronounsV1.length);
      expect(
        opened.raw
          .prepare('SELECT id FROM verb_preposition_pronouns ORDER BY id')
          .all(),
      ).toEqual(idsBefore);
    });
  },
);
