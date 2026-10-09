import i18n from '@/constants/i18n';

/**
 * Upper-case text for the given UI language.
 *
 * Turkish has dotted and dotless I, so `i` -> `İ` and `ı` -> `I`. The default
 * `toUpperCase()` yields `I` for `i`, which produces the wrong letter. The
 * Turkish mapping is applied by hand rather than via `toLocaleUpperCase('tr')`
 * so the result does not depend on the JS engine's locale data.
 *
 * Only use this for translated UI strings. German vocabulary (nouns, articles,
 * verbs) must keep plain `toUpperCase()`: `die` is `DIE`, never `DİE`.
 */
export function upperCaseForLanguage(text: string, language: string): string {
  if (language.toLowerCase().split(/[-_]/)[0] === 'tr') {
    return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
  }
  return text.toUpperCase();
}

/** Upper-case a translated UI string using the app's current language. */
export function uiUpperCase(text: string): string {
  return upperCaseForLanguage(text, i18n.language);
}
