import {
  DECLENSION_NOUNS,
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

  it('draws its noun from the curated regular-noun list', () => {
    const q = generateDeclensionQuestion(adjective);
    const nounInSentence = DECLENSION_NOUNS.some((n) =>
      q.after.includes(n.german),
    );
    expect(nounInSentence).toBe(true);
  });
});
