import type { NounCorrectionVersion } from '@/types/database';

/**
 * Backfills `article_alt` on nouns that already shipped with only one article
 * but take two for the same meaning (der/die Angestellte). The primary
 * `article` is unchanged, so row IDs, remote IDs and card_progress are kept.
 *
 * Only words in the bundled seeds are listed. Nouns that arrive via
 * PocketBase sync (e.g. Jugendliche, Verwandte) get `article_alt` from their
 * PocketBase record instead.
 */
export const dualArticleCorrections: NounCorrectionVersion = {
  version: '4.1.0_dual_article_backfill_v1',
  corrections: [
    // der/die Angestellte (male/female employee)
    {
      german: 'Angestellte',
      currentArticle: 'der',
      currentSense: null,
      corrections: { article_alt: 'die' },
    },
    // der/die Bekannte (male/female acquaintance)
    {
      german: 'Bekannte',
      currentArticle: 'der',
      currentSense: null,
      corrections: { article_alt: 'die' },
    },
  ],
};
