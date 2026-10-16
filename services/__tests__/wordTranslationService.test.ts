import { adjectivesV1 } from '@/database/seeds/adjectives/v1-initial';
import { adjectivesV2 } from '@/database/seeds/adjectives/v2-expanded';
import { adjectiveTranslations } from '@/database/seeds/translations/adjectives';
import { verbTranslations } from '@/database/seeds/translations/verbs';
import { verbsV1 } from '@/database/seeds/verbs/v1-initial';
import { APP_LANGUAGES } from '@/types/language';
import { getWordTranslation } from '../wordTranslationService';

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
        expect(adjectiveTranslations[adjective.german]?.[language]).toBeTruthy();
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
