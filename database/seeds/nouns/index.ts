import type { SeedNoun } from '@/types/database';
import { v1InitialNouns } from './v1-initial';

export interface NounSeedVersion {
  version: string;
  nouns: SeedNoun[];
}

/**
 * Registry of versioned noun seed data.
 * Each version contains only the nouns introduced in that release.
 * To add words: create a new v2-*.ts file, import it, and append one entry here.
 */
export const nounSeedVersions: NounSeedVersion[] = [
  { version: '3.0.0_a1_nouns_v1', nouns: v1InitialNouns },
  // Future: { version: '3.1.0_a1_nouns_v2', nouns: v2Nouns },
];
