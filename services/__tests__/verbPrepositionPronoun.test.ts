/**
 * verbPrepositionPronoun.test.ts
 *
 * da(r)-/wo(r)- quiz (issue #151): compound spelling, the people rule,
 * question building, and the session built from stored patterns.
 *
 * The first blocks are pure. The last runs the real session queries against
 * an in-memory SQLite database built by the real migrations and seeds
 * (Node 22.5+ only, via node:sqlite; skipped on older Node).
 */

import { runMigrations } from '@/database/migrations';
import { seedVocabulary } from '@/database/seed';
import { describeWithSqlite, openTestDatabase } from '@/test-utils/sqlite';
import { SpacedRepetitionService } from '../spacedRepetitionService';
import {
  buildPeopleRule,
  buildPronounCompound,
  buildPronounQuestion,
  buildVerbPrepositionPronounCards,
  type VerbPrepositionPronounCardRow,
} from '../verbPrepositionPronounService';
import {
  PREPOSITION_GRID,
  isCorrectPreposition,
  needsCaseStep,
} from '../verbPrepositionService';

let mockActiveDb: unknown;

jest.mock('@/database/db', () => ({ getDatabase: () => mockActiveDb }));

const wartenPattern = {
  verb: 'warten',
  is_reflexive: 0,
  preposition: 'auf',
  case_governed: 'akk' as const,
  sentence: 'Ich warte schon lange ____.',
  translation: "I've been waiting for it for a long time.",
};

describe('buildPronounCompound', () => {
  it.each([
    ['da', 'auf', 'darauf'],
    ['da', 'an', 'daran'],
    ['da', 'aus', 'daraus'],
    ['da', 'in', 'darin'],
    ['da', 'über', 'darüber'],
    ['da', 'um', 'darum'],
    ['wo', 'auf', 'worauf'],
    ['wo', 'über', 'worüber'],
    ['wo', 'um', 'worum'],
  ] as const)(
    'inserts an r before a vowel: %s + %s -> %s',
    (format, preposition, expected) => {
      expect(buildPronounCompound(format, preposition)).toBe(expected);
    },
  );

  it.each([
    ['da', 'für', 'dafür'],
    ['da', 'mit', 'damit'],
    ['da', 'von', 'davon'],
    ['da', 'zu', 'dazu'],
    ['wo', 'bei', 'wobei'],
    ['wo', 'nach', 'wonach'],
    ['wo', 'vor', 'wovor'],
  ] as const)(
    'adds no r before a consonant: %s + %s -> %s',
    (format, preposition, expected) => {
      expect(buildPronounCompound(format, preposition)).toBe(expected);
    },
  );

  it('is defined for every button on the grid', () => {
    for (const preposition of PREPOSITION_GRID) {
      expect(buildPronounCompound('da', preposition)).toMatch(
        /^dar?[a-zäöü]+$/,
      );
      expect(buildPronounCompound('wo', preposition)).toMatch(
        /^wor?[a-zäöü]+$/,
      );
    }
  });
});

describe('buildPeopleRule', () => {
  it('gives the accusative pronoun and question', () => {
    expect(buildPeopleRule('auf', 'akk')).toEqual({
      withPronoun: 'auf ihn',
      question: 'Auf wen',
      thingForms: { da: 'darauf', wo: 'worauf' },
    });
  });

  it('gives the dative pronoun and question', () => {
    expect(buildPeopleRule('mit', 'dat')).toEqual({
      withPronoun: 'mit ihm',
      question: 'Mit wem',
      thingForms: { da: 'damit', wo: 'womit' },
    });
  });

  it('has no rule for the genitive', () => {
    expect(buildPeopleRule('wegen', 'gen')).toBeNull();
  });
});

describe('buildPronounQuestion', () => {
  it('asks the da(r)- form with the compounds on the grid', () => {
    const question = buildPronounQuestion(wartenPattern, 'da', {
      random: () => 0,
    })!;

    expect(question.primaryAnswer).toBe('darauf');
    expect(question.acceptedAnswers).toEqual(['darauf']);
    expect(question.completedSentence).toBe('Ich warte schon lange darauf.');
    expect(question.patternLabel).toBe('warten auf + Akk.');
    expect(question.buttons.map((button) => button.preposition)).toEqual(
      PREPOSITION_GRID.map((preposition) =>
        buildPronounCompound('da', preposition),
      ),
    );
    expect(
      question.buttons.find((b) => b.preposition === 'darauf')?.enabled,
    ).toBe(true);
  });

  it('asks the wo(r)- form and capitalises it at the start of the sentence', () => {
    const question = buildPronounQuestion(
      { ...wartenPattern, sentence: '____ wartest du?' },
      'wo',
    )!;

    expect(question.primaryAnswer).toBe('worauf');
    expect(question.completedSentence).toBe('Worauf wartest du?');
    expect(isCorrectPreposition(question, 'worauf')).toBe(true);
    expect(isCorrectPreposition(question, 'darauf')).toBe(false);
  });

  it('offers the English-trap and sibling confusions as compounds', () => {
    const question = buildPronounQuestion(wartenPattern, 'da', {
      siblingPrepositions: ['über'],
    })!;
    const enabled = question.buttons
      .filter((button) => button.enabled)
      .map((button) => button.preposition);

    expect(enabled).toContain('darüber');
    expect(enabled).toContain('dafür');
    expect(enabled.every((answer) => answer.startsWith('da'))).toBe(true);
  });

  it('carries the people rule for feedback', () => {
    const question = buildPronounQuestion(wartenPattern, 'da')!;
    expect(question.peopleRule?.withPronoun).toBe('auf ihn');
  });

  it('never asks the Akkusativ/Dativ step, even for a two-way preposition', () => {
    const question = buildPronounQuestion(wartenPattern, 'da')!;
    expect(needsCaseStep(question, 'darauf')).toBe(false);
  });

  it('returns null when the sentence has no blank', () => {
    expect(
      buildPronounQuestion({ ...wartenPattern, sentence: 'Ich warte.' }, 'da'),
    ).toBeNull();
  });

  it('returns null when the preposition has no button', () => {
    expect(
      buildPronounQuestion({ ...wartenPattern, preposition: 'wegen' }, 'da'),
    ).toBeNull();
  });
});

