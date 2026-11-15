// Cloud backup payload types. The payload is portable across installs: it
// never contains local integer IDs. Cards are identified by the word itself
// (a "natural key"), and restore maps that back to this install's row IDs.
//
// Compact tuples are used instead of objects because a heavy user's review
// history can run to tens of thousands of rows.

/** Bump when the payload shape changes in a way old apps can't read. */
export const BACKUP_PAYLOAD_VERSION = 1;

/** card_progress.word_type values that are backed up. */
export type BackupCardType =
  | 'noun'
  | 'noun_plural'
  | 'adjective'
  | 'verb'
  | 'verb_prep'
  | 'verb_prep_compound';

/**
 * Natural key per card type:
 * - noun / noun_plural: [german, article, sense | null]
 * - adjective:          [german]
 * - verb:               [infinitive]
 * - verb_prep:          [kind, head word, is_reflexive 0|1, preposition, sentence]
 * - verb_prep_compound: [...verb_prep key, 'da' | 'wo']
 */
export type BackupCardKey = (string | number | null)[];

/** [quality 0-5, time taken in ms | null, reviewed_at] */
export type BackupReviewTuple = [number, number | null, string];

/**
 * [type, key, ease_factor, interval, repetitions, next_review_date,
 *  total_reviews, correct_reviews, last_reviewed_at | null, created_at,
 *  review history]
 */
export type BackupCardTuple = [
  BackupCardType,
  BackupCardKey,
  number,
  number,
  number,
  string,
  number,
  number,
  string | null,
  string,
  BackupReviewTuple[],
];

/**
 * [german, article, article_alt | null, plural | null, english | null,
 *  level | null, category name | null]
 */
export type BackupNounTuple = [
  string,
  string,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
];

/** [german, english, level | null] */
export type BackupAdjectiveTuple = [string, string, string | null];

/**
 * [infinitive, past_tense, past_du, past_wir, past_ihr, past_sie,
 *  past_participle, english, is_separable 0|1, level | null]
 */
export type BackupVerbTuple = [
  string,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  number,
  string | null,
];

export interface BackupPayload {
  version: number;
  /** ISO timestamp of when the snapshot was taken on the device. */
  createdAt: string;
  settings: Record<string, string>;
  /** User-added words only; vocabulary shipped with the app is not backed up. */
  nouns: BackupNounTuple[];
  adjectives: BackupAdjectiveTuple[];
  verbs: BackupVerbTuple[];
  cards: BackupCardTuple[];
}

export interface RestoreSummary {
  /** Cards written to this install. */
  restoredCards: number;
  /** Cards for words this install doesn't have (e.g. an older vocabulary). */
  skippedCards: number;
  /** User-added words re-created because they were missing locally. */
  addedWords: number;
  /** Review history rows written. */
  restoredReviews: number;
}

export type BackupPayloadErrorCode = 'invalid' | 'unsupported_version';
