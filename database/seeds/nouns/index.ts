import type { SeedNoun } from '@/types/database';
import { v1InitialNouns } from './v1-initial';
import { vocabA110 } from './vocab-a1-10';
import { vocabA18 } from './vocab-a1-8';
import { vocabA19 } from './vocab-a1-9';

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
  { version: '3.1.0_a1_nouns_v2', nouns: vocabA18 },
  { version: '3.2.0_a1_nouns_v3', nouns: vocabA19 },
  { version: '3.3.0_a1_nouns_v4', nouns: vocabA110 },
  // Future: { version: '3.2.0_a1_nouns_v2', nouns: v2Nouns },
];
