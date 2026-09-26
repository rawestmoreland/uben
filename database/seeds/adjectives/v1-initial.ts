import type { SeedAdjective } from '@/types/database';

/**
 * A1/A2 adjectives for the adjective declension feature.
 *
 * Deliberately excludes adjectives ending in unstressed -el/-er (e.g.
 * "dunkel", "teuer") and irregular stems (e.g. "hoch" → hohe-), which drop
 * or alter their final vowel before taking an ending. Every word here
 * inflects by simply appending the ending (klein → kleine, kleinen, ...).
 */
export const adjectivesV1: SeedAdjective[] = [
  { german: 'groß', english: 'big / tall', level: 'A1' },
  { german: 'klein', english: 'small', level: 'A1' },
  { german: 'neu', english: 'new', level: 'A1' },
  { german: 'alt', english: 'old', level: 'A1' },
  { german: 'gut', english: 'good', level: 'A1' },
  { german: 'schön', english: 'beautiful', level: 'A1' },
  { german: 'jung', english: 'young', level: 'A1' },
  { german: 'lang', english: 'long', level: 'A1' },
  { german: 'kurz', english: 'short', level: 'A1' },
  { german: 'warm', english: 'warm', level: 'A1' },
  { german: 'kalt', english: 'cold', level: 'A1' },
  { german: 'schnell', english: 'fast', level: 'A1' },
  { german: 'langsam', english: 'slow', level: 'A1' },
  { german: 'billig', english: 'cheap', level: 'A1' },
  { german: 'hell', english: 'bright / light', level: 'A1' },
  { german: 'laut', english: 'loud', level: 'A1' },
  { german: 'leise', english: 'quiet', level: 'A1' },
  { german: 'stark', english: 'strong', level: 'A1' },
  { german: 'schwach', english: 'weak', level: 'A2' },
  { german: 'breit', english: 'wide', level: 'A2' },
  { german: 'schmal', english: 'narrow', level: 'A2' },
  { german: 'schmutzig', english: 'dirty', level: 'A2' },
  { german: 'voll', english: 'full', level: 'A1' },
  { german: 'leer', english: 'empty', level: 'A2' },
  { german: 'offen', english: 'open', level: 'A1' },
  { german: 'frisch', english: 'fresh', level: 'A1' },
  { german: 'reich', english: 'rich', level: 'A2' },
  { german: 'arm', english: 'poor', level: 'A2' },
  { german: 'glücklich', english: 'happy', level: 'A1' },
  { german: 'traurig', english: 'sad', level: 'A1' },
  { german: 'müde', english: 'tired', level: 'A1' },
  { german: 'krank', english: 'sick', level: 'A1' },
  { german: 'gesund', english: 'healthy', level: 'A1' },
  { german: 'freundlich', english: 'friendly', level: 'A2' },
  { german: 'nett', english: 'nice', level: 'A1' },
  { german: 'wichtig', english: 'important', level: 'A2' },
  { german: 'einfach', english: 'simple', level: 'A2' },
  { german: 'schwierig', english: 'difficult', level: 'A2' },
  { german: 'interessant', english: 'interesting', level: 'A2' },
  { german: 'modern', english: 'modern', level: 'A2' },
];
