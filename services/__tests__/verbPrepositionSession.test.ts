/**
 * verbPrepositionSession.test.ts
 *
 * Session logic for the verb preposition quiz (issue #147): which patterns a
 * session serves and in what order, sibling-based distractors, and that
 * verb_prep progress stays separate from the other quizzes.
 *
 * The first block runs against a mocked db (always). The second runs the
 * real queries against an in-memory SQLite database built by the real
 * migrations (Node 22.5+ only, via node:sqlite; skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import {
  describeWithSqlite,
  openTestDatabase,
  type NodeSqliteDatabase,
} from '@/test-utils/sqlite';
import type { VerbPrepositionCardRow } from '../verbPrepositionService';
import { SpacedRepetitionService } from '../spacedRepetitionService';

let mockActiveDb: unknown;

jest.mock('@/database/db', () => ({ getDatabase: () => mockActiveDb }));

const service = new SpacedRepetitionService();

// ── Mocked db: session-building logic ──────────────────────────────────────

function prepRow(
  overrides: Partial<VerbPrepositionCardRow> = {},
): VerbPrepositionCardRow {
  return {
    id: 0,
    word_type: 'verb_prep',
    word_id: 1,
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review_date: '2026-10-16',
    total_reviews: 0,
    correct_reviews: 0,
    last_reviewed_at: null,
    created_at: '2026-10-16 00:00:00',
    verb: 'warten',
    is_reflexive: 0,
    preposition: 'auf',
    alt_prepositions: null,
    case_governed: 'akk',
    sentence: 'Ich warte ____ meine Frau.',
    translation: "I'm waiting for my wife.",
    english_trap: null,
    remote_id: null,
    sibling_prepositions: null,
    ...overrides,
  };
}

/** `count` valid rows with distinct word ids. */
function validRows(count: number, idOffset: number, isDue: boolean) {
  return Array.from({ length: count }, (_, index) =>
    prepRow({
      id: isDue ? idOffset + index : 0,
      word_id: idOffset + index,
      verb: `warten${idOffset + index}`,
    }),
  );
}

