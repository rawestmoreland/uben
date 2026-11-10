/**
 * dualArticleSeed.test.ts
 *
 * Nouns with two valid articles for the same meaning (der/die Gleichgesinnte):
 * checks the seed data and that seeding/backfilling `article_alt` works
 * against a real in-memory SQLite database (Node 22.5+ only, via node:sqlite;
 * the DB tests are skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import { seedVocabulary } from '@/database/seed';
import { dualArticleCorrections } from '@/database/seeds/corrections/dual-article-nouns';
import { dualArticleNouns } from '@/database/seeds/nouns/dual-article';
import { nounSeedVersions } from '@/database/seeds/nouns';
import { describeWithSqlite, openTestDatabase } from '@/test-utils/sqlite';

describe('dual-article seed data', () => {
  it('lists each noun once with a second article that differs from the first', () => {
    const keys = dualArticleNouns.map((noun) => noun.german);
    expect(new Set(keys).size).toBe(keys.length);
    for (const noun of dualArticleNouns) {
      expect(noun.article_alt).toBeTruthy();
      expect(['der', 'die', 'das']).toContain(noun.article_alt);
      expect(noun.article_alt).not.toBe(noun.article);
    }
  });

  it('is registered as its own noun seed version', () => {
    expect(
      nounSeedVersions.some((version) => version.nouns === dualArticleNouns),
    ).toBe(true);
  });

  it('backfills only article_alt and never changes a primary article', () => {
    for (const correction of dualArticleCorrections.corrections) {
      expect(Object.keys(correction.corrections)).toEqual(['article_alt']);
      expect(correction.corrections.article_alt).not.toBe(
        correction.currentArticle,
      );
    }
  });
});

describeWithSqlite('dual-article nouns against real SQLite', () => {
  let raw: ReturnType<typeof openTestDatabase>['raw'];
  let db: ReturnType<typeof openTestDatabase>['db'];

  beforeEach(() => {
    ({ raw, db } = openTestDatabase());
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    raw.close();
    jest.restoreAllMocks();
  });

  function nounRow(german: string) {
    return raw
      .prepare(
        'SELECT article, article_alt, level, plural FROM nouns WHERE german = ?',
      )
      .all(german);
  }

  it('seeds Gleichgesinnte as one row holding both articles', async () => {
    await runMigrations(db as any);
    await seedVocabulary(db as any);

    expect(nounRow('Gleichgesinnte')).toEqual([
      {
        article: 'der',
        article_alt: 'die',
        level: 'B2',
        plural: 'Gleichgesinnten',
      },
    ]);
  });

  it('backfills existing adjectival nouns with a second article', async () => {
    await runMigrations(db as any);
    await seedVocabulary(db as any);

    expect(nounRow('Angestellte')).toEqual([
      expect.objectContaining({ article: 'der', article_alt: 'die' }),
    ]);
    expect(nounRow('Bekannte')).toEqual([
      expect.objectContaining({ article: 'der', article_alt: 'die' }),
    ]);
  });

  it('upgrades an existing install without touching the row id or card progress', async () => {
    await runMigrations(db as any);
    await seedVocabulary(db as any);
    const angestellte = raw
      .prepare("SELECT id FROM nouns WHERE german = 'Angestellte'")
      .get() as { id: number };
    raw
      .prepare(
        "INSERT INTO card_progress (word_type, word_id, interval, total_reviews, correct_reviews) VALUES ('noun', ?, 6, 3, 2)",
      )
      .run(angestellte.id);

    // Simulate a device that shipped before article_alt was backfilled
    raw.exec('UPDATE nouns SET article_alt = NULL');
    raw
      .prepare('DELETE FROM data_versions WHERE version = ?')
      .run(dualArticleCorrections.version);

    await seedVocabulary(db as any);

    expect(nounRow('Angestellte')).toEqual([
      expect.objectContaining({ article: 'der', article_alt: 'die' }),
    ]);
    expect(
      raw
        .prepare("SELECT id FROM nouns WHERE german = 'Angestellte'")
        .get(),
    ).toEqual({ id: angestellte.id });
    expect(
      raw
        .prepare('SELECT interval, total_reviews FROM card_progress')
        .all(),
    ).toEqual([{ interval: 6, total_reviews: 3 }]);
  });
});
