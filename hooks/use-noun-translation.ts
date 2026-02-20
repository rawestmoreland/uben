import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getDatabase } from '@/database/db';

/**
 * Look up the noun translation for the current app language from the local
 * noun_translations SQLite table (synced from PocketBase).
 *
 * Falls back to the raw `english` field when:
 * - locale is 'en' (english field is canonical)
 * - nounRemoteId is null (user-added words have no remote_id)
 * - no row found in noun_translations for this noun + locale
 */
export function useNounTranslation(
  nounRemoteId: string | null,
  fallback: string | null,
): string | null {
  // useTranslation gives us reactivity when i18n.changeLanguage() is called
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const [translation, setTranslation] = useState<string | null>(fallback);

  useEffect(() => {
    // English and user-added words: english field is the source of truth
    if (locale === 'en' || !nounRemoteId) {
      setTranslation(fallback);
      return;
    }

    let cancelled = false;
    getDatabase()
      .getFirstAsync<{ translation: string }>(
        'SELECT translation FROM noun_translations WHERE noun_id = ? AND locale = ?',
        [nounRemoteId, locale],
      )
      .then((row) => {
        if (!cancelled) {
          setTranslation(row?.translation ?? fallback);
        }
      })
      .catch(() => {
        if (!cancelled) setTranslation(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [nounRemoteId, locale, fallback]);

  return translation;
}
