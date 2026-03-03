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
  locale: 'en' | 'it' | 'pl';
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
  past_tense: string | null;
  past_participle: string | null;
  english: string | null;
  is_separable: number; // 0 or 1 (SQLite boolean)
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
  is_user_added: number; // 0 or 1 (SQLite boolean)
  created_at: string;
}

/** SM-2 spaced repetition progress for a single card */
export interface CardProgress {
  id: number;
  word_type: 'noun' | 'verb';
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

/** A correction to an existing noun in the database */
export interface NounCorrection {
  /** The German word to match (part of UNIQUE key) */
  german: string;
  /** The current article to match (part of UNIQUE key) */
  currentArticle: 'der' | 'die' | 'das';
  /** Fields to overwrite — only specify fields that need correction */
  corrections: {
    article?: 'der' | 'die' | 'das';
    plural?: string | null;
    english?: string;
    category?: CategoryName;
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
