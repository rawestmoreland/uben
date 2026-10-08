/**
 * pluralQuizSession.test.ts
 *
 * Session logic for the plural-ending quiz (issue #93): which nouns a
 * session serves, in what order, and that plural progress stays out of the
 * article quiz's stats.
 *
 * The first block runs against a mocked db (always). The second runs the
 * real queries against an in-memory SQLite database built by the real
 * migrations (Node 22.5+ only, via node:sqlite; skipped on older Node).
 *
 * The db mock's factory reads `mockActiveDb` lazily, so each block can
 * point it at either a jest.fn() mock or a real test database.
 */

import { runMigrations } from '@/database/migrations';
import { statisticsService } from '@/services/statisticsService';
import { VocabularyService } from '@/services/vocabularyService';
import {
  describeWithSqlite,
  openTestDatabase,
  type NodeSqliteDatabase,
} from '@/test-utils/sqlite';
import type { DuePluralCard } from '@/types/database';
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

// ── Mocked db: session-building logic ──────────────────────────────────────

function pluralRow(
  overrides: Partial<DuePluralCard> & { german: string; plural: string },
): DuePluralCard {
  return {
    id: 0,
    word_type: 'noun_plural',
    word_id: 1,
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review_date: '2026-10-06',
    total_reviews: 0,
    correct_reviews: 0,
    last_reviewed_at: null,
    created_at: '2026-10-06 00:00:00',
    article: 'der',
    english: null,
    sense: null,
    remote_id: null,
    ...overrides,
  };
}

/** `count` classifiable rows (Hund0 -> Hund0e, ...), with distinct word ids. */
function classifiableRows(count: number, idOffset: number, isDue: boolean) {
  return Array.from({ length: count }, (_, index) =>
    pluralRow({
      id: isDue ? idOffset + index : 0,
      word_id: idOffset + index,
      german: `Hund${index}`,
      plural: `Hund${index}e`,
    }),
  );
}

describe('getPluralQuizSession() — session logic', () => {
  let mockDb: { getAllAsync: jest.Mock };

  beforeEach(() => {
    mockDb = { getAllAsync: jest.fn() };
    mockActiveDb = mockDb;
  });

  function mockRows(dueRows: DuePluralCard[], newRows: DuePluralCard[]) {
    mockDb.getAllAsync
      .mockResolvedValueOnce(dueRows)
      .mockResolvedValueOnce(newRows);
  }

  function queryCall(index: number): [string, (string | number)[]] {
    return mockDb.getAllAsync.mock.calls[index];
  }

  it('reads noun_plural cards, never the noun article cards', async () => {
    mockRows([], []);
    await service.getPluralQuizSession();

    const [dueSql] = queryCall(0);
    const [newSql] = queryCall(1);
    expect(dueSql).toContain("cp.word_type = 'noun_plural'");
    expect(newSql).toContain("cp.word_type = 'noun_plural'");
    expect(dueSql).not.toContain("cp.word_type = 'noun' ");
    expect(newSql).not.toContain("cp.word_type = 'noun' ");
  });

  it('only fetches nouns that have a non-empty stored plural', async () => {
    mockRows([], []);
    await service.getPluralQuizSession();

    for (const index of [0, 1]) {
      expect(queryCall(index)[0]).toContain(
        "n.plural IS NOT NULL AND TRIM(n.plural) != ''",
      );
    }
  });

  it('over-fetches candidates so exclusions do not leave the session short', async () => {
    mockRows([], []);
    await service.getPluralQuizSession(20, 5);

    expect(queryCall(0)[1]).toEqual([45]); // 15 due slots x3
    expect(queryCall(1)[1]).toEqual([15]); // 5 new slots x3
  });

  it('drops nouns whose plural does not classify and attaches the ending', async () => {
    mockRows(
      [
        pluralRow({ id: 7, word_id: 1, german: 'Kind', plural: 'Kinder' }),
        pluralRow({ id: 8, word_id: 2, german: 'Museum', plural: 'Museen' }),
      ],
      [
        pluralRow({ word_id: 3, german: 'Bus', plural: 'Busse' }),
        pluralRow({ word_id: 4, german: 'Stuhl', plural: 'Stühle' }),
        pluralRow({ word_id: 5, german: 'Lehrerin', plural: 'Lehrerinnen' }),
      ],
    );

    const session = await service.getPluralQuizSession();

    expect(
      session.cards.map((card) => [card.german, card.ending]),
    ).toEqual([
      ['Kind', 'er'],
      ['Stuhl', 'umlaut_e'],
    ]);
    expect(session.dueCount).toBe(1);
    expect(session.newCount).toBe(1);
  });

  it('caps due and new cards at their slot counts after classification', async () => {
    mockRows(classifiableRows(40, 100, true), classifiableRows(12, 500, false));

    const session = await service.getPluralQuizSession(20, 5);

    expect(session.dueCount).toBe(15);
    expect(session.newCount).toBe(5);
    expect(session.cards).toHaveLength(20);
  });

  it('keeps the most overdue cards when there are more due cards than slots', async () => {
    // Rows arrive ordered by next_review_date ASC, so the first 15 win
    mockRows(classifiableRows(40, 100, true), []);

    const session = await service.getPluralQuizSession(20, 5);

    expect(new Set(session.cards.map((card) => card.id))).toEqual(
      new Set(Array.from({ length: 15 }, (_, index) => 100 + index)),
    );
  });

  it('serves due cards before new cards', async () => {
    mockRows(classifiableRows(6, 100, true), classifiableRows(5, 500, false));

    const session = await service.getPluralQuizSession(20, 5);

    const dueSection = session.cards.slice(0, session.dueCount);
    const newSection = session.cards.slice(session.dueCount);
    expect(dueSection.every((card) => card.id !== 0)).toBe(true);
    expect(newSection.every((card) => card.id === 0)).toBe(true);
    expect(newSection).toHaveLength(5);
  });

  it('binds category and cumulative level filters as parameters', async () => {
    mockRows([], []);
    await service.getPluralQuizSession(20, 5, [3, 4], ['A2']);

    const [dueSql, dueParams] = queryCall(0);
    const [newSql, newParams] = queryCall(1);
    expect(dueParams).toEqual([3, 4, 'A1', 'A2', 45]);
    expect(newParams).toEqual([3, 4, 'A1', 'A2', 15]);
    for (const sql of [dueSql, newSql]) {
      expect(sql).toContain('n.category_id IN (?,?)');
      expect(sql).toContain('n.level IN (?,?) OR n.is_user_added = 1');
    }
  });

  it('defaults new cards to A1 when no level is selected', async () => {
    mockRows([], []);
    await service.getPluralQuizSession();

    expect(queryCall(0)[0]).not.toContain("n.level = 'A1'");
    expect(queryCall(1)[0]).toContain(
      "AND (n.level = 'A1' OR n.is_user_added = 1)",
    );
  });

  it('returns an empty session when nothing classifies', async () => {
    mockRows([], [pluralRow({ german: 'Visum', plural: 'Visa' })]);

    const session = await service.getPluralQuizSession();

    expect(session).toEqual({ cards: [], dueCount: 0, newCount: 0 });
  });
});

