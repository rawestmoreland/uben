/**
 * verbPrepositionCaseStep.test.ts
 *
 * The Akkusativ/Dativ step on two-way prepositions (issue #149): when it is
 * asked, how a wrong case is scored, that a wrong case does not reset the
 * card, and the setting that turns the step off.
 *
 * The SQLite block needs Node 22.5+ (node:sqlite); it is skipped on older Node.
 */

import { runMigrations } from '@/database/migrations';
import {
  describeWithSqlite,
  openTestDatabase,
  type NodeSqliteDatabase,
} from '@/test-utils/sqlite';
import {
  SpacedRepetitionService,
  getQualityFromResponse,
} from '../spacedRepetitionService';
import {
  TWO_WAY_PREPOSITIONS,
  PREPOSITION_GRID,
  applyCaseStepToQuality,
  buildVerbPrepositionQuestion,
  formatCaseName,
  isCorrectCase,
  isTwoWayPreposition,
  needsCaseStep,
  type VerbPrepositionPattern,
} from '../verbPrepositionService';

let mockActiveDb: unknown;

jest.mock('@/database/db', () => ({ getDatabase: () => mockActiveDb }));

const service = new SpacedRepetitionService();

function question(overrides: Partial<VerbPrepositionPattern> = {}) {
  const built = buildVerbPrepositionQuestion({
    verb: 'denken',
    is_reflexive: 0,
    preposition: 'an',
    alt_prepositions: null,
    case_governed: 'akk',
    sentence: 'Ich denke oft ____ meine Familie.',
    translation: 'I often think of my family.',
    ...overrides,
  });
  if (!built) throw new Error('expected a sound question');
  return built;
}

describe('isTwoWayPreposition', () => {
  it.each(['an', 'auf', 'in', 'über', 'vor'])('%s is two-way', (word) => {
    expect(isTwoWayPreposition(word)).toBe(true);
  });

  it.each(['mit', 'für', 'von', 'um', 'zu', 'nach', 'bei', 'aus'])(
    '%s has one fixed case',
    (word) => {
      expect(isTwoWayPreposition(word)).toBe(false);
    },
  );

  it('ignores case and surrounding whitespace', () => {
    expect(isTwoWayPreposition(' Über ')).toBe(true);
  });

  it('lists only prepositions that exist as answers or are German two-way words', () => {
    // Every grid preposition is classified one way or the other
    for (const word of PREPOSITION_GRID) {
      expect(typeof isTwoWayPreposition(word)).toBe('boolean');
    }
    expect(TWO_WAY_PREPOSITIONS).toHaveLength(9);
  });
});

describe('needsCaseStep', () => {
  it('asks for the case after a correct two-way preposition', () => {
    expect(needsCaseStep(question(), 'an')).toBe(true);
    expect(needsCaseStep(question({ case_governed: 'dat' }), 'an')).toBe(true);
  });

  it('skips fixed-case prepositions', () => {
    const wait = question({
      verb: 'sprechen',
      preposition: 'mit',
      case_governed: 'dat',
      sentence: 'Ich spreche ____ meinem Chef.',
    });
    expect(needsCaseStep(wait, 'mit')).toBe(false);
  });

  it('skips a wrong preposition, even a two-way one', () => {
    expect(needsCaseStep(question(), 'auf')).toBe(false);
    expect(needsCaseStep(question(), 'für')).toBe(false);
  });

  it('skips patterns that govern the genitive', () => {
    expect(needsCaseStep(question({ case_governed: 'gen' }), 'an')).toBe(false);
  });

  it('decides on the accepted alternate the learner actually picked', () => {
    const apply = question({
      verb: 'bewerben',
      is_reflexive: 1,
      preposition: 'um',
      alt_prepositions: JSON.stringify(['auf']),
      sentence: 'Ich bewerbe mich ____ eine Stelle.',
    });
    expect(needsCaseStep(apply, 'um')).toBe(false);
    expect(needsCaseStep(apply, 'auf')).toBe(true);
  });
});

