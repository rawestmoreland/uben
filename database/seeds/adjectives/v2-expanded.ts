import type { SeedAdjective } from '@/types/database';

/**
 * A2/B1 adjectives for the adjective declension feature — expands on v1
 * with personality/character and descriptive vocabulary.
 *
 * Same constraint as v1: only adjectives that inflect by simply appending
 * the ending (no unstressed -el/-er elision, no irregular stems).
 */
export const adjectivesV2: SeedAdjective[] = [
  { german: 'süß', english: 'sweet', level: 'A1' },
  { german: 'ruhig', english: 'calm / quiet', level: 'A1' },
  { german: 'lustig', english: 'funny', level: 'A1' },
  { german: 'höflich', english: 'polite', level: 'A2' },
  { german: 'unhöflich', english: 'impolite', level: 'A2' },
  { german: 'ehrlich', english: 'honest', level: 'A2' },
  { german: 'pünktlich', english: 'punctual', level: 'A2' },
  { german: 'langweilig', english: 'boring', level: 'A2' },
  { german: 'spannend', english: 'exciting', level: 'A2' },
  { german: 'gefährlich', english: 'dangerous', level: 'A2' },
  { german: 'bequem', english: 'comfortable', level: 'A2' },
  { german: 'praktisch', english: 'practical', level: 'A2' },
  { german: 'typisch', english: 'typical', level: 'A2' },
  { german: 'mutig', english: 'brave', level: 'A2' },
  { german: 'fleißig', english: 'hardworking', level: 'A2' },
  { german: 'faul', english: 'lazy', level: 'A2' },
  { german: 'berühmt', english: 'famous', level: 'A2' },
  { german: 'beliebt', english: 'popular', level: 'A2' },
  { german: 'notwendig', english: 'necessary', level: 'B1' },
  { german: 'kompliziert', english: 'complicated', level: 'B1' },
];
