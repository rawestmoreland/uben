import type { SeedNoun } from '@/types/database';

/**
 * Nouns with two valid articles for the SAME meaning.
 *
 * `article` is the primary (usually masculine) article and `article_alt` the
 * second; the quiz accepts either and shows both ("der / die"). One row, one
 * SM-2 card. Pairs whose meaning changes with the article (der See / die See)
 * belong in homographs.ts instead, as separate rows with a `sense`.
 */
export const dualArticleNouns: SeedNoun[] = [
  // der/die Gleichgesinnte — like-minded person (adjectival noun)
  {
    german: 'Gleichgesinnte',
    article: 'der',
    article_alt: 'die',
    plural: 'Gleichgesinnten',
    english: 'like-minded person',
    level: 'B2',
    category: 'people',
  },
];
