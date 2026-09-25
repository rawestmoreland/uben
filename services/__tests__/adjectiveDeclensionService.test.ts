import {
  DECLENSION_NOUNS,
  MASS_NOUNS,
  generateDeclensionQuestion,
  getAdjectiveEnding,
  getEndingOptions,
} from '../adjectiveDeclensionService';

describe('getAdjectiveEnding()', () => {
  // Reference forms taken from standard German adjective declension tables.
  it('weak declension (der-words) matches known forms', () => {
    expect(getAdjectiveEnding('weak', 'nominative', 'masculine')).toBe('e'); // der kleine Mann
    expect(getAdjectiveEnding('weak', 'nominative', 'feminine')).toBe('e'); // die kleine Frau
    expect(getAdjectiveEnding('weak', 'nominative', 'neuter')).toBe('e'); // das kleine Kind
    expect(getAdjectiveEnding('weak', 'accusative', 'masculine')).toBe('en'); // den kleinen Mann
    expect(getAdjectiveEnding('weak', 'accusative', 'feminine')).toBe('e'); // die kleine Frau
    expect(getAdjectiveEnding('weak', 'accusative', 'neuter')).toBe('e'); // das kleine Kind
  });

  it('mixed declension (ein-words) matches known forms', () => {
    expect(getAdjectiveEnding('mixed', 'nominative', 'masculine')).toBe('er'); // ein kleiner Mann
    expect(getAdjectiveEnding('mixed', 'nominative', 'feminine')).toBe('e'); // eine kleine Frau
    expect(getAdjectiveEnding('mixed', 'nominative', 'neuter')).toBe('es'); // ein kleines Kind
    expect(getAdjectiveEnding('mixed', 'accusative', 'masculine')).toBe('en'); // einen kleinen Mann
    expect(getAdjectiveEnding('mixed', 'accusative', 'feminine')).toBe('e'); // eine kleine Frau
    expect(getAdjectiveEnding('mixed', 'accusative', 'neuter')).toBe('es'); // ein kleines Kind
  });

  it('strong declension (no article) matches known forms', () => {
    expect(getAdjectiveEnding('strong', 'nominative', 'masculine')).toBe('er'); // kalter Kaffee
    expect(getAdjectiveEnding('strong', 'nominative', 'feminine')).toBe('e'); // frische Milch
    expect(getAdjectiveEnding('strong', 'nominative', 'neuter')).toBe('es'); // kaltes Wasser
    expect(getAdjectiveEnding('strong', 'accusative', 'masculine')).toBe('en'); // kalten Kaffee (ich trinke)
    expect(getAdjectiveEnding('strong', 'accusative', 'feminine')).toBe('e'); // frische Milch
    expect(getAdjectiveEnding('strong', 'accusative', 'neuter')).toBe('es'); // kaltes Wasser
  });

  it('dative and genitive plural both collapse to -en/-er per the strong table', () => {
    expect(getAdjectiveEnding('strong', 'dative', 'plural')).toBe('en');
    expect(getAdjectiveEnding('strong', 'genitive', 'plural')).toBe('er');
  });
});

describe('getEndingOptions()', () => {
  it('always includes the correct ending exactly once', () => {
    for (let i = 0; i < 50; i++) {
      const options = getEndingOptions('en');
      expect(options.filter((o) => o === 'en')).toHaveLength(1);
    }
  });

  it('returns 4 unique options drawn from the 5 possible endings', () => {
    const options = getEndingOptions('e');
    expect(options).toHaveLength(4);
    expect(new Set(options).size).toBe(4);
    for (const o of options) {
      expect(['e', 'en', 'er', 'es', 'em']).toContain(o);
    }
  });
});

