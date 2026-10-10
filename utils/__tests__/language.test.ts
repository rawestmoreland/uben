import en from '@/locales/en.json';
import pt from '@/locales/pt.json';
import ru from '@/locales/ru.json';
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

describe('pt locale', () => {
  it('selects European Portuguese for pt, pt-PT and pt-BR', () => {
    expect(resolveAppLanguage('pt')).toBe('pt');
    expect(resolveAppLanguage('pt-PT')).toBe('pt');
    expect(resolveAppLanguage('pt-BR')).toBe('pt');
  });

  it('has every non-plural key from en.json', () => {
    const ptKeys = new Set(leafKeys(pt));
    const pluralSuffix = /_(one|many|other)$/;
    const missing = leafKeys(en)
      .filter((key) => !pluralSuffix.test(key))
      .filter((key) => !ptKeys.has(key));
    expect(missing).toEqual([]);
  });

  it('defines one, many and other wherever en.json is pluralised', () => {
    const ptKeys = new Set(leafKeys(pt));
    const bases = leafKeys(en)
      .filter((key) => key.endsWith('_other'))
      .map((key) => key.slice(0, -'_other'.length));
    const missing = bases.flatMap((base) =>
      ['one', 'many', 'other']
        .map((form) => `${base}_${form}`)
        .filter((key) => !ptKeys.has(key)),
    );
    expect(missing).toEqual([]);
  });

  it('treats 0 and 1 as singular and 2 and 21 as plural', () => {
    const forms = [0, 1, 2, 21].map((count) =>
      new Intl.PluralRules('pt').select(count),
    );
    expect(forms).toEqual(['one', 'one', 'other', 'other']);
  });
});

describe('ru locale', () => {
  it('selects Russian for ru and regional variants', () => {
    expect(resolveAppLanguage('ru')).toBe('ru');
    expect(resolveAppLanguage('ru-RU')).toBe('ru');
  });

  it('has every non-plural key from en.json', () => {
    const ruKeys = new Set(leafKeys(ru));
    const pluralSuffix = /_(one|few|many|other)$/;
    const missing = leafKeys(en)
      .filter((key) => !pluralSuffix.test(key))
      .filter((key) => !ruKeys.has(key));
    expect(missing).toEqual([]);
  });

  it('defines all four plural forms wherever en.json is pluralised', () => {
    const ruKeys = new Set(leafKeys(ru));
    const bases = leafKeys(en)
      .filter((key) => key.endsWith('_other'))
      .map((key) => key.slice(0, -'_other'.length));
    const missing = bases.flatMap((base) =>
      ['one', 'few', 'many', 'other']
        .map((form) => `${base}_${form}`)
        .filter((key) => !ruKeys.has(key)),
    );
    expect(missing).toEqual([]);
  });

  it('picks the right plural form for 1, 2, 5, 11, 21 and 22', () => {
    const forms = [1, 2, 5, 11, 21, 22].map((count) =>
      new Intl.PluralRules('ru').select(count),
    );
    expect(forms).toEqual(['one', 'few', 'many', 'many', 'one', 'few']);
  });
});
