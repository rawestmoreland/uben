import {
  OPTIONS_PER_QUESTION,
  PREPOSITION_GRID,
  buildVerbPrepositionCards,
  buildVerbPrepositionQuestion,
  formatCaseLabel,
  formatPatternLabel,
  isCorrectPreposition,
  parsePrepositionList,
  splitSentenceAtBlank,
  type VerbPrepositionCardRow,
  type VerbPrepositionPattern,
} from '../verbPrepositionService';

function pattern(
  overrides: Partial<VerbPrepositionPattern> = {},
): VerbPrepositionPattern {
  return {
    verb: 'warten',
    is_reflexive: 0,
    preposition: 'auf',
    alt_prepositions: null,
    case_governed: 'akk',
    sentence: 'Ich warte ____ meine Frau.',
    translation: "I'm waiting for my wife.",
    english_trap: null,
    ...overrides,
  };
}

function offered(
  question: NonNullable<ReturnType<typeof buildVerbPrepositionQuestion>>,
) {
  return question.buttons
    .filter((button) => button.enabled)
    .map((button) => button.preposition);
}

/** Deterministic pseudo-random source so fill picks are reproducible. */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('formatCaseLabel()', () => {
  it('formats each governed case in textbook notation', () => {
    expect(formatCaseLabel('akk')).toBe('+ Akk.');
    expect(formatCaseLabel('dat')).toBe('+ Dat.');
    expect(formatCaseLabel('gen')).toBe('+ Gen.');
  });
});

describe('formatPatternLabel()', () => {
  it('shows verb, preposition and case', () => {
    expect(formatPatternLabel(pattern())).toBe('warten auf + Akk.');
  });

  it('prefixes reflexive verbs with sich', () => {
    expect(
      formatPatternLabel(
        pattern({ verb: 'freuen', is_reflexive: 1, preposition: 'über' }),
      ),
    ).toBe('sich freuen über + Akk.');
  });
});

describe('parsePrepositionList()', () => {
  it('parses a JSON array and normalizes case', () => {
    expect(parsePrepositionList('["Für", " um "]')).toEqual(['für', 'um']);
  });

  it.each([null, undefined, '', 'not json', '{"a":1}', '"auf"'])(
    'returns an empty list for %p',
    (raw) => {
      expect(parsePrepositionList(raw)).toEqual([]);
    },
  );

  it('ignores non-string entries', () => {
    expect(parsePrepositionList('["auf", 3, null]')).toEqual(['auf']);
  });
});

describe('splitSentenceAtBlank()', () => {
  it('splits the sentence around the blank', () => {
    expect(splitSentenceAtBlank('Ich warte ____ meine Frau.')).toEqual({
      before: 'Ich warte ',
      after: ' meine Frau.',
    });
  });

  it('handles a blank at the start of the sentence', () => {
    expect(splitSentenceAtBlank('____ wen wartest du?')).toEqual({
      before: '',
      after: ' wen wartest du?',
    });
  });

  it('returns null when there is no blank', () => {
    expect(splitSentenceAtBlank('Ich warte auf meine Frau.')).toBeNull();
  });

  it('lines up with the completed sentence so the filled word can be located', () => {
    const question = buildVerbPrepositionQuestion(
      pattern({ sentence: '____ wen wartest du?' }),
    )!;
    const { before, after } = splitSentenceAtBlank(question.sentence)!;
    expect(
      question.completedSentence.slice(
        before.length,
        question.completedSentence.length - after.length,
      ),
    ).toBe('Auf');
  });
});

