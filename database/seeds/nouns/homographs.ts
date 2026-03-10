import type { SeedNoun } from '@/types/database';

/**
 * Homograph noun pairs — words that share the same German spelling but
 * differ in article (improper homographs) or meaning (proper homographs).
 *
 * Each entry here is the *second* sense of a German word. The first sense
 * either already exists in an earlier seed file (updated via corrections)
 * or is included here alongside its sibling.
 *
 * The `sense` field is required for every entry in this file so the quiz
 * can display the right disambiguation hint.
 */
export const homographNouns: SeedNoun[] = [
  // ── Improper homographs (different articles) ─────────────────────────

  // der See (lake) ↔ die See (sea / ocean)
  {
    german: 'See',
    article: 'die',
    plural: 'Seen',
    english: 'sea',
    sense: 'sea',
    level: 'A1',
    category: 'nature',
  },

  // der Leiter (manager / leader) ↔ die Leiter (ladder)
  {
    german: 'Leiter',
    article: 'die',
    plural: 'Leitern',
    english: 'ladder',
    sense: 'ladder',
    level: 'A1',
    category: 'home',
  },

  // ── Proper homographs (same article, different meaning) ──────────────

  // die Bank (bank / financial institution) ↔ die Bank (bench)
  {
    german: 'Bank',
    article: 'die',
    plural: 'Bänke',
    english: 'bench',
    sense: 'bench',
    level: 'A1',
    category: 'home',
  },

  // das Schloss (castle / palace) ↔ das Schloss (lock)
  {
    german: 'Schloss',
    article: 'das',
    plural: 'Schlösser',
    english: 'lock',
    sense: 'lock',
    level: 'A1',
    category: 'home',
  },

  // der Flügel — both senses are new (neither is in earlier seed files)
  // der Flügel (wing)
  {
    german: 'Flügel',
    article: 'der',
    plural: 'Flügel',
    english: 'wing',
    sense: 'wing',
    level: 'A1',
    category: 'nature',
  },
  // der Flügel (grand piano)
  {
    german: 'Flügel',
    article: 'der',
    plural: 'Flügel',
    english: 'grand piano',
    sense: 'piano',
    level: 'A1',
    category: 'general',
  },

  // die Mutter (mother) ↔ die Mutter (nut / bolt nut)
  {
    german: 'Mutter',
    article: 'die',
    plural: 'Muttern',
    english: 'nut',
    sense: 'nut',
    level: 'A1',
    category: 'general',
  },
];
