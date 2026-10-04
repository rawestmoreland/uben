import {
  generateImperfectQuestion,
  type VerbImperfectForms,
} from '../verbImperfectService';

const gehenForms: VerbImperfectForms = {
  ich: 'ging',
  du: 'gingst',
  er: 'ging',
  wir: 'gingen',
  ihr: 'gingt',
  sie: 'gingen',
};

describe('generateImperfectQuestion()', () => {
  const verb = { infinitive: 'gehen', forms: gehenForms, english: 'to go' };

  it('only ever picks one of the six supported pronouns', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateImperfectQuestion(verb);
      expect(['ich', 'du', 'er', 'wir', 'ihr', 'sie']).toContain(q.pronoun);
    }
  });

  it('correctAnswer is the stored form for the chosen pronoun', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateImperfectQuestion(verb);
      expect(q.correctAnswer).toBe(gehenForms[q.pronoun]);
    }
  });

  it('eventually covers every pronoun across enough draws', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(generateImperfectQuestion(verb).pronoun);
    }
    expect(seen).toEqual(new Set(['ich', 'du', 'er', 'wir', 'ihr', 'sie']));
  });

  it('carries through infinitive and english unchanged', () => {
    const q = generateImperfectQuestion(verb);
    expect(q.infinitive).toBe('gehen');
    expect(q.english).toBe('to go');
  });

  it('passes through a null english hint', () => {
    const q = generateImperfectQuestion({ ...verb, english: null });
    expect(q.english).toBeNull();
  });
});
