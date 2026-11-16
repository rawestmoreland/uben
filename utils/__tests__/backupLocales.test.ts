/**
 * Every language needs every cloud-backup string, with the same {{placeholders}}
 * as English, and every error code the services can raise needs a message.
 */

import type { BackupErrorCode } from '@/services/backupApi';

const LOCALES = {
  en: require('@/locales/en.json'),
  fr: require('@/locales/fr.json'),
  hu: require('@/locales/hu.json'),
  it: require('@/locales/it.json'),
  pl: require('@/locales/pl.json'),
  pt: require('@/locales/pt.json'),
  ru: require('@/locales/ru.json'),
  tr: require('@/locales/tr.json'),
  zh: require('@/locales/zh.json'),
} as Record<string, { app: { backup: Record<string, unknown> } }>;

// Compile-time exhaustive: adding a BackupErrorCode without listing it here
// fails type-checking, which sends you to add its message in every locale.
const ERROR_CODES: Record<BackupErrorCode, true> = {
  not_configured: true,
  offline: true,
  rate_limited: true,
  server: true,
  invalid_credentials: true,
  email_taken: true,
  invalid_email: true,
  weak_password: true,
  session_expired: true,
  not_pro: true,
  not_signed_in: true,
  busy: true,
  no_backup: true,
  unsupported_version: true,
  invalid_backup: true,
};

function placeholders(text: string): string[] {
  return (text.match(/\{\{\w+\}\}/g) ?? []).sort();
}

function flatten(
  value: Record<string, unknown>,
  prefix = '',
): Record<string, string> {
  let out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') out[`${prefix}${key}`] = entry;
    else out = Object.assign(out, flatten(entry as Record<string, unknown>, `${prefix}${key}.`));
  }
  return out;
}

const english = flatten(LOCALES.en.app.backup);

describe('cloud backup locale strings', () => {
  it('has an English message for every error code plus a generic fallback', () => {
    for (const code of [...Object.keys(ERROR_CODES), 'unknown']) {
      expect(english[`errors.${code}`]).toBeTruthy();
    }
  });

  it.each(Object.keys(LOCALES))('%s has every key with matching placeholders', (locale) => {
    const strings = flatten(LOCALES[locale].app.backup);
    expect(Object.keys(strings).sort()).toEqual(Object.keys(english).sort());
    for (const [key, text] of Object.entries(strings)) {
      expect(text.trim()).not.toBe('');
      expect(placeholders(text)).toEqual(placeholders(english[key]));
    }
  });
});
