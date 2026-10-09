import en from '@/locales/en.json';
import tr from '@/locales/tr.json';
import { resolveAppLanguage } from '@/types/language';

function leafKeys(node: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? leafKeys(value as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('resolveAppLanguage', () => {
  it('selects Turkish for tr and regional variants', () => {
    expect(resolveAppLanguage('tr')).toBe('tr');
    expect(resolveAppLanguage('tr-TR')).toBe('tr');
    expect(resolveAppLanguage('TR_tr')).toBe('tr');
  });

  it('keeps the other supported languages', () => {
    expect(resolveAppLanguage('fr-CA')).toBe('fr');
    expect(resolveAppLanguage('pl-PL')).toBe('pl');
  });

  it('falls back to English for unsupported or missing locales', () => {
    expect(resolveAppLanguage('ja-JP')).toBe('en');
    expect(resolveAppLanguage('')).toBe('en');
    expect(resolveAppLanguage(undefined)).toBe('en');
    expect(resolveAppLanguage(null)).toBe('en');
  });
});

describe('tr locale', () => {
  it('has a translation for every key in en.json', () => {
    const trKeys = new Set(leafKeys(tr));
    const missing = leafKeys(en).filter((key) => !trKeys.has(key));
    expect(missing).toEqual([]);
  });

  it('does not define keys that en.json lacks', () => {
    const enKeys = new Set(leafKeys(en));
    const extra = leafKeys(tr).filter((key) => !enKeys.has(key));
    expect(extra).toEqual([]);
  });
});
