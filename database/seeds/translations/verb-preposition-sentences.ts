import type { WordTranslations } from './types';
import { verbPrepositionAdjectiveNounSentenceTranslations } from './verb-preposition-sentences-adjectives-nouns';
import { verbPrepositionCompoundSentenceTranslations } from './verb-preposition-sentences-compounds';
import { verbPrepositionCoreSentenceTranslations } from './verb-preposition-sentences-core';

/**
 * Translations of every verb preposition example sentence, keyed by the German
 * sentence as stored (standard spelling, with its "____" blank). A pattern's
 * sentence is unique across the seeds, so it is a stable key even where several
 * patterns share a verb (`sich freuen auf / über`). English is not listed: it
 * is the stored `translation` column.
 */
export const verbPrepositionSentenceTranslations: WordTranslations = {
  ...verbPrepositionCoreSentenceTranslations,
  ...verbPrepositionAdjectiveNounSentenceTranslations,
  ...verbPrepositionCompoundSentenceTranslations,
};