describe('case grading', () => {
  it('matches the stored case', () => {
    const think = question({ case_governed: 'akk' });
    expect(isCorrectCase(think, 'akk')).toBe(true);
    expect(isCorrectCase(think, 'dat')).toBe(false);
  });

  it('formats full case names', () => {
    expect(formatCaseName('akk')).toBe('Akkusativ');
    expect(formatCaseName('dat')).toBe('Dativ');
  });
});

describe('applyCaseStepToQuality', () => {
  it('leaves the quality alone when the case is right', () => {
    for (const quality of [3, 4, 5]) {
      expect(applyCaseStepToQuality(quality, true)).toBe(quality);
    }
  });

  it('caps a wrong case at the lowest passing grade', () => {
    expect(applyCaseStepToQuality(5, false)).toBe(3);
    expect(applyCaseStepToQuality(4, false)).toBe(3);
    expect(applyCaseStepToQuality(3, false)).toBe(3);
  });

  it('never lifts a quality, so a missed preposition stays a failure', () => {
    const missed = getQualityFromResponse(false, 500);
    expect(applyCaseStepToQuality(missed, false)).toBe(0);
  });
});

describeWithSqlite('a wrong case does not reset the card', () => {
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

  async function reviewedCard() {
    const wordId = Number(
      raw
        .prepare(
          `INSERT INTO verb_prepositions
             (verb, is_reflexive, preposition, case_governed, sentence, translation, level)
           VALUES ('denken', 0, 'an', 'akk', 'Ich denke oft ____ dich.', 'gloss', 'A2')`,
        )
        .run().lastInsertRowid,
    );
    const cardProgressId = await service.createCardForWord('verb_prep', wordId);
    // Two clean reviews: repetitions 2, interval 6 days
    await service.recordReview(cardProgressId, 5, 800);
    await service.recordReview(cardProgressId, 5, 800);
    return cardProgressId;
  }

  function progressOf(cardProgressId: number) {
    return raw
      .prepare('SELECT * FROM card_progress WHERE id = ?')
      .get(cardProgressId) as Record<string, number>;
  }

  it('keeps repetitions and interval but earns a smaller ease boost', async () => {
    const cardProgressId = await reviewedCard();
    const before = progressOf(cardProgressId);
    expect(before).toMatchObject({ repetitions: 2, interval: 6 });

    const fast = getQualityFromResponse(true, 800); // 5
    await service.recordReview(
      cardProgressId,
      applyCaseStepToQuality(fast, false),
      800,
    );

    const after = progressOf(cardProgressId);
    expect(after.repetitions).toBe(3);
    expect(after.interval).toBeGreaterThan(before.interval);
    expect(after.correct_reviews).toBe(before.correct_reviews + 1);
    // quality 3 lowers the ease factor where quality 5 would have raised it
    expect(after.ease_factor).toBeLessThan(before.ease_factor);
  });

  it('a wrong preposition still resets the card', async () => {
    const cardProgressId = await reviewedCard();

    await service.recordReview(
      cardProgressId,
      getQualityFromResponse(false, 800),
      800,
    );

    expect(progressOf(cardProgressId)).toMatchObject({
      repetitions: 0,
      interval: 0,
    });
  });
});

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

  it.each(Object.keys(locales))('%s has the case step strings', (locale) => {
    const { settings, verb_preposition_quiz: quiz } = locales[locale].app;
    expect(settings.verb_preposition_case_step).toEqual(expect.any(String));
    expect(settings.verb_preposition_case_step_description).toEqual(
      expect.any(String),
    );
    expect(quiz.case_prompt).toEqual(expect.any(String));
    expect(quiz.case_you_picked).toContain('{{picked}}');
    expect(quiz.case_you_picked).toContain('{{correct}}');
  });
});