describe('getVerbPrepositionSession() — session logic', () => {
  let mockDb: { getAllAsync: jest.Mock };

  beforeEach(() => {
    mockDb = { getAllAsync: jest.fn() };
    mockActiveDb = mockDb;
  });

  function mockRows(
    dueRows: VerbPrepositionCardRow[],
    newRows: VerbPrepositionCardRow[],
  ) {
    mockDb.getAllAsync
      .mockResolvedValueOnce(dueRows)
      .mockResolvedValueOnce(newRows);
  }

  function queryCall(index: number): [string, (string | number)[]] {
    return mockDb.getAllAsync.mock.calls[index];
  }

  it('reads verb_prep cards only, never other card types', async () => {
    mockRows([], []);
    await service.getVerbPrepositionSession();

    for (const index of [0, 1]) {
      const [sql] = queryCall(index);
      expect(sql).toContain("cp.word_type = 'verb_prep'");
      expect(sql).not.toContain("cp.word_type = 'verb' ");
      expect(sql).not.toContain("cp.word_type = 'noun");
    }
  });

  it('over-fetches candidates so dropped patterns do not leave the session short', async () => {
    mockRows([], []);
    await service.getVerbPrepositionSession(20, 5);

    expect(queryCall(0)[1]).toEqual([45]); // 15 due slots x3
    expect(queryCall(1)[1]).toEqual([15]); // 5 new slots x3
  });

  it('drops patterns that cannot produce a question and attaches the rest', async () => {
    mockRows(
      [prepRow({ id: 7, word_id: 1 })],
      [
        prepRow({ word_id: 2, sentence: 'No blank in this one.' }),
        prepRow({ word_id: 3, verb: 'kämpfen', preposition: 'gegen' }),
        prepRow({
          word_id: 4,
          verb: 'denken',
          preposition: 'an',
          sentence: 'Ich denke oft ____ dich.',
        }),
      ],
    );

    const session = await service.getVerbPrepositionSession();

    expect(session.cards.map((card) => card.verb)).toEqual([
      'warten',
      'denken',
    ]);
    expect(session.cards.every((card) => card.question)).toBeTruthy();
    expect(session.dueCount).toBe(1);
    expect(session.newCount).toBe(1);
  });

  it('asks a pattern once per session, even across due and new cards', async () => {
    const sentence = (text: string) => ({ sentence: text });
    mockRows(
      [
        prepRow({ id: 7, word_id: 1, ...sentence('Ich warte ____ den Bus.') }),
        prepRow({ id: 8, word_id: 2, ...sentence('Wir warten ____ den Zug.') }),
      ],
      [
        // Same pattern as a due card, so its example would give the answer away
        prepRow({ word_id: 3, ...sentence('Sie wartet ____ ihre Freundin.') }),
        prepRow({
          word_id: 4,
          verb: 'hoffen',
          ...sentence('Ich hoffe ____ Regen.'),
        }),
        prepRow({
          word_id: 5,
          verb: 'hoffen',
          ...sentence('Wir hoffen ____ Glück.'),
        }),
      ],
    );

    const session = await service.getVerbPrepositionSession();

    expect(session.cards.map((card) => card.word_id)).toEqual([1, 4]);
    expect(session.dueCount).toBe(1);
    expect(session.newCount).toBe(1);
  });

  it('treats a reflexive verb and its non-reflexive twin as different patterns', async () => {
    mockRows(
      [],
      [
        prepRow({ word_id: 1, verb: 'freuen', is_reflexive: 1 }),
        prepRow({ word_id: 2, verb: 'freuen', is_reflexive: 0 }),
      ],
    );

    const { cards } = await service.getVerbPrepositionSession();

    expect(cards).toHaveLength(2);
  });

  it('feeds sibling patterns into the question buttons', async () => {
    mockRows(
      [],
      [
        prepRow({
          word_id: 1,
          verb: 'sprechen',
          preposition: 'über',
          sentence: 'Wir sprechen ____ das Wetter.',
          sibling_prepositions: '["mit","von"]',
        }),
      ],
    );

    const { cards } = await service.getVerbPrepositionSession();
    const enabled = cards[0].question.buttons
      .filter((button) => button.enabled)
      .map((button) => button.preposition);

    expect(enabled).toEqual(expect.arrayContaining(['über', 'mit', 'von']));
  });

  it('caps due and new cards at their slot counts', async () => {
    mockRows(validRows(40, 100, true), validRows(12, 500, false));

    const session = await service.getVerbPrepositionSession(20, 5);

    expect(session.dueCount).toBe(15);
    expect(session.newCount).toBe(5);
    expect(session.cards).toHaveLength(20);
  });

  it('keeps the most overdue cards when there are more due cards than slots', async () => {
    // Rows arrive ordered by next_review_date ASC, so the first 15 win
    mockRows(validRows(40, 100, true), []);

    const session = await service.getVerbPrepositionSession(20, 5);

    expect(new Set(session.cards.map((card) => card.id))).toEqual(
      new Set(Array.from({ length: 15 }, (_, index) => 100 + index)),
    );
  });

  it('serves due cards before new cards', async () => {
    mockRows(validRows(6, 100, true), validRows(5, 500, false));

    const session = await service.getVerbPrepositionSession(20, 5);

    const dueSection = session.cards.slice(0, session.dueCount);
    const newSection = session.cards.slice(session.dueCount);
    expect(dueSection.every((card) => card.id !== 0)).toBe(true);
    expect(newSection.every((card) => card.id === 0)).toBe(true);
    expect(newSection).toHaveLength(5);
  });

  it('returns an empty session when nothing can be asked', async () => {
    mockRows([], [prepRow({ sentence: 'No blank.' })]);

    const session = await service.getVerbPrepositionSession();

    expect(session).toEqual({ cards: [], dueCount: 0, newCount: 0 });
  });
});

// ── Real SQLite: queries and card isolation ────────────────────────────────