describe('buildVerbPrepositionQuestion()', () => {
  it('carries the sentence, translation, case and completed sentence', () => {
    const question = buildVerbPrepositionQuestion(pattern())!;

    expect(question).toMatchObject({
      sentence: 'Ich warte ____ meine Frau.',
      translation: "I'm waiting for my wife.",
      primaryAnswer: 'auf',
      acceptedAnswers: ['auf'],
      caseGoverned: 'akk',
      caseLabel: '+ Akk.',
      patternLabel: 'warten auf + Akk.',
      completedSentence: 'Ich warte auf meine Frau.',
      englishTrap: null,
    });
  });

  it('capitalizes the preposition when the blank opens the sentence', () => {
    const question = buildVerbPrepositionQuestion(
      pattern({ sentence: '____ wen wartest du?' }),
    )!;

    expect(question.completedSentence).toBe('Auf wen wartest du?');
  });

  it('passes the English trap through, treating blank notes as none', () => {
    expect(
      buildVerbPrepositionQuestion(
        pattern({ english_trap: 'English "wait for" pulls toward für.' }),
      )!.englishTrap,
    ).toBe('English "wait for" pulls toward für.');
    expect(
      buildVerbPrepositionQuestion(pattern({ english_trap: '  ' }))!
        .englishTrap,
    ).toBeNull();
  });

  it('excludes patterns it cannot ask reliably', () => {
    expect(
      buildVerbPrepositionQuestion(pattern({ sentence: 'Ich warte.' })),
    ).toBeNull();
    expect(
      buildVerbPrepositionQuestion(pattern({ preposition: 'gegen' })),
    ).toBeNull();
  });

  describe('button grid', () => {
    it('lists the whole grid in the same fixed order for every question', () => {
      const patterns = [
        pattern(),
        pattern({ verb: 'denken', preposition: 'an' }),
        pattern({ verb: 'träumen', preposition: 'von' }),
        pattern({ verb: 'bestehen', preposition: 'aus' }),
      ];

      for (const stored of patterns) {
        const question = buildVerbPrepositionQuestion(stored)!;
        expect(question.buttons.map((button) => button.preposition)).toEqual([
          ...PREPOSITION_GRID,
        ]);
      }
    });

    it('keeps the grid order however the random source falls', () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const question = buildVerbPrepositionQuestion(pattern(), {
          random: seededRandom(seed),
        })!;
        expect(question.buttons.map((button) => button.preposition)).toEqual([
          ...PREPOSITION_GRID,
        ]);
      }
    });

    it('enables the correct answer plus distractors up to the option count', () => {
      const question = buildVerbPrepositionQuestion(pattern())!;

      expect(offered(question)).toHaveLength(OPTIONS_PER_QUESTION);
      expect(offered(question)).toContain('auf');
    });
  });

  describe('distractors', () => {
    it('pulls the commonly confused preposition in (warten auf -> für)', () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const question = buildVerbPrepositionQuestion(pattern(), {
          random: seededRandom(seed),
        })!;
        expect(offered(question)).toContain('für');
      }
    });

    it('offers sibling patterns of the same verb', () => {
      const question = buildVerbPrepositionQuestion(
        pattern({
          verb: 'sprechen',
          preposition: 'über',
          sentence: 'Wir sprechen ____ das Wetter.',
        }),
        { siblingPrepositions: ['mit', 'von'] },
      )!;

      expect(offered(question)).toEqual(
        expect.arrayContaining(['über', 'mit', 'von']),
      );
    });

    it('skips siblings that are the answer itself or have no button', () => {
      const question = buildVerbPrepositionQuestion(pattern(), {
        siblingPrepositions: ['auf', 'gegen', 'für'],
      })!;

      expect(offered(question)).toHaveLength(OPTIONS_PER_QUESTION);
      expect(offered(question)).not.toContain('gegen');
    });

    it('never offers an alternate as a distractor, from any source', () => {
      // 'für' is both a pattern-specific trap and an accepted alternate here,
      // and 'um' is a sibling: neither may be offered as a wrong answer.
      const alternate = pattern({ alt_prepositions: '["für","um"]' });

      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const question = buildVerbPrepositionQuestion(alternate, {
          siblingPrepositions: ['um', 'an'],
          random: seededRandom(seed),
        })!;
        const distractors = offered(question).filter(
          (preposition) => !question.acceptedAnswers.includes(preposition),
        );

        expect(question.acceptedAnswers).toEqual(['auf', 'für', 'um']);
        // Alternates are tappable correct answers, not wrong options
        expect(offered(question)).toEqual(
          expect.arrayContaining(['auf', 'für', 'um']),
        );
        expect(offered(question)).toHaveLength(OPTIONS_PER_QUESTION);
        expect(distractors).toHaveLength(OPTIONS_PER_QUESTION - 3);
      }
    });

    it('does not count a sibling that is also an alternate as a distractor', () => {
      const question = buildVerbPrepositionQuestion(
        pattern({ alt_prepositions: '["über"]' }),
        { siblingPrepositions: ['über'] },
      )!;

      const wrongOffers = offered(question).filter(
        (preposition) => !question.acceptedAnswers.includes(preposition),
      );
      expect(question.acceptedAnswers).toEqual(['auf', 'über']);
      expect(offered(question)).toHaveLength(OPTIONS_PER_QUESTION);
      expect(wrongOffers).toHaveLength(OPTIONS_PER_QUESTION - 2);
    });
  });
});

describe('isCorrectPreposition()', () => {
  it('accepts the primary preposition', () => {
    const question = buildVerbPrepositionQuestion(pattern())!;

    expect(isCorrectPreposition(question, 'auf')).toBe(true);
    expect(isCorrectPreposition(question, 'für')).toBe(false);
  });

  it('accepts every alternate as correct', () => {
    const question = buildVerbPrepositionQuestion(
      pattern({ alt_prepositions: '["für"]' }),
    )!;

    expect(isCorrectPreposition(question, 'auf')).toBe(true);
    expect(isCorrectPreposition(question, 'für')).toBe(true);
    expect(isCorrectPreposition(question, 'an')).toBe(false);
  });

  it('is insensitive to case and whitespace', () => {
    const question = buildVerbPrepositionQuestion(pattern())!;

    expect(isCorrectPreposition(question, ' Auf ')).toBe(true);
  });
});

describe('buildVerbPrepositionCards()', () => {
  function row(
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
      remote_id: null,
      sibling_prepositions: null,
      ...pattern(),
      ...overrides,
    };
  }

  it('attaches a question and drops patterns that cannot be asked', () => {
    const cards = buildVerbPrepositionCards([
      row({ word_id: 1 }),
      row({ word_id: 2, sentence: 'No blank here.' }),
      row({ word_id: 3, preposition: 'gegen' }),
    ]);

    expect(cards.map((card) => card.word_id)).toEqual([1]);
    expect(cards[0].question.primaryAnswer).toBe('auf');
  });

  it('feeds sibling prepositions into distractor selection', () => {
    const [card] = buildVerbPrepositionCards([
      row({
        verb: 'sprechen',
        preposition: 'über',
        sentence: 'Wir sprechen ____ das Wetter.',
        sibling_prepositions: '["mit","von"]',
      }),
    ]);

    expect(offered(card.question)).toEqual(
      expect.arrayContaining(['mit', 'von']),
    );
  });

  it('does not leak the raw sibling column onto the card', () => {
    const [card] = buildVerbPrepositionCards([row()]);

    expect(card).not.toHaveProperty('sibling_prepositions');
  });
});
