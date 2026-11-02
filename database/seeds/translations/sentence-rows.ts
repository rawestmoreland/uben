import type { TranslatedLanguage, WordTranslations } from './types';

/**
 * Languages of a `SentenceRow`, in tuple order. Typed as a full list so adding
 * a language to `APP_LANGUAGES` fails the build here, and the translation test
 * fails until every sentence has a text for it.
 */
export const SENTENCE_ROW_LANGUAGES = [
  'it',
  'pl',
  'fr',
  'tr',
  'ru',
  'pt',
  'hu',
  'zh',
] as const satisfies readonly TranslatedLanguage[];

/**
 * One sentence's translations as a tuple, in `SENTENCE_ROW_LANGUAGES` order:
 * [it, pl, fr, tr, ru, pt, hu, zh]. A tuple keeps ~250 sentences readable.
 */
export type SentenceRow = [
  it: string,
  pl: string,
  fr: string,
  tr: string,
  ru: string,
  pt: string,
  hu: string,
  zh: string,
];

/** Expand compact sentence rows into the shape `WordTranslations` uses. */
export function expandSentenceRows(
  rows: Record<string, SentenceRow>,
): WordTranslations {
  return Object.fromEntries(
    Object.entries(rows).map(([sentence, texts]) => [
      sentence,
      Object.fromEntries(
        SENTENCE_ROW_LANGUAGES.map((language, index) => [
          language,
          texts[index],
        ]),
      ) as Record<TranslatedLanguage, string>,
    ]),
  );
}
