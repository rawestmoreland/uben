import { Typography } from '@/constants/design';

/**
 * Typography utility functions for consistent text sizing across the app.
 */

/**
 * Returns appropriate font size based on word length to prevent awkward wrapping.
 * Uses tiered sizing to maintain neo-brutalist bold, consistent aesthetic.
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