describeWithSqlite('verb preposition quiz against real SQLite', () => {
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

  function insertPattern(
    verb: string,
    preposition: string,
    sentence: string,
    options: { reflexive?: boolean; alts?: string[] } = {},
  ): number {
    const { reflexive = false, alts } = options;
    return Number(
      raw
        .prepare(
          `INSERT INTO verb_prepositions
             (verb, is_reflexive, preposition, alt_prepositions, case_governed, sentence, translation, level)
           VALUES (?, ?, ?, ?, 'akk', ?, 'gloss', 'A2')`,
        )
        .run(
          verb,
          reflexive ? 1 : 0,
          preposition,
          alts ? JSON.stringify(alts) : null,
          sentence,
        ).lastInsertRowid,
    );
  }

  function insertCard(wordType: string, wordId: number, dueOffset = '-1 day') {
    return Number(
      raw
        .prepare(
          "INSERT INTO card_progress (word_type, word_id, next_review_date) VALUES (?, ?, date('now', ?))",
        )
        .run(wordType, wordId, dueOffset).lastInsertRowid,
    );
  }

  it('serves due verb_prep cards first, then new patterns', async () => {
    const warten = insertPattern('warten', 'auf', 'Ich warte ____ meine Frau.');
    insertPattern('denken', 'an', 'Ich denke ____ dich.');
    insertPattern('suchen', 'nach', 'Ich suche ____ meinem Schlüssel.');
    const dueCard = insertCard('verb_prep', warten);

    const session = await service.getVerbPrepositionSession(20, 5);

    expect(session.dueCount).toBe(1);
    expect(session.newCount).toBe(2);
    expect(session.cards[0]).toMatchObject({
      id: dueCard,
      word_type: 'verb_prep',
      word_id: warten,
      verb: 'warten',
    });
    expect(session.cards[0].question.patternLabel).toBe('warten auf + Akk.');
    const newCards = session.cards.slice(1);
    expect(newCards.every((card) => card.id === 0)).toBe(true);
    expect(newCards.map((card) => card.verb).sort()).toEqual([
      'denken',
      'suchen',
    ]);
  });

  it('does not treat another card type with the same word id as a verb_prep card', async () => {
    const warten = insertPattern('warten', 'auf', 'Ich warte ____ meine Frau.');
    // A Präteritum 'verb' card and a plural card sharing the id are unrelated
    insertCard('verb', warten);
    insertCard('noun_plural', warten);

    const session = await service.getVerbPrepositionSession(20, 5);

    expect(session.dueCount).toBe(0);
    expect(session.newCount).toBe(1);
    expect(session.cards[0].id).toBe(0);
  });

  it('does not serve a pattern that is not due yet', async () => {
    const warten = insertPattern('warten', 'auf', 'Ich warte ____ meine Frau.');
    insertCard('verb_prep', warten, '+3 days');

    const session = await service.getVerbPrepositionSession(20, 5);

    expect(session).toEqual({ cards: [], dueCount: 0, newCount: 0 });
  });

  it("offers a verb's other patterns as distractors, scoped to the same verb", async () => {
    insertPattern(
      'freuen',
      'auf',
      'Ich freue mich schon ____ das Wochenende.',
      {
        reflexive: true,
      },
    );
    insertPattern('freuen', 'über', 'Ich freue mich ____ dein Geschenk.', {
      reflexive: true,
    });
    insertPattern('warten', 'auf', 'Ich warte ____ meine Frau.');

    const session = await service.getVerbPrepositionSession(20, 5);
    const freuenAuf = session.cards.find(
      (card) => card.verb === 'freuen' && card.preposition === 'auf',
    )!;

    expect(
      freuenAuf.question.buttons.find((button) => button.preposition === 'über')
        ?.enabled,
    ).toBe(true);
    // 'warten' has no siblings, so nothing is pulled in from other verbs
    const warten = session.cards.find((card) => card.verb === 'warten')!;
    expect(warten.question.primaryAnswer).toBe('auf');
  });

  it('reads stored alt_prepositions as accepted answers', async () => {
    insertPattern(
      'sich entscheiden',
      'für',
      'Ich entscheide mich ____ den Kurs.',
      {
        alts: ['zu'],
      },
    );

    const { cards } = await service.getVerbPrepositionSession(20, 5);
    const { question } = cards[0];

    expect(question.acceptedAnswers).toEqual(['für', 'zu']);
    expect(question.completedSentence).toBe(
      'Ich entscheide mich für den Kurs.',
    );
  });
});
