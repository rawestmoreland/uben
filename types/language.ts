export const APP_LANGUAGES = ['en', 'it', 'pl', 'fr', 'tr', 'ru'] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

/**
 * Each language is labelled in its own script (an endonym), never translated,
 * so a user who landed in the wrong language can still find their own.
 */
export const APP_LANGUAGE_NAMES: Record<AppLanguage, string> = {
  en: 'English',
  it: 'Italiano',
  pl: 'Polski',
  fr: 'Français',
  tr: 'Türkçe',
  ru: 'Русский',
};

/**
 * Map a BCP 47 tag from the device (e.g. 'tr-TR', 'fr_CA') to a supported app
 * language. Unsupported or missing tags fall back to 'en'.
 */
export function resolveAppLanguage(tag?: string | null): AppLanguage {
  const baseCode = tag?.split(/[-_]/)[0]?.toLowerCase();
  return APP_LANGUAGES.find((language) => language === baseCode) ?? 'en';
}
