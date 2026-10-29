import type { AppLanguage } from './language';

// Database entity types for the German learning app

/** A German noun stored in the local database */
export interface Noun {
  id: number;
  german: string;
  article: 'der' | 'die' | 'das';
  plural: string | null;
  english: string | null;
  translation_key: string | null; // Derived from english field, used for i18n lookups
  sense: string | null; // Disambiguation hint for homographs (e.g. "lake" vs "sea" for "See")
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
  category_id: number;
  is_user_added: number; // 0 or 1 (SQLite boolean)
  remote_id: string | null; // PocketBase record ID (null for user-added nouns)
  created_at: string;
}

export interface NounTranslation {
  id: number;
  remote_id: string;
  noun_id: string;
  locale: AppLanguage;
  translation: string;
  created_at: string;
  updated_at: string;
}

/** A category for organizing vocabulary */
export interface Category {
  id: number;
  name: string;
  display_name: string;
  display_order: number;
  remote_id: string | null; // PocketBase record ID
  created_at: string;
}

/** A German verb stored in the local database */
export interface Verb {
  id: number;
  infinitive: string;
  /** 3rd person singular Präteritum form — doubles as the 1st person singular (ich/er) */
  past_tense: string | null;
  /** 2nd person singular Präteritum form (du) */
  past_du: string | null;
  /** 1st person plural Präteritum form (wir) */
  past_wir: string | null;
  /** 2nd person plural Präteritum form (ihr) */
  past_ihr: string | null;
  /** 3rd person plural Präteritum form (sie) */
  past_sie: string | null;
  past_participle: string | null;
  english: string | null;
  is_separable: number; // 0 or 1 (SQLite boolean)
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
  is_user_added: number; // 0 or 1 (SQLite boolean)
  created_at: string;
}

/** A German adjective stored in the local database (base/uninflected form) */
export interface Adjective {
  id: number;
  german: string;
  english: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
  is_user_added: number; // 0 or 1 (SQLite boolean)
  created_at: string;
}

/**
 * What a card_progress row tracks. A noun has two independent cards: 'noun'
 * for its article and 'noun_plural' for its plural ending (word_id = noun id).
 */
export type CardWordType = 'noun' | 'verb' | 'adjective' | 'noun_plural';

/** SM-2 spaced repetition progress for a single card */
export interface CardProgress {
  id: number;
  word_type: CardWordType;
  word_id: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string; // YYYY-MM-DD
  total_reviews: number;
  correct_reviews: number;
  last_reviewed_at: string | null;
  created_at: string;
}

/** A single review event recorded in history */
export interface ReviewHistoryEntry {
  id: number;
  card_progress_id: number;
  quality: number; // 0-5
  time_taken_ms: number | null;
  reviewed_at: string;
}

/** Key-value setting stored locally */
export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

/** Tracks which seed data versions have been applied */
export interface DataVersion {
  version: string;
  applied_at: string;
}

// ── SM-2 Algorithm Types ──────────────────────────────────────────────

/** Input/output shape for the SM-2 `calculateNextReview` function */
export interface CardReview {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string; // YYYY-MM-DD
}

// ── Query Result Types ────────────────────────────────────────────────

/** A card that is due for review, joined with its word data */
export interface DueCard extends CardProgress {
  word: string;
  article: string | null;
  english: string | null;
  translation_key: string | null;
  sense: string | null; // Disambiguation hint for homographs, null for most words
  remote_id: string | null;
  /** 1 if other nouns with the same German spelling exist; 0 otherwise */
  has_homograph_siblings: number;
  /**
   * Comma-separated list of distinct articles belonging to sibling nouns
   * (nouns with the same German spelling but a different id).
   * Null when there are no siblings.
   * Example: "die" for "der See" when "die See" also exists.
   */
  sibling_articles: string | null;
}

/** Aggregated user statistics */
export interface UserStats {
  total_cards: number;
  total_reviews: number;
  correct_reviews: number;
  success_rate: number | null;
  due_today: number;
}

/** A daily review session containing due cards and new cards */
export interface ReviewSession {
  cards: DueCard[];
  dueCount: number;
  newCount: number;
}

/** An adjective card that is due for review, joined with its word data */
export interface DueAdjectiveCard extends CardProgress {
  german: string;
  english: string;
}

/** An adjective declension review session containing due cards and new cards */
export interface AdjectiveReviewSession {
  cards: DueAdjectiveCard[];
  dueCount: number;
  newCount: number;
}

/** A verb card that is due for review, joined with its word data. All six
 * Präteritum forms are guaranteed non-null — the session query filters out
 * any verb missing one. */
export interface DueVerbCard extends CardProgress {
  infinitive: string;
  past_tense: string;
  past_du: string;
  past_wir: string;
  past_ihr: string;
  past_sie: string;
  english: string | null;
}

