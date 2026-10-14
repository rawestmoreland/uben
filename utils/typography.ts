import { Typography } from '@/constants/design';

/**
 * Typography utility functions for consistent text sizing across the app.
 */

/**
 * Props that keep a noun on a single line. The tiered size from
 * `getNounFontSize` is the starting point; `adjustsFontSizeToFit` shrinks the
 * text down to `minimumFontScale` when a word is still too wide for the card
 * (long compounds on narrow phones), so it never wraps or gets clipped.
 */
export const NOUN_SINGLE_LINE_PROPS = {
  numberOfLines: 1,
  adjustsFontSizeToFit: true,
  minimumFontScale: 0.5,
} as const;

/**
 * Returns appropriate font size based on word length to prevent awkward wrapping.
 * Uses tiered sizing to maintain neo-brutalist bold, consistent aesthetic.
 * Pair with `NOUN_SINGLE_LINE_PROPS` so words that are wide for their length
 * still fit on one line.
 *
 * @param word - The word to calculate font size for
 * @returns Font size in pixels
 *
 * @example
 * getNounFontSize('Hund') → 48 (Typography.huge)
 * getNounFontSize('Verantwortung') → 32 (Typography.title)
 * getNounFontSize('Geschwindigkeitsbegrenzung') → 24 (Typography.heading)
 */
export function getNounFontSize(word: string): number {
  const length = word.length;
  if (length <= 12) return Typography.huge; // 48px - most words
  if (length <= 18) return Typography.title; // 32px - longer words
  return Typography.heading; // 24px - very long words
}