describe('getDailyReviewSession() — shared noun filters', () => {
  it('still binds the same article-quiz params after the filter refactor', async () => {
    const mockDb = { getAllAsync: jest.fn().mockResolvedValue([]) };
    mockActiveDb = mockDb;

    await service.getDailyReviewSession(20, 5, [3], ['A2']);

    const [dueSql, dueParams] = mockDb.getAllAsync.mock.calls[0];
    const [newSql, newParams] = mockDb.getAllAsync.mock.calls[1];
    expect(dueParams).toEqual([3, 'A1', 'A2', 15]);
    expect(newParams).toEqual([3, 'A1', 'A2', 5]);
    expect(dueSql).toContain("cp.word_type = 'noun'");
    expect(newSql).toContain("cp.word_type = 'noun'");
  });
});

// ── Real SQLite: queries, stats isolation, cleanup ─────────────────────────

describeWithSqlite('plural quiz against real SQLite', () => {
  let raw: NodeSqliteDatabase;
  const vocabularyService = new VocabularyService();

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const opened = openTestDatabase();
    raw = opened.raw;
    mockActiveDb = opened.db;
    await runMigrations(opened.db as any);
    raw.exec(`
      INSERT INTO categories (id, name, display_name, display_order) VALUES
        (1, 'people', 'People', 1),
        (2, 'home', 'Home', 2);
    `);
  });

  afterEach(() => {
    raw.close();
    jest.restoreAllMocks();
  });

  function insertNoun(
    german: string,
    article: string,
    plural: string | null,
    options: { categoryId?: number; level?: string | null; userAdded?: boolean } = {},
  ): number {
    const { categoryId = 1, level = 'A1', userAdded = false } = options;
    return Number(
      raw
        .prepare(
          'INSERT INTO nouns (german, article, plural, level, category_id, is_user_added) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(german, article, plural, level, categoryId, userAdded ? 1 : 0)
        .lastInsertRowid,
    );
  }

  function insertDueCard(wordType: string, wordId: number): number {
    return Number(
      raw
        .prepare(
          "INSERT INTO card_progress (word_type, word_id, next_review_date) VALUES (?, ?, date('now', '-1 day'))",
        )
        .run(wordType, wordId).lastInsertRowid,
    );
  }

  async function articleStats() {
    const [userStats, mastered, struggling, dailySession] = await Promise.all([
      vocabularyService.getUserStats(),
      statisticsService.getMasteredCount(),
      statisticsService.getStrugglingWordsCount(),
      service.getDailyReviewSession(20, 5),
    ]);
    return {
      userStats,
      mastered,
      struggling,
      articleDueCount: dailySession.dueCount,
    };
  }

  it('serves only cleanly classified nouns, with due plural cards first', async () => {
    const kind = insertNoun('Kind', 'das', 'Kinder');
    const hund = insertNoun('Hund', 'der', 'Hunde');
    insertNoun('Stuhl', 'der', 'Stühle');
    insertNoun('Museum', 'das', 'Museen');
    insertNoun('Bus', 'der', 'Busse');
    insertNoun('Appetit', 'der', null);
    insertNoun('Eltern', 'die', '');
    // Kind's *article* card is due — that's not plural progress
    insertDueCard('noun', kind);
    const hundPluralCard = insertDueCard('noun_plural', hund);

    const session = await service.getPluralQuizSession(20, 5);

    expect(session.dueCount).toBe(1);
    expect(session.cards[0]).toMatchObject({
      id: hundPluralCard,
      word_type: 'noun_plural',
      german: 'Hund',
      ending: 'e',
    });
    const newCards = session.cards.slice(1);
    expect(newCards.map((card) => card.german).sort()).toEqual([
      'Kind',
      'Stuhl',
    ]);
    expect(newCards.every((card) => card.id === 0)).toBe(true);
  });

  it('filters by category and cumulative level like the article quiz', async () => {
    insertNoun('Kind', 'das', 'Kinder', { categoryId: 1, level: 'A1' });
    insertNoun('Tisch', 'der', 'Tische', { categoryId: 2, level: 'A2' });
    insertNoun('Sofa', 'das', 'Sofas', { categoryId: 2, level: null, userAdded: true });

    const germans = async (categoryIds?: number[], levels?: string[]) =>
      (await service.getPluralQuizSession(20, 5, categoryIds, levels)).cards
        .map((card) => card.german)
        .sort();

    expect(await germans()).toEqual(['Kind', 'Sofa']); // new cards default to A1
    expect(await germans(undefined, ['A2'])).toEqual(['Kind', 'Sofa', 'Tisch']);
    expect(await germans([2], ['A2'])).toEqual(['Sofa', 'Tisch']);
  });

  it('drops a due card whose stored plural no longer classifies', async () => {
    const hund = insertNoun('Hund', 'der', 'Hunde');
    insertDueCard('noun_plural', hund);
    raw.prepare('UPDATE nouns SET plural = ? WHERE id = ?').run('Hündinnen', hund);

    const session = await service.getPluralQuizSession(20, 5);

    expect(session.cards).toEqual([]);
  });

  it('tracks plural progress independently and leaves article stats unchanged', async () => {
    const kind = insertNoun('Kind', 'das', 'Kinder');
    const hund = insertNoun('Hund', 'der', 'Hunde');
    insertDueCard('noun', kind);
    const before = await articleStats();

    // Five wrong plural answers for Kind (a "struggling" card), plus a
    // mastered plural card for Hund
    const kindPluralCard = await service.createCardForWord('noun_plural', kind);
    for (let attempt = 0; attempt < 5; attempt++) {
      await service.recordReview(kindPluralCard, 0, 4000);
    }
    const hundPluralCard = await service.createCardForWord('noun_plural', hund);
    raw
      .prepare(
        "UPDATE card_progress SET interval = 30, next_review_date = date('now', '+30 days') WHERE id = ?",
      )
      .run(hundPluralCard);

    expect(await articleStats()).toEqual(before);
    expect(
      raw
        .prepare(
          "SELECT word_type, total_reviews FROM card_progress WHERE word_id = ? ORDER BY word_type",
        )
        .all(kind),
    ).toEqual([
      { word_type: 'noun', total_reviews: 0 },
      { word_type: 'noun_plural', total_reviews: 5 },
    ]);
    // Plural reviews still count as study activity (streak / heatmap)
    expect(await service.hasReviewedToday()).toBe(true);

    // Kind's plural card is now due rather than new
    const session = await service.getPluralQuizSession(20, 5);
    expect(session.dueCount).toBe(1);
    expect(session.cards[0]).toMatchObject({ id: kindPluralCard, german: 'Kind' });
  });

  it('deleting a user-added noun also removes its plural card and history', async () => {
    const sofa = insertNoun('Sofa', 'das', 'Sofas', { userAdded: true });
    const articleCard = await service.createCardForWord('noun', sofa);
    const pluralCard = await service.createCardForWord('noun_plural', sofa);
    await service.recordReview(articleCard, 5, 800);
    await service.recordReview(pluralCard, 5, 800);

    const result = await vocabularyService.deleteUserNoun(sofa);

    expect(result.success).toBe(true);
    const remaining = (sql: string) =>
      (raw.prepare(sql).get() as { count: number }).count;
    expect(remaining('SELECT COUNT(*) AS count FROM card_progress')).toBe(0);
    expect(remaining('SELECT COUNT(*) AS count FROM review_history')).toBe(0);
  });
});
