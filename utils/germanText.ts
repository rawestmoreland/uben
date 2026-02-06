/**
 * German text transformation utilities for handling ß (eszett) vs ss variants.
 */

/**
 * Convert German ß (eszett) to Swiss ss.
 * @example convertEszettToSS('Straße') → 'Strasse'
 * @example convertEszettToSS('GROẞMUTTER') → 'GROSSMUTTER'
 */
export function convertEszettToSS(text: string): string {
  return text.replace(/ß/g, 'ss').replace(/ẞ/g, 'SS');
}

/**
 * Apply German text preference transformation.
 * @param text - The German text to transform
 * @param preference - 'eszett' (standard German) or 'ss' (Swiss German)
 */
export function applyGermanTextPreference(
  text: string,
  preference: 'eszett' | 'ss',
): string {
  if (preference === 'ss') {
    return convertEszettToSS(text);
  }
  return text;
}
