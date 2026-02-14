/**
 * Example correction file — DO NOT ship this file as-is.
 *
 * When a user reports incorrect data, create a real file (e.g.,
 * `2025-02-corrections.ts`) and register it in `index.ts`.
 *
 * Steps to add a correction:
 *
 * 1. Create a file in this directory with the corrections:
 *
 *    // database/seeds/corrections/2025-02-corrections.ts
 *    import type { NounCorrection } from '@/types/database';
 *
 *    export const feb2025Corrections: NounCorrection[] = [
 *      {
 *        // Fix: "der Milch" → "die Milch"
 *        german: 'Milch',
 *        currentArticle: 'der',
 *        corrections: { article: 'die' },
 *      },
 *      {
 *        // Fix: wrong plural for Haus
 *        german: 'Haus',
 *        currentArticle: 'das',
 *        corrections: { plural: 'Häuser' },
 *      },
 *      {
 *        // Fix: multiple fields at once
 *        german: 'Stuhl',
 *        currentArticle: 'der',
 *        corrections: { plural: 'Stühle', english: 'chair' },
 *      },
 *    ];
 *
 * 2. Register it in `index.ts`:
 *
 *    import { feb2025Corrections } from './2025-02-corrections';
 *
 *    export const nounCorrectionVersions: NounCorrectionVersion[] = [
 *      { version: '4.0.0_corrections_001', corrections: feb2025Corrections },
 *    ];
 *
 * 3. Also fix the original seed file (e.g., v1-initial.ts) so new installs
 *    get the correct data from the start.
 *
 * 4. Ship the app update. On next launch, `applyNounCorrections()` will
 *    apply the corrections once and mark the version as done.
 */
