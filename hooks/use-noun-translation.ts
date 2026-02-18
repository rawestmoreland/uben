import { useTranslation } from 'react-i18next';

/**
 * Translate a noun from its translation_key using the current device locale.
 *
 * Falls back to the raw `english` field when:
 * - `translationKey` is null (user-added words have no key)
 * - The key has no translation in the current locale
 *
 * This ensures user-added words always show their english field as the hint,
 * and pre-seeded words get localised once a locale file is added.
 */
export function useNounTranslation(
  translationKey: string | null,
  fallback: string | null,
): string | null {
  const { t } = useTranslation('nouns');

  if (!translationKey) {
    return fallback;
  }

  const translated = t(translationKey, { defaultValue: '' });
  return translated || fallback;
}
