export const APP_LANGUAGES = ['en', 'it', 'pl', 'fr', 'tr', 'ru'] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

/**
 * Map a BCP 47 tag from the device (e.g. 'tr-TR', 'fr_CA') to a supported app
 * language. Unsupported or missing tags fall back to 'en'.
 */
export function resolveAppLanguage(tag?: string | null): AppLanguage {
  const baseCode = tag?.split(/[-_]/)[0]?.toLowerCase();
  return APP_LANGUAGES.find((language) => language === baseCode) ?? 'en';
}
