import { generateImperfectQuestion } from '../verbImperfectService';

describe('generateImperfectQuestion()', () => {
  const verb = { infinitive: 'gehen', pastTense: 'ging', english: 'to go' };
  const pool = ['war', 'hatte', 'kam', 'machte', 'sagte', 'sah'];

  it('always includes the correct answer exactly once', () => {
    for (let i = 0; i < 50; i++) {
      const q = generateImperfectQuestion(verb, pool);
      expect(q.options.filter((o) => o === 'ging')).toHaveLength(1);
    }
  });

  it('returns up to 4 unique options drawn from the correct answer + distractor pool', () => {
    const q = generateImperfectQuestion(verb, pool);
    expect(q.options.length).toBeLessThanOrEqual(4);
    expect(new Set(q.options).size).toBe(q.options.length);
    for (const o of q.options) {
      expect(o === 'ging' || pool.includes(o)).toBe(true);
    }
  });

  it('carries through infinitive and english unchanged', () => {
    const q = generateImperfectQuestion(verb, pool);
    expect(q.infinitive).toBe('gehen');
    expect(q.correctAnswer).toBe('ging');
    expect(q.english).toBe('to go');
  });

  it('never picks the correct answer itself as a distractor, even if present in the pool', () => {
    const poolWithDuplicate = [...pool, 'ging', 'ging'];
    for (let i = 0; i < 50; i++) {
      const q = generateImperfectQuestion(verb, poolWithDuplicate);
      expect(q.options.filter((o) => o === 'ging')).toHaveLength(1);
    }
  });

  it('deduplicates repeated forms in the distractor pool', () => {
    const poolWithDuplicates = ['war', 'war', 'war', 'hatte', 'hatte'];
    const q = generateImperfectQuestion(verb, poolWithDuplicates);
    expect(new Set(q.options).size).toBe(q.options.length);
  });

  it('still returns a valid question when the pool has no usable distractors', () => {
    const q = generateImperfectQuestion(verb, []);
    expect(q.options).toEqual(['ging']);
  });

  it('caps at 3 distractors even with a large pool', () => {
    const bigPool = Array.from({ length: 20 }, (_, i) => `form${i}`);
    const q = generateImperfectQuestion(verb, bigPool);
    expect(q.options).toHaveLength(4);
  });
});
