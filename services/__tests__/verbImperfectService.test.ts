import {
  conjugatePraeteritum,
  generateImperfectQuestion,
} from '../verbImperfectService';

describe('conjugatePraeteritum()', () => {
  it('"ich" and "er" always take the bare stem unchanged', () => {
    expect(conjugatePraeteritum('ging', 'ich')).toBe('ging');
    expect(conjugatePraeteritum('ging', 'er')).toBe('ging');
    expect(conjugatePraeteritum('war', 'ich')).toBe('war');
    expect(conjugatePraeteritum('machte', 'ich')).toBe('machte');
  });

  it('"wir"/"sie" add "-en" to a strong-verb stem', () => {
    expect(conjugatePraeteritum('ging', 'wir')).toBe('gingen');
    expect(conjugatePraeteritum('ging', 'sie')).toBe('gingen');
    expect(conjugatePraeteritum('war', 'wir')).toBe('waren');
    expect(conjugatePraeteritum('kam', 'wir')).toBe('kamen');
    expect(conjugatePraeteritum('fand', 'wir')).toBe('fanden');
    expect(conjugatePraeteritum('stand', 'wir')).toBe('standen');
    expect(conjugatePraeteritum('saß', 'wir')).toBe('saßen');
    expect(conjugatePraeteritum('schloss', 'wir')).toBe('schlossen');
  });

  it('"wir"/"sie" add only "-n" to a weak/mixed-verb stem already ending in "e"', () => {
    expect(conjugatePraeteritum('machte', 'wir')).toBe('machten');
    expect(conjugatePraeteritum('hatte', 'wir')).toBe('hatten');
    expect(conjugatePraeteritum('konnte', 'sie')).toBe('konnten');
    expect(conjugatePraeteritum('wusste', 'wir')).toBe('wussten');
  });

  it('attaches the ending to the stem and re-appends the separable prefix after it', () => {
    expect(conjugatePraeteritum('stand auf', 'ich')).toBe('stand auf');
    expect(conjugatePraeteritum('stand auf', 'er')).toBe('stand auf');
    expect(conjugatePraeteritum('stand auf', 'wir')).toBe('standen auf');
    expect(conjugatePraeteritum('kaufte ein', 'wir')).toBe('kauften ein');
    expect(conjugatePraeteritum('kam an', 'sie')).toBe('kamen an');
    expect(conjugatePraeteritum('rief an', 'wir')).toBe('riefen an');
  });
});

describe('generateImperfectQuestion()', () => {
  const verb = { infinitive: 'gehen', pastTense: 'ging', english: 'to go' };
  const pool = ['war', 'hatte', 'kam', 'machte', 'sagte', 'sah'];

  it('always includes the correct answer exactly once', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateImperfectQuestion(verb, pool);
      expect(q.options.filter((o) => o === q.correctAnswer)).toHaveLength(1);
    }
  });

  it('only ever picks one of the four supported pronouns', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateImperfectQuestion(verb, pool);
      expect(['ich', 'er', 'wir', 'sie']).toContain(q.pronoun);
    }
  });

  it('correctAnswer matches conjugating pastTense for the chosen pronoun', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateImperfectQuestion(verb, pool);
      expect(q.correctAnswer).toBe(
        conjugatePraeteritum(verb.pastTense, q.pronoun),
      );
    }
  });

  it('distractor options are conjugated for the same pronoun as the correct answer, not the bare stem', () => {
    // Force a "wir" question by using a single-pronoun pool big enough to
    // reliably see it within a handful of tries isn't guaranteed, so
    // instead assert the invariant directly against conjugatePraeteritum
    // for whichever pronoun was actually picked.
    for (let i = 0; i < 50; i++) {
      const q = generateImperfectQuestion(verb, pool);
      const expectedDistractorForms = pool.map((p) =>
        conjugatePraeteritum(p, q.pronoun),
      );
      for (const option of q.options) {
        if (option === q.correctAnswer) continue;
        expect(expectedDistractorForms).toContain(option);
      }
    }
  });

  it('returns up to 4 unique options', () => {
    const q = generateImperfectQuestion(verb, pool);
    expect(q.options.length).toBeLessThanOrEqual(4);
    expect(new Set(q.options).size).toBe(q.options.length);
  });

  it('carries through infinitive and english unchanged', () => {
    const q = generateImperfectQuestion(verb, pool);
    expect(q.infinitive).toBe('gehen');
    expect(q.english).toBe('to go');
  });

  it('still returns a valid question when the pool has no usable distractors', () => {
    const q = generateImperfectQuestion(verb, []);
    expect(q.options).toEqual([q.correctAnswer]);
  });

  it('caps at 3 distractors even with a large pool', () => {
    const bigPool = Array.from({ length: 20 }, (_, i) => `form${i}`);
    const q = generateImperfectQuestion(verb, bigPool);
    expect(q.options).toHaveLength(4);
  });
});
