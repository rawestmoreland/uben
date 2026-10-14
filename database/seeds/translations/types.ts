import type { AppLanguage } from '@/types/language';

/** Every app language except English, whose text lives in the `english` column. */
export type TranslatedLanguage = Exclude<AppLanguage, 'en'>;

/**
 * Translations of a seeded word, keyed by its German form (verb infinitive or
 * adjective base form). Typed as a full record so adding a language to
 * `APP_LANGUAGES` fails the build until every word has an entry for it.
 */
export type WordTranslations = Record<
  string,
  Record<TranslatedLanguage, string>
>;
