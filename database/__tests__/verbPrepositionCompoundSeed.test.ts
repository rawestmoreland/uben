/**
 * verbPrepositionCompoundSeed.test.ts
 *
 * da(r)-/wo(r)- quiz (issue #151): validates the authored compound seed
 * data against the pattern seed it attaches to. The "exactly one correct
 * button" rule can't be checked by a machine, but everything that can go
 * wrong mechanically is checked here.
 */

import { verbPrepositionCompoundsV1 } from '@/database/seeds/verb-prepositions/v2-compounds';
import { verbPrepositionsV2 } from '@/database/seeds/verb-prepositions/v2-core';
import { toCompound } from '@/services/verbPrepositionCompoundService';
import { PREPOSITION_GRID } from '@/services/verbPrepositionService';

const keyOf = (entry: {
  verb: string;
  is_reflexive?: boolean;
  preposition: string;
}) => `${entry.is_reflexive ? 'sich ' : ''}${entry.verb} ${entry.preposition}`;

const patternsByKey = new Map(
  verbPrepositionsV2.map((pattern) => [keyOf(pattern), pattern]),
);

describe('verb preposition compound seed data', () => {
  it('has a worthwhile number of entries', () => {
    expect(verbPrepositionCompoundsV1.length).toBeGreaterThanOrEqual(30);
  });

  it('attaches at most one entry per pattern, though a pattern has several sentences', () => {
    expect(new Set(verbPrepositionCompoundsV1.map(keyOf)).size).toBe(
      verbPrepositionCompoundsV1.length,
    );
  });

  it('attaches every entry to exactly one existing pattern', () => {
    for (const entry of verbPrepositionCompoundsV1) {
      expect(patternsByKey.has(keyOf(entry))).toBe(true);
    }
  });

  it('has no duplicate entries', () => {
    const keys = verbPrepositionCompoundsV1.map(keyOf);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('only uses prepositions that have a button on the grid', () => {
    for (const entry of verbPrepositionCompoundsV1) {
      expect(PREPOSITION_GRID).toContain(entry.preposition);
    }
  });

  it('has exactly one blank in every sentence', () => {
    for (const entry of verbPrepositionCompoundsV1) {
      expect(entry.da_sentence.split('____')).toHaveLength(2);
      expect(entry.wo_sentence.split('____')).toHaveLength(2);
    }
  });

  it('opens every wo question with the blank, as a question', () => {
    for (const entry of verbPrepositionCompoundsV1) {
      expect(entry.wo_sentence.startsWith('____ ')).toBe(true);
      expect(entry.wo_sentence.endsWith('?')).toBe(true);
    }
  });

  it('keeps the da blank out of the sentence start, where it would read as a wo question', () => {
    for (const entry of verbPrepositionCompoundsV1) {
      expect(entry.da_sentence.startsWith('____')).toBe(false);
    }
  });

  it('has a translation for every sentence', () => {
    for (const entry of verbPrepositionCompoundsV1) {
      expect(entry.da_translation.trim().length).toBeGreaterThan(0);
      expect(entry.wo_translation.trim().length).toBeGreaterThan(0);
    }
  });

  it('never gives the answer away in the sentence', () => {
    for (const entry of verbPrepositionCompoundsV1) {
      const pattern = patternsByKey.get(keyOf(entry))!;
      const answers = [entry.preposition, ...(pattern.alt_prepositions ?? [])];
      for (const answer of answers) {
        for (const form of ['da', 'wo'] as const) {
          const compound = toCompound(answer, form);
          expect(entry.da_sentence.toLowerCase()).not.toContain(compound);
          expect(entry.wo_sentence.toLowerCase()).not.toContain(compound);
        }
      }
    }
  });

  it('shows the person form with the preposition and a pronoun, never a compound', () => {
    const withPerson = verbPrepositionCompoundsV1.filter(
      (entry) => entry.person_example,
    );
    expect(withPerson.length).toBeGreaterThan(10);

    for (const entry of withPerson) {
      const example = entry.person_example!;
      // \b doesn't see ü as a letter, so use Unicode-aware boundaries
      expect(example).toMatch(
        new RegExp(`(?<!\\p{L})${entry.preposition}(?!\\p{L})`, 'u'),
      );
      expect(example).toMatch(/\b(ihn|ihm|sie|ihr|mich|dich|uns)\b/);
      for (const form of ['da', 'wo'] as const) {
        expect(example.toLowerCase()).not.toContain(
          toCompound(entry.preposition, form),
        );
      }
    }
  });

  it('leaves out patterns that are about people', () => {
    const peopleOnly = [
      'sich bedanken bei',
      'sich entschuldigen bei',
      'sich beschweren bei',
      'sich bewerben bei',
      'sich verlieben in',
      'sich verabreden mit',
      'sich verabschieden von',
      'sich trennen von',
      'sprechen mit',
      'telefonieren mit',
      'sich treffen mit',
      'sich streiten mit',
      'sich wenden an',
    ];
    const keys = new Set(verbPrepositionCompoundsV1.map(keyOf));
    for (const key of peopleOnly) {
      expect(keys.has(key)).toBe(false);
    }
  });

  it('leaves out patterns where more than one compound is a natural answer', () => {
    // helfen bei (dabei / damit), sprechen über (darüber / davon),
    // entscheiden für (wofür / wozu), streiten über / um
    const keys = new Set(verbPrepositionCompoundsV1.map(keyOf));
    for (const key of [
      'helfen bei',
      'sprechen über',
      'sich entscheiden für',
      'sich streiten über',
      'sich streiten um',
    ]) {
      expect(keys.has(key)).toBe(false);
    }
  });

  it('gives verbs with several prepositions a sentence that only one fits', () => {
    // sich freuen auf / über share a verb: the cues are what keep them apart
    const freuenAuf = verbPrepositionCompoundsV1.find(
      (entry) => keyOf(entry) === 'sich freuen auf',
    )!;
    const freuenUeber = verbPrepositionCompoundsV1.find(
      (entry) => keyOf(entry) === 'sich freuen über',
    )!;
    expect(freuenAuf.wo_sentence).not.toBe(freuenUeber.wo_sentence);
    expect(freuenAuf.da_sentence).not.toBe(freuenUeber.da_sentence);
  });
});
