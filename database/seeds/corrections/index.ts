import type { NounCorrectionVersion } from '@/types/database';
import { homographSenseCorrections } from './homograph-senses';

/**
 * Registry of versioned noun corrections.
 *
 * Use this to fix incorrect data (wrong articles, plurals, translations) that
 * has already been seeded to users' devices. Each version is tracked in
 * `data_versions` and applied at most once.
 *
 * IMPORTANT: Also fix the original seed file so new installs get the correct
 * data from the start. This registry only handles existing users.
 *
 * To add a correction:
 * 1. Create a new file in this directory (e.g., `2025-02-corrections.ts`)
 * 2. Import and append it here with a unique version string
 * 3. Fix the same data in the original seed file (e.g., v1-initial.ts)
 */
export const nounCorrectionVersions: NounCorrectionVersion[] = [
  homographSenseCorrections,
];
