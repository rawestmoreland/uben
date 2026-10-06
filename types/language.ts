export const APP_LANGUAGES = ['en', 'it', 'pl', 'fr'] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];
