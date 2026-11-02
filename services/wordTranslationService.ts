import { adjectiveTranslations } from '@/database/seeds/translations/adjectives';
import { verbTranslations } from '@/database/seeds/translations/verbs';
import type { WordTranslations } from '@/database/seeds/translations/types';
import { verbPrepositionSentenceTranslations } from '@/database/seeds/translations/verb-preposition-sentences';

export type TranslatedWordType = 'verb' | 'adjective';

const TRANSLATIONS_BY_TYPE: Record<TranslatedWordType, WordTranslations> = {
  verb: verbTranslations,
  adjective: adjectiveTranslations,
};

/**
 * Resolve a verb/adjective hint in the user's app language.
 *
 * Verbs and adjectives ship with the app (no PocketBase sync), so their
 * translations are bundled seed data keyed by the German form. Falls back to
 * `fallback` (the stored English text) for English, for user-added words with
 * no entry, and for locales this word has no translation in.
 */
export function getWordTranslation(
  wordType: TranslatedWordType,
  german: string,
  locale: string,
  fallback: string | null,
): string | null {
  if (locale === 'en') return fallback;

  const entry = TRANSLATIONS_BY_TYPE[wordType][german];
  const translation = entry?.[locale as keyof typeof entry];
  return translation ?? fallback;
}

/**
 * Resolve a verb preposition example sentence's gloss in the user's app
 * language. Sentences are keyed by their German text exactly as stored. Falls
 * back to `fallback` (the stored English gloss) for English and for sentences
 * or locales with no bundled translation.
 */
export function getSentenceTranslation(
  sentence: string,
  locale: string,
  fallback: string,
): string;
export function getSentenceTranslation(
  sentence: string,
  locale: string,
  fallback: string | null,
): string | null;
export function getSentenceTranslation(
  sentence: string,
  locale: string,
  fallback: string | null,
): string | null {
  if (locale === 'en') return fallback;

  const entry = verbPrepositionSentenceTranslations[sentence];
  const translation = entry?.[locale as keyof typeof entry];
  return translation ?? fallback;
}
