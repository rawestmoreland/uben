/**
 * verbPrepositionCompound.test.ts
 *
 * da(r)-/wo(r)- compounds in the verb preposition quiz (issue #151): the
 * compound rule, the question built from a pattern, grading, the session
 * (one card per pattern, own progress), and stats isolation.
 *
 * The first blocks are pure. The last runs the real queries against an
 * in-memory SQLite database built by the real migrations and seeds (Node
 * 22.5+ only, via node:sqlite; skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import { seedVocabulary } from '@/database/seed';
import { statisticsService } from '@/services/statisticsService';
import { VocabularyService } from '@/services/vocabularyService';
import {
  describeWithSqlite,
  openTestDatabase,
  type NodeSqliteDatabase,
} from '@/test-utils/sqlite';
import { SpacedRepetitionService } from '../spacedRepetitionService';
import {
  buildVerbPrepositionCompoundCards,
  buildVerbPrepositionCompoundQuestion,
  describeCompound,
  getCompoundGrid,
  onePerPattern,
  toCompound,
  type VerbPrepositionCompoundCardRow,
} from '../verbPrepositionCompoundService';
import {
  isCorrectPreposition,
  needsCaseStep,
  PREPOSITION_GRID,
  type VerbPrepositionPattern,
} from '../verbPrepositionService';

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

// ── The compound rule ──────────────────────────────────────────────────

describe('toCompound()', () => {
  // The whole grid, spelled out, so a change to the rule shows up here
  const EXPECTED: Record<string, { da: string; wo: string }> = {
    an: { da: 'daran', wo: 'woran' },
    auf: { da: 'darauf', wo: 'worauf' },
    aus: { da: 'daraus', wo: 'woraus' },
    bei: { da: 'dabei', wo: 'wobei' },
    für: { da: 'dafür', wo: 'wofür' },
    in: { da: 'darin', wo: 'worin' },
    mit: { da: 'damit', wo: 'womit' },
    nach: { da: 'danach', wo: 'wonach' },
    über: { da: 'darüber', wo: 'worüber' },
    um: { da: 'darum', wo: 'worum' },
    von: { da: 'davon', wo: 'wovon' },
    vor: { da: 'davor', wo: 'wovor' },
    zu: { da: 'dazu', wo: 'wozu' },
  };

  it('covers every preposition on the quiz grid', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual([...PREPOSITION_GRID].sort());
  });

  it.each(Object.entries(EXPECTED))(
    'builds both forms of %s',
    (preposition, forms) => {
      expect(toCompound(preposition, 'da')).toBe(forms.da);
      expect(toCompound(preposition, 'wo')).toBe(forms.wo);
    },
  );

  it('inserts an r before a vowel and not before a consonant', () => {
    expect(toCompound('auf', 'da')).toBe('darauf');
    expect(toCompound('über', 'wo')).toBe('worüber');
    expect(toCompound('für', 'da')).toBe('dafür');
    expect(toCompound('mit', 'wo')).toBe('womit');
  });

  it('normalizes case and whitespace', () => {
    expect(toCompound(' Auf ', 'da')).toBe('darauf');
  });

  it('lists the compounds in the preposition grid order', () => {
    expect(getCompoundGrid('da')).toEqual(
      PREPOSITION_GRID.map((p) => EXPECTED[p].da),
    );
    expect(getCompoundGrid('wo')).toHaveLength(PREPOSITION_GRID.length);
  });

  it('describes how a compound is built', () => {
    expect(describeCompound('auf', 'da')).toBe('da + r + auf');
    expect(describeCompound('über', 'wo')).toBe('wo + r + über');
    expect(describeCompound('für', 'da')).toBe('da + für');
  });
});

// ── Questions ──────────────────────────────────────────────────────────

function pattern(
  overrides: Partial<VerbPrepositionPattern> = {},
): VerbPrepositionPattern {
  return {
    verb: 'warten',
    is_reflexive: 0,
    preposition: 'auf',
    alt_prepositions: null,
    case_governed: 'akk',
    sentence: 'Der Bus kommt gleich. Ich warte ____.',
    translation: "I'm waiting for it.",
    ...overrides,
  };
}

const firstOption = () => 0;

describe('buildVerbPrepositionCompoundQuestion()', () => {
  it('turns the buttons into the whole da compound grid in a fixed order', () => {
    const question = buildVerbPrepositionCompoundQuestion(
      pattern(),
      'da',
      null,
      { random: firstOption },
    )!;

    expect(question.buttons.map((b) => b.preposition)).toEqual(
      getCompoundGrid('da'),
    );
    expect(question.primaryAnswer).toBe('darauf');
    expect(question.acceptedAnswers).toEqual(['darauf']);
    expect(
      question.buttons.find((b) => b.preposition === 'darauf')?.enabled,
    ).toBe(true);
  });

  it('fills the blank with the compound', () => {
    const da = buildVerbPrepositionCompoundQuestion(pattern(), 'da', null)!;
    expect(da.completedSentence).toBe(
      'Der Bus kommt gleich. Ich warte darauf.',
    );
  });

  it('capitalizes a compound that opens the sentence', () => {
    const wo = buildVerbPrepositionCompoundQuestion(
      pattern({
        sentence: '____ wartest du?',
        translation: 'What are you waiting for?',
      }),
      'wo',
      null,
    )!;

    expect(wo.primaryAnswer).toBe('worauf');
    expect(wo.completedSentence).toBe('Worauf wartest du?');
  });

  it('keeps the pattern label and shows how the answer is built', () => {
    const question = buildVerbPrepositionCompoundQuestion(
      pattern(),
      'da',
      'Ich warte auf ihn.',
    )!;

    expect(question.patternLabel).toBe('warten auf + Akk.');
    expect(question.compound).toEqual({
      form: 'da',
      construction: 'da + r + auf',
      personExample: 'Ich warte auf ihn.',
    });
  });

  it("offers the verb's other prepositions as compound distractors", () => {
    const question = buildVerbPrepositionCompoundQuestion(
      pattern({
        verb: 'freuen',
        is_reflexive: 1,
        sentence: 'Das Geschenk ist toll. Ich freue mich sehr ____.',
        preposition: 'über',
      }),
      'da',
      null,
      { siblingPrepositions: ['auf'], random: firstOption },
    )!;

    expect(question.primaryAnswer).toBe('darüber');
    expect(
      question.buttons.find((b) => b.preposition === 'darauf')?.enabled,
    ).toBe(true);
  });

  it('enables every accepted alternate and never offers it as a distractor', () => {
    const question = buildVerbPrepositionCompoundQuestion(
      pattern({
        verb: 'bewerben',
        is_reflexive: 1,
        preposition: 'um',
        alt_prepositions: '["auf"]',
        sentence: 'Die Stelle ist frei. Ich bewerbe mich ____.',
      }),
      'da',
      null,
      { siblingPrepositions: ['auf', 'bei'], random: firstOption },
    )!;

    expect(question.acceptedAnswers).toEqual(['darum', 'darauf']);
    const enabled = question.buttons
      .filter((b) => b.enabled)
      .map((b) => b.preposition);
    expect(enabled).toEqual(expect.arrayContaining(['darum', 'darauf']));
    // Eight buttons in total: two answers plus six distractors
    expect(enabled).toHaveLength(8);
    expect(new Set(enabled).size).toBe(8);
  });

  it('returns null when the sentence has no blank or the preposition has no button', () => {
    expect(
      buildVerbPrepositionCompoundQuestion(
        pattern({ sentence: 'Ich warte darauf.' }),
        'da',
        null,
      ),
    ).toBeNull();
    expect(
      buildVerbPrepositionCompoundQuestion(
        pattern({ preposition: 'gegen' }),
        'da',
        null,
      ),
    ).toBeNull();
  });

  it('grades compounds, not prepositions', () => {
    const question = buildVerbPrepositionCompoundQuestion(
      pattern(),
      'da',
      null,
    )!;

    expect(isCorrectPreposition(question, 'darauf')).toBe(true);
    expect(isCorrectPreposition(question, 'Darauf')).toBe(true);
    expect(isCorrectPreposition(question, 'dafür')).toBe(false);
    expect(isCorrectPreposition(question, 'auf')).toBe(false);
  });

  it('never asks for the case: a compound is not a two-way preposition', () => {
    // 'auf' is two-way, but darauf is the answer here
    const question = buildVerbPrepositionCompoundQuestion(
      pattern(),
      'da',
      null,
    )!;

    expect(needsCaseStep(question, 'darauf')).toBe(false);
  });
});

// ── Session building ───────────────────────────────────────────────────

function row(
  overrides: Partial<VerbPrepositionCompoundCardRow> = {},
): VerbPrepositionCompoundCardRow {
  return {
    id: 0,
    word_type: 'verb_prep_compound',
    word_id: 1,
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review_date: '2026-10-18',
    total_reviews: 0,
    correct_reviews: 0,
    last_reviewed_at: null,
    created_at: '2026-10-18 00:00:00',
    verb_preposition_id: 1,
    form: 'da',
    person_example: null,
    verb: 'warten',
    is_reflexive: 0,
    preposition: 'auf',
    alt_prepositions: null,
    case_governed: 'akk',
    sentence: 'Der Bus kommt gleich. Ich warte ____.',
    translation: "I'm waiting for it.",
    english_trap: null,
    remote_id: null,
    sibling_prepositions: null,
    ...overrides,
  };
}

describe('buildVerbPrepositionCompoundCards()', () => {
  it('attaches a question and drops cards that cannot be asked', () => {
    const cards = buildVerbPrepositionCompoundCards([
      row({ word_id: 1 }),
      row({ word_id: 2, sentence: 'No blank here.' }),
      row({ word_id: 3, form: 'wo', sentence: '____ wartest du?' }),
    ]);

    expect(cards.map((card) => card.word_id)).toEqual([1, 3]);
    expect(cards[0].question.primaryAnswer).toBe('darauf');
    expect(cards[1].question.primaryAnswer).toBe('worauf');
    expect(cards[0]).not.toHaveProperty('sibling_prepositions');
  });
});

describe('onePerPattern()', () => {
  const cards = [
    { id: 1, verb_preposition_id: 10 },
    { id: 2, verb_preposition_id: 10 },
    { id: 3, verb_preposition_id: 11 },
  ];

  it('keeps the first card of each pattern', () => {
    expect(onePerPattern(cards).map((card) => card.id)).toEqual([1, 3]);
  });

  it('skips patterns that were already taken', () => {
    expect(onePerPattern(cards, new Set([10])).map((card) => card.id)).toEqual([
      3,
    ]);
  });
});

// ── Locales ────────────────────────────────────────────────────────────

describe('locales', () => {
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

  it.each(Object.keys(locales))(
    '%s has the compound quiz strings',
    (locale) => {
      const { verb_preposition_compound_quiz: quiz, home_screen: home } =
        locales[locale].app;
      for (const key of ['badge', 'prompt_da', 'prompt_wo']) {
        expect(quiz[key]).toEqual(expect.any(String));
      }
      expect(quiz.question_a11y).toContain('{{sentence}}');
      expect(quiz.person_rule).toContain('{{compound}}');
      expect(quiz.person_rule).toContain('{{example}}');
      expect(home.tiles.compounds.title).toEqual(expect.any(String));
      expect(home.tiles.compounds.subtitle).toEqual(expect.any(String));
    },
  );
});

// ── Real SQLite: queries, isolation and the seed ───────────────────────

describeWithSqlite('da(r)-/wo(r)- quiz against real SQLite', () => {
  let raw: NodeSqliteDatabase;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const opened = openTestDatabase();
    raw = opened.raw;
    mockActiveDb = opened.db;
    await runMigrations(opened.db as any);
  });

  afterEach(() => {
    raw.close();
    jest.restoreAllMocks();
  });

  function count(sql: string): number {
    return (raw.prepare(sql).get() as { count: number }).count;
  }

  function insertPattern(
    verb: string,
    preposition: string,
    options: { reflexive?: boolean } = {},
  ): number {
    return Number(
      raw
        .prepare(
          `INSERT INTO verb_prepositions (verb, is_reflexive, preposition, case_governed, sentence, translation, level)
           VALUES (?, ?, ?, 'akk', 'Ich ____ etwas.', 'gloss', 'A2')`,
        )
        .run(verb, options.reflexive ? 1 : 0, preposition).lastInsertRowid,
    );
  }

  function insertCompound(
    patternId: number,
    form: 'da' | 'wo',
    sentence: string,
    personExample: string | null = null,
  ): number {
    return Number(
      raw
        .prepare(
          `INSERT INTO verb_preposition_compounds (verb_preposition_id, form, sentence, translation, person_example)
           VALUES (?, ?, ?, 'gloss', ?)`,
        )
        .run(patternId, form, sentence, personExample).lastInsertRowid,
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

  it('serves due compound cards first, then new ones, with their compound answer', async () => {
    const warten = insertPattern('warten', 'auf');
    const denken = insertPattern('denken', 'an');
    const wartenDa = insertCompound(
      warten,
      'da',
      'Ich warte ____.',
      'Ich warte auf ihn.',
    );
    insertCompound(denken, 'wo', '____ denkst du?');
    const dueCard = insertCard('verb_prep_compound', wartenDa);

    const session = await service.getVerbPrepositionCompoundSession(20, 5);

    expect(session.dueCount).toBe(1);
    expect(session.newCount).toBe(1);
    expect(session.cards[0]).toMatchObject({
      id: dueCard,
      word_type: 'verb_prep_compound',
      word_id: wartenDa,
      form: 'da',
      person_example: 'Ich warte auf ihn.',
    });
    expect(session.cards[0].question.primaryAnswer).toBe('darauf');
    expect(session.cards[1]).toMatchObject({
      id: 0,
      word_type: 'verb_prep_compound',
    });
    expect(session.cards[1].question.primaryAnswer).toBe('woran');
    expect(session.cards[1].question.completedSentence).toBe(
      'Woran denkst du?',
    );
  });

  it("uses the compound row's sentence, not the pattern's", async () => {
    const warten = insertPattern('warten', 'auf');
    insertCompound(warten, 'da', 'Ich warte ____.');

    const { cards } = await service.getVerbPrepositionCompoundSession(20, 5);

    expect(cards[0].question.sentence).toBe('Ich warte ____.');
  });

  it("asks at most one question per pattern, so the second can't give the first away", async () => {
    const warten = insertPattern('warten', 'auf');
    const denken = insertPattern('denken', 'an');
    insertCompound(warten, 'da', 'Ich warte ____.');
    insertCompound(warten, 'wo', '____ wartest du?');
    insertCompound(denken, 'da', 'Ich denke ____.');
    insertCompound(denken, 'wo', '____ denkst du?');

    const { cards } = await service.getVerbPrepositionCompoundSession(20, 5);

    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.verb).sort()).toEqual(['denken', 'warten']);
  });

  it('does not serve a new question for a pattern that already has a due one', async () => {
    const warten = insertPattern('warten', 'auf');
    const wartenDa = insertCompound(warten, 'da', 'Ich warte ____.');
    insertCompound(warten, 'wo', '____ wartest du?');
    insertCard('verb_prep_compound', wartenDa);

    const session = await service.getVerbPrepositionCompoundSession(20, 5);

    expect(session.dueCount).toBe(1);
    expect(session.newCount).toBe(0);
  });

  it("offers the verb's other patterns as distractors", async () => {
    const freuenAuf = insertPattern('freuen', 'auf', { reflexive: true });
    insertPattern('freuen', 'über', { reflexive: true });
    insertCompound(
      freuenAuf,
      'da',
      'Der Urlaub kommt. Ich freue mich schon ____.',
    );

    const { cards } = await service.getVerbPrepositionCompoundSession(20, 5);

    expect(
      cards[0].question.buttons.find((b) => b.preposition === 'darüber')
        ?.enabled,
    ).toBe(true);
  });

  it('does not treat a pattern card as a compound card with the same id', async () => {
    const warten = insertPattern('warten', 'auf');
    const wartenDa = insertCompound(warten, 'da', 'Ich warte ____.');
    expect(wartenDa).toBe(warten); // both are id 1
    insertCard('verb_prep', warten);

    const session = await service.getVerbPrepositionCompoundSession(20, 5);

    expect(session.dueCount).toBe(0);
    expect(session.newCount).toBe(1);
  });

  it('tracks compound progress independently and leaves article stats unchanged', async () => {
    raw.exec(
      "INSERT INTO categories (id, name, display_name, display_order) VALUES (1, 'people', 'People', 1)",
    );
    const kind = Number(
      raw
        .prepare(
          "INSERT INTO nouns (german, article, plural, level, category_id) VALUES ('Kind', 'das', 'Kinder', 'A1', 1)",
        )
        .run().lastInsertRowid,
    );
    await service.createCardForWord('noun', kind);
    const articleStats = async () => ({
      user: await vocabularyService.getUserStats(),
      mastered: await statisticsService.getMasteredCount(),
      struggling: await statisticsService.getStrugglingWordsCount(),
    });
    const before = await articleStats();

    const warten = insertPattern('warten', 'auf');
    const wartenDa = insertCompound(warten, 'da', 'Ich warte ____.');
    const card = await service.createCardForWord(
      'verb_prep_compound',
      wartenDa,
    );
    for (let attempt = 0; attempt < 5; attempt++) {
      await service.recordReview(card, 0, 4000);
    }
    const mastered = await service.createCardForWord(
      'verb_prep_compound',
      insertCompound(warten, 'wo', '____ wartest du?'),
    );
    raw
      .prepare(
        "UPDATE card_progress SET interval = 30, next_review_date = date('now', '+30 days') WHERE id = ?",
      )
      .run(mastered);

    expect(await articleStats()).toEqual(before);
    expect(await service.hasReviewedToday()).toBe(true);
  });

  it('seeds a da and a wo question for every entry, and seeding is idempotent', async () => {
    await seedVocabulary(mockActiveDb as any);
    const first = count(
      'SELECT COUNT(*) AS count FROM verb_preposition_compounds',
    );
    expect(first).toBeGreaterThan(0);
    expect(first % 2).toBe(0);
    expect(
      count(
        'SELECT COUNT(*) AS count FROM (SELECT verb_preposition_id FROM verb_preposition_compounds GROUP BY verb_preposition_id HAVING COUNT(DISTINCT form) != 2)',
      ),
    ).toBe(0);

    await seedVocabulary(mockActiveDb as any);
    expect(
      count('SELECT COUNT(*) AS count FROM verb_preposition_compounds'),
    ).toBe(first);
  });

  it('builds a sound question from every seeded card', async () => {
    await seedVocabulary(mockActiveDb as any);
    const total = count(
      'SELECT COUNT(*) AS count FROM verb_preposition_compounds',
    );

    // Ask for everything: more cards than patterns, so size the session to fit
    const patterns = count(
      'SELECT COUNT(DISTINCT verb_preposition_id) AS count FROM verb_preposition_compounds',
    );
    const { cards } = await service.getVerbPrepositionCompoundSession(
      patterns * 2 + 10,
      patterns * 2,
    );

    // One question per pattern, none dropped as unaskable
    expect(cards).toHaveLength(patterns);
    expect(total).toBe(patterns * 2);
    for (const card of cards) {
      expect(card.question.primaryAnswer).toMatch(/^(da|wo)/);
      expect(card.question.completedSentence).not.toContain('____');
    }
  });
});