/** A verb Präteritum (simple past) review session containing due cards and new cards */
export interface VerbImperfectSession {
  cards: DueVerbCard[];
  dueCount: number;
  newCount: number;
}

/** A noun-plural card that is due for review, joined with its noun data.
 * `plural` is guaranteed non-empty — the session query filters out nouns
 * without one. */
export interface DuePluralCard extends CardProgress {
  german: string;
  article: 'der' | 'die' | 'das';
  plural: string;
  english: string | null;
  sense: string | null; // Disambiguation hint for homographs (die Bank: Bänke vs Banken)
  remote_id: string | null;
}

// ── Input Types ───────────────────────────────────────────────────────

/** A user-added noun joined with its category display name */
export interface UserNounWithCategory extends Noun {
  category_display_name: string;
}

/** Shape for adding a user-created noun */
export interface UserNounInput {
  german: string;
  article: 'der' | 'die' | 'das';
  category_id: number;
  plural?: string;
  english?: string;
}

/** Shape for adding a user-created verb */
export interface UserVerbInput {
  infinitive: string;
  past_tense: string;
  past_du?: string;
  past_wir?: string;
  past_ihr?: string;
  past_sie?: string;
  past_participle?: string;
  english?: string;
  is_separable?: boolean;
}

/** Valid category names for noun classification */
export type CategoryName =
  | 'people'
  | 'animals'
  | 'home'
  | 'furniture'
  | 'food'
  | 'body'
  | 'clothing'
  | 'nature'
  | 'places'
  | 'transportation'
  | 'time'
  | 'weather'
  | 'education'
  | 'money'
  | 'communication'
  | 'health'
  | 'colors'
  | 'general';

/** Shape for seed noun data */
export interface SeedNoun {
  german: string;
  article: 'der' | 'die' | 'das';
  plural: string | null;
  english: string;
  sense?: string | null; // Disambiguation hint for homographs (optional)
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  category: CategoryName;
}

/** Shape for seed category data */
export interface SeedCategory {
  name: string;
  display_name: string;
  display_order: number;
}

/** Shape for seed adjective data */
export interface SeedAdjective {
  german: string;
  english: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

/** Shape for seed verb data. All six Präteritum forms must be given
 * explicitly — strong/irregular verbs aren't grammatically derivable, and
 * even the regular personal endings have exceptions (epenthetic "-e-"
 * after stems ending in a dental or sibilant) that aren't worth deriving
 * automatically when getting it wrong would be silent. */
export interface SeedVerb {
  infinitive: string;
  /** 3rd person singular Präteritum form, e.g. "ging" for "gehen" — also used for 1st person singular (ich) */
  past_tense: string;
  /** 2nd person singular (du), e.g. "gingst" */
  past_du: string;
  /** 1st person plural (wir), e.g. "gingen" */
  past_wir: string;
  /** 2nd person plural (ihr), e.g. "gingt" */
  past_ihr: string;
  /** 3rd person plural (sie), e.g. "gingen" */
  past_sie: string;
  past_participle?: string;
  english: string;
  is_separable?: boolean;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

/** A correction to an existing noun in the database */
export interface NounCorrection {
  /** The German word to match (part of UNIQUE key) */
  german: string;
  /** The current article to match (part of UNIQUE key) */
  currentArticle: 'der' | 'die' | 'das';
  /**
   * Optionally narrow the target row by its current sense value.
   * - `null`  → target rows where sense IS NULL
   * - `string` → target rows where sense = that value
   * - omitted  → target any row with matching (german, article)
   */
  currentSense?: string | null;
  /** Fields to overwrite — only specify fields that need correction */
  corrections: {
    article?: 'der' | 'die' | 'das';
    plural?: string | null;
    english?: string;
    category?: CategoryName;
    sense?: string | null;
  };
}

/** A versioned batch of noun corrections */
export interface NounCorrectionVersion {
  version: string;
  corrections: NounCorrection[];
}

/** Migration definition */
export interface Migration {
  version: string;
  name: string;
  up: (db: import('expo-sqlite').SQLiteDatabase) => Promise<void>;
  down?: (db: import('expo-sqlite').SQLiteDatabase) => Promise<void>;
}

/** A single entry in the persistent migration event log */
export interface MigrationLogEntry {
  id: number;
  migration_version: string;
  event: 'started' | 'completed' | 'failed';
  error_message: string | null;
  duration_ms: number | null;
  logged_at: string;
}

/** Aggregated migration health report, readable from the migration_log table */
export interface MigrationDiagnostics {
  /** All log entries, newest first */
  log: MigrationLogEntry[];
  /** Migrations recorded in the migrations table */
  applied: { version: string; applied_at: string }[];
  /** Failed migration entries from the log */
  failures: MigrationLogEntry[];
  /** Number of migrations defined in code */
  expectedCount: number;
  /** Number of migrations recorded as applied */
  appliedCount: number;
  /** True if all expected migrations are applied and no failures are recorded */
  isHealthy: boolean;
}
