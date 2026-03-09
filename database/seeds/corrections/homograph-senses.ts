import type { NounCorrectionVersion } from '@/types/database';

/**
 * Corrections that backfill the `sense` field on existing nouns that now have
 * a homograph sibling.  Each entry targets the row where sense IS NULL (i.e. the
 * original, pre-homograph entry) so we don't accidentally overwrite a homograph
 * that was seeded with its own sense in the same batch.
 *
 * Also corrects the english value of existing entries where needed for clarity.
 */
export const homographSenseCorrections: NounCorrectionVersion = {
  version: '4.0.0_homograph_senses_v1',
  corrections: [
    // der See (lake) — pairs with die See (sea)
    {
      german: 'See',
      currentArticle: 'der',
      currentSense: null,
      corrections: { sense: 'lake' },
    },
    // der Leiter (manager / leader) — pairs with die Leiter (ladder)
    {
      german: 'Leiter',
      currentArticle: 'der',
      currentSense: null,
      corrections: { sense: 'leader' },
    },
    // die Bank (bank / financial institution) — pairs with die Bank (bench)
    {
      german: 'Bank',
      currentArticle: 'die',
      currentSense: null,
      corrections: { sense: 'bank' },
    },
    // das Schloss (castle / palace) — pairs with das Schloss (lock)
    {
      german: 'Schloss',
      currentArticle: 'das',
      currentSense: null,
      corrections: { sense: 'castle' },
    },
    // die Mutter (mother) — pairs with die Mutter (nut)
    {
      german: 'Mutter',
      currentArticle: 'die',
      currentSense: null,
      corrections: { sense: 'mother' },
    },
  ],
};
