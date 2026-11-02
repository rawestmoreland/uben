import { useTranslation } from 'react-i18next';
import {
  getSentenceTranslation,
  getWordTranslation,
  type TranslatedWordType,
} from '@/services/wordTranslationService';

/**
 * Verb/adjective hint in the current app language, falling back to the stored
 * English text. Counterpart of `useNounTranslation` for words whose
 * translations are bundled with the app rather than synced.
 */
export function useWordTranslation(
  wordType: TranslatedWordType,
  german: string | null,
  fallback: string | null,
): string | null {
  // useTranslation re-renders on i18n.changeLanguage()
  const { i18n } = useTranslation();
  if (!german) return fallback;
  return getWordTranslation(wordType, german, i18n.language, fallback);
}

/**
 * Verb preposition example-sentence gloss in the current app language, falling
 * back to the stored English text. Keyed by the German sentence (see
 * `getSentenceTranslation`).
 */
export function useSentenceTranslation(
  sentence: string,
  fallback: string,
): string;
export function useSentenceTranslation(
  sentence: string,
  fallback: string | null,
): string | null;
export function useSentenceTranslation(
  sentence: string,
  fallback: string | null,
): string | null {
  // useTranslation re-renders on i18n.changeLanguage()
  const { i18n } = useTranslation();
  return getSentenceTranslation(sentence, i18n.language, fallback);
}