function pronounRow(
  overrides: Partial<VerbPrepositionPronounCardRow> = {},
): VerbPrepositionPronounCardRow {
  return {
    id: 0,
    word_type: 'verb_prep_pronoun',
    word_id: 1,
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review_date: '2026-10-28',
    total_reviews: 0,
    correct_reviews: 0,
    last_reviewed_at: null,
    created_at: '2026-10-28 00:00:00',
    verb: 'warten',
    is_reflexive: 0,
    preposition: 'auf',
    alt_prepositions: null,
    case_governed: 'akk',
    english_trap: null,
    remote_id: null,
    da_sentence: 'Ich warte schon lange ____.',
    da_translation: "I've been waiting for it for a long time.",
    wo_sentence: '____ wartest du?',
    wo_translation: 'What are you waiting for?',
    sibling_prepositions: null,
    ...overrides,
  };
}

describe('buildVerbPrepositionPronounCards', () => {
  it('uses the da(r)- sentence when the draw is low', () => {
    const [card] = buildVerbPrepositionPronounCards([pronounRow()], () => 0.1);

    expect(card.sentence).toBe('Ich warte schon lange ____.');
    expect(card.translation).toBe("I've been waiting for it for a long time.");
    expect(card.question.primaryAnswer).toBe('darauf');
  });

  it('uses the wo(r)- sentence when the draw is high', () => {
    const [card] = buildVerbPrepositionPronounCards([pronounRow()], () => 0.9);

    expect(card.sentence).toBe('____ wartest du?');
    expect(card.translation).toBe('What are you waiting for?');
    expect(card.question.primaryAnswer).toBe('worauf');
    expect(card.word_type).toBe('verb_prep_pronoun');
  });

  it('keeps the pronoun-only columns off the card', () => {
    const [card] = buildVerbPrepositionPronounCards([pronounRow()]);
    expect(card).not.toHaveProperty('da_sentence');
    expect(card).not.toHaveProperty('wo_sentence');
    expect(card).not.toHaveProperty('sibling_prepositions');
  });

  it('drops a row whose sentence has no blank', () => {
    const cards = buildVerbPrepositionPronounCards(
      [pronounRow({ da_sentence: 'Ich warte.' })],
      () => 0.1,
    );
    expect(cards).toHaveLength(0);
  });
});

describeWithSqlite(
  'verb preposition pronoun session against real SQLite',
  () => {
    let opened: ReturnType<typeof openTestDatabase>;
    const service = new SpacedRepetitionService();

    beforeEach(async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
      opened = openTestDatabase();
      mockActiveDb = opened.db;
      await runMigrations(opened.db as any);
      await seedVocabulary(opened.db as any);
    });

    afterEach(() => {
      opened.raw.close();
      jest.restoreAllMocks();
    });

    it('serves new da(r)-/wo(r)- cards from the seeded patterns', async () => {
      const session = await service.getVerbPrepositionPronounSession(20, 5);

      expect(session.dueCount).toBe(0);
      expect(session.newCount).toBe(5);
      for (const card of session.cards) {
        expect(card.word_type).toBe('verb_prep_pronoun');
        expect(card.id).toBe(0);
        expect(card.question.primaryAnswer).toMatch(/^(da|wo)r?[a-zäöü]+$/);
        expect(card.question.patternLabel).toContain(card.preposition);
      }
    });

    it('keeps progress separate from the cloze preposition card', async () => {
      const first = (await service.getVerbPrepositionPronounSession(20, 1))
        .cards[0];

      const pronounCardId = await service.createCardForWord(
        first.word_type,
        first.word_id,
      );
      await service.recordReview(pronounCardId, 5, 1000);

      const types = opened.raw
        .prepare('SELECT word_type FROM card_progress')
        .all() as { word_type: string }[];
      expect(types).toEqual([{ word_type: 'verb_prep_pronoun' }]);

      const patternSession = await service.getVerbPrepositionSession(20, 5);
      expect(patternSession.dueCount).toBe(0);
    });

    it('serves a reviewed card as due once its date arrives', async () => {
      const first = (await service.getVerbPrepositionPronounSession(20, 1))
        .cards[0];
      const cardId = await service.createCardForWord(
        first.word_type,
        first.word_id,
      );
      opened.raw
        .prepare(
          "UPDATE card_progress SET next_review_date = date('now', '-1 day') WHERE id = ?",
        )
        .run(cardId);

      const session = await service.getVerbPrepositionPronounSession(20, 5);
      expect(session.dueCount).toBe(1);
      expect(session.cards[0].word_id).toBe(first.word_id);
      expect(session.cards[0].id).toBe(cardId);
    });
  },
);
