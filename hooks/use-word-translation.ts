import { useTranslation } from 'react-i18next';
import {
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
