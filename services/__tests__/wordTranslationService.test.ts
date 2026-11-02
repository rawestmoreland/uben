import { adjectivesV1 } from '@/database/seeds/adjectives/v1-initial';
import { adjectivesV2 } from '@/database/seeds/adjectives/v2-expanded';
import { adjectiveTranslations } from '@/database/seeds/translations/adjectives';
import { verbTranslations } from '@/database/seeds/translations/verbs';
import { verbPrepositionSentenceTranslations } from '@/database/seeds/translations/verb-preposition-sentences';
import { adjectiveNounPrepositionsV2 } from '@/database/seeds/verb-prepositions/v2-adjectives-nouns';
import { verbPrepositionCompoundsV1 } from '@/database/seeds/verb-prepositions/v2-compounds';
import { verbPrepositionsV2 } from '@/database/seeds/verb-prepositions/v2-core';
import { verbsV1 } from '@/database/seeds/verbs/v1-initial';
import { APP_LANGUAGES } from '@/types/language';
import {
  getSentenceTranslation,
  getWordTranslation,
} from '../wordTranslationService';

describe('getWordTranslation', () => {
  it('returns the stored English text for English', () => {
    expect(getWordTranslation('verb', 'gehen', 'en', 'to go')).toBe('to go');
  });

  it('returns the verb translation for the selected language', () => {
    expect(getWordTranslation('verb', 'gehen', 'fr', 'to go')).toBe('aller');
    expect(getWordTranslation('verb', 'gehen', 'zh', 'to go')).toBe('去 / 走');
  });

  it('returns the adjective translation for the selected language', () => {
    expect(getWordTranslation('adjective', 'klein', 'tr', 'small')).toBe(
      'küçük',
    );
  });

  it('falls back to English for words without an entry (user-added)', () => {
    expect(getWordTranslation('verb', 'tanzen', 'fr', 'to dance')).toBe(
      'to dance',
    );
    expect(getWordTranslation('adjective', 'rot', 'it', 'red')).toBe('red');
  });

  it('falls back to English for an unsupported locale', () => {
    expect(getWordTranslation('verb', 'gehen', 'de', 'to go')).toBe('to go');
  });

  it('returns null when there is no entry and no fallback', () => {
    expect(getWordTranslation('verb', 'tanzen', 'fr', null)).toBeNull();
  });
});

describe('bundled translations', () => {
  const languages = APP_LANGUAGES.filter((language) => language !== 'en');

  it('cover every seeded verb in every non-English language', () => {
    for (const verb of verbsV1) {
      for (const language of languages) {
        expect(verbTranslations[verb.infinitive]?.[language]).toBeTruthy();
      }
    }
  });

  it('cover every seeded adjective in every non-English language', () => {
    for (const adjective of [...adjectivesV1, ...adjectivesV2]) {
      for (const language of languages) {
        expect(
          adjectiveTranslations[adjective.german]?.[language],
        ).toBeTruthy();
      }
    }
  });

  it('have no entries for words that are not seeded', () => {
    const verbs = new Set(verbsV1.map((verb) => verb.infinitive));
    const adjectives = new Set(
      [...adjectivesV1, ...adjectivesV2].map((adjective) => adjective.german),
    );
    expect(Object.keys(verbTranslations).filter((k) => !verbs.has(k))).toEqual(
      [],
    );
    expect(
      Object.keys(adjectiveTranslations).filter((k) => !adjectives.has(k)),
    ).toEqual([]);
  });
});

describe('getSentenceTranslation', () => {
  const sentence = 'Ich denke jeden Tag ____ dich.';
  const english = 'I think of you every day.';

  it('returns the stored English gloss for English', () => {
    expect(getSentenceTranslation(sentence, 'en', english)).toBe(english);
  });

  it('returns the bundled translation for the selected language', () => {
    expect(getSentenceTranslation(sentence, 'fr', english)).toBe(
      'Je pense à toi tous les jours.',
    );
    expect(getSentenceTranslation(sentence, 'zh', english)).toBe(
      '我每天都想着你。',
    );
  });

  it('falls back to English for sentences without an entry', () => {
    expect(getSentenceTranslation('Unbekannt ____.', 'fr', 'Unknown.')).toBe(
      'Unknown.',
    );
  });

  it('falls back to English for an unsupported locale', () => {
    expect(getSentenceTranslation(sentence, 'de', english)).toBe(english);
  });
});

describe('bundled verb preposition sentence translations', () => {
  const languages = APP_LANGUAGES.filter((language) => language !== 'en');
  const sentences = [
    ...verbPrepositionsV2.map((pattern) => pattern.sentence),
    ...adjectiveNounPrepositionsV2.map((pattern) => pattern.sentence),
    ...verbPrepositionCompoundsV1.flatMap((compound) => [
      compound.da_sentence,
      compound.wo_sentence,
    ]),
  ];

  it('cover every seeded sentence in every non-English language', () => {
    for (const sentence of sentences) {
      for (const language of languages) {
        expect(
          verbPrepositionSentenceTranslations[sentence]?.[language]?.trim(),
        ).toBeTruthy();
      }
    }
  });

  it('have no entries for sentences that are not seeded', () => {
    const seeded = new Set(sentences);
    expect(
      Object.keys(verbPrepositionSentenceTranslations).filter(
        (sentence) => !seeded.has(sentence),
      ),
    ).toEqual([]);
  });

  it('keep each sentence unique, so it is a safe key', () => {
    expect(new Set(sentences).size).toBe(sentences.length);
  });
});