describe('generateDeclensionQuestion()', () => {
  const adjective = { german: 'klein', english: 'small' };

  it('produces a correct answer that is one of the offered options', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateDeclensionQuestion(adjective);
      expect(q.options).toContain(q.correctAnswer);
    }
  });

  it('only ever produces nominative or accusative questions', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateDeclensionQuestion(adjective);
      expect(['nominative', 'accusative']).toContain(q.germanCase);
    }
  });

  it('never pairs a nominative sentence with strong declension (avoids a bare capitalization edge case)', () => {
    for (let i = 0; i < 100; i++) {
      const q = generateDeclensionQuestion(adjective);
      if (q.germanCase === 'nominative') {
        expect(q.declensionType).not.toBe('strong');
      }
    }
  });

  it('builds a correctAnswer that starts with the adjective base', () => {
    const q = generateDeclensionQuestion(adjective);
    expect(q.correctAnswer.startsWith('klein')).toBe(true);
  });

  it('never leaves the sentence with an unresolved blank token', () => {
    const q = generateDeclensionQuestion(adjective);
    expect(q.before).not.toContain('\u0000');
    expect(q.after).not.toContain('\u0000');
  });

  it('draws its noun from the curated noun lists (regular nouns or, for strong declension, mass nouns)', () => {
    // 'klein' is tagged for drink contexts, so this may land on either pool.
    const q = generateDeclensionQuestion(adjective);
    const nounInSentence = [...DECLENSION_NOUNS, ...MASS_NOUNS].some((n) =>
      q.after.includes(n.german),
    );
    expect(nounInSentence).toBe(true);
  });

  it('never leaves a countable noun without a determiner (no bare "Ich sehe Straße" style sentences)', () => {
    // Regression test: strong declension (no article at all) must never be
    // combined with a countable noun from DECLENSION_NOUNS — only with a
    // bare mass noun from MASS_NOUNS ("Ich trinke kalten Kaffee").
    for (let i = 0; i < 100; i++) {
      const q = generateDeclensionQuestion(adjective);
      if (q.declensionType !== 'strong') continue;

      const pairedWithCountableNoun = DECLENSION_NOUNS.some((n) =>
        q.after.includes(n.german),
      );
      expect(pairedWithCountableNoun).toBe(false);

      const pairedWithMassNoun = MASS_NOUNS.some((n) => q.after.includes(n.german));
      expect(pairedWithMassNoun).toBe(true);
    }
  });

  it('only pairs emotion/health adjectives with animate nouns (never "sad street")', () => {
    const emotionAdjective = { german: 'traurig', english: 'sad' };
    const inanimateNouns = DECLENSION_NOUNS.filter((n) => !n.animate).map(
      (n) => n.german,
    );

    for (let i = 0; i < 100; i++) {
      const q = generateDeclensionQuestion(emotionAdjective);
      for (const noun of inanimateNouns) {
        expect(q.after.includes(noun)).toBe(false);
      }
      // Never offered strong declension either, since 'traurig' has no
      // 'drink' context and there's nothing else strong declension could
      // grammatically pair it with.
      expect(q.declensionType).not.toBe('strong');
    }
  });

  it('never offers strong declension for an adjective without a drink context', () => {
    const objectOnlyAdjective = { german: 'schwierig', english: 'difficult' };
    for (let i = 0; i < 100; i++) {
      const q = generateDeclensionQuestion(objectOnlyAdjective);
      expect(q.declensionType).not.toBe('strong');
    }
  });

  it('never pairs an object-only adjective with an animate noun (never "cheap man")', () => {
    const objectOnlyAdjective = { german: 'billig', english: 'cheap' };
    const animateNouns = DECLENSION_NOUNS.filter((n) => n.animate).map(
      (n) => n.german,
    );

    for (let i = 0; i < 100; i++) {
      const q = generateDeclensionQuestion(objectOnlyAdjective);
      for (const noun of animateNouns) {
        expect(q.after.includes(noun)).toBe(false);
      }
    }
  });

  it('elides the trailing "e" on adjectives like "leise"/"müde" instead of doubling it', () => {
    // Regression test: "leise" + "-e" ending must produce "leise", not
    // "leisee"; "müde" + "-er" must produce "müder", not "müdeer".
    for (const base of ['leise', 'müde']) {
      for (let i = 0; i < 50; i++) {
        const q = generateDeclensionQuestion({ german: base, english: 'x' });
        expect(q.correctAnswer).not.toMatch(/ee/);
        for (const option of q.options) {
          expect(option).not.toMatch(/ee/);
        }
      }
    }
  });

  it('never uses "kaufen" (buy) with an animate noun', () => {
    const animateOnlyAdjective = { german: 'traurig', english: 'sad' };
    for (let i = 0; i < 100; i++) {
      const q = generateDeclensionQuestion(animateOnlyAdjective);
      expect(q.before + ' ' + q.after).not.toMatch(/kaufen/i);
    }
  });

  it('does offer strong declension for a drink-compatible adjective, always with a mass noun', () => {
    const drinkAdjective = { german: 'kalt', english: 'cold' };
    let sawStrong = false;
    for (let i = 0; i < 100; i++) {
      const q = generateDeclensionQuestion(drinkAdjective);
      if (q.declensionType === 'strong') {
        sawStrong = true;
        expect(MASS_NOUNS.some((n) => q.after.includes(n.german))).toBe(true);
      }
    }
    expect(sawStrong).toBe(true);
  });
});
