import type * as SQLite from 'expo-sqlite';
import type { Migration } from '@/types/database';

/**
 * All database migrations, ordered by version.
 * Each migration is applied at most once, tracked by the `migrations` table.
 */
export const migrations: Migration[] = [
  {
    version: '001',
    name: 'initial_schema',
    up: async (db: SQLite.SQLiteDatabase) => {
      // ── Nouns ───────────────────────────────────────────────────────
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS nouns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          german TEXT NOT NULL,
          article TEXT NOT NULL CHECK(article IN ('der', 'die', 'das')),
          plural TEXT,
          english TEXT,
          level TEXT CHECK(level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
          is_user_added BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(german, article)
        );
      `);
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_nouns_level ON nouns(level);',
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_nouns_user_added ON nouns(is_user_added);',
      );

      // ── Verbs ───────────────────────────────────────────────────────
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS verbs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          infinitive TEXT NOT NULL UNIQUE,
          past_tense TEXT,
          past_participle TEXT,
          english TEXT,
          is_separable BOOLEAN DEFAULT 0,
          level TEXT CHECK(level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
          is_user_added BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_verbs_level ON verbs(level);',
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_verbs_separable ON verbs(is_separable);',
      );

      // ── Card Progress (SM-2 spaced repetition) ─────────────────────
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS card_progress (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          word_type TEXT NOT NULL CHECK(word_type IN ('noun', 'verb')),
          word_id INTEGER NOT NULL,

          ease_factor REAL DEFAULT 2.5,
          interval INTEGER DEFAULT 0,
          repetitions INTEGER DEFAULT 0,
          next_review_date DATE DEFAULT CURRENT_DATE,

          total_reviews INTEGER DEFAULT 0,
          correct_reviews INTEGER DEFAULT 0,
          last_reviewed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

          UNIQUE(word_type, word_id)
        );
      `);
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_card_progress_next_review ON card_progress(next_review_date);',
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_card_progress_word ON card_progress(word_type, word_id);',
      );

      // ── Review History ──────────────────────────────────────────────
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS review_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          card_progress_id INTEGER NOT NULL,
          quality INTEGER NOT NULL CHECK(quality BETWEEN 0 AND 5),
          time_taken_ms INTEGER,
          reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (card_progress_id) REFERENCES card_progress(id) ON DELETE CASCADE
        );
      `);
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_review_history_card ON review_history(card_progress_id);',
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_review_history_date ON review_history(reviewed_at);',
      );

      // ── Settings (key-value store) ──────────────────────────────────
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // ── Data Versions (seed data tracking) ──────────────────────────
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS data_versions (
          version TEXT PRIMARY KEY,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    },
    down: async (db: SQLite.SQLiteDatabase) => {
      await db.execAsync(`
        DROP TABLE IF EXISTS review_history;
        DROP TABLE IF EXISTS card_progress;
        DROP TABLE IF EXISTS verbs;
        DROP TABLE IF EXISTS nouns;
        DROP TABLE IF EXISTS settings;
        DROP TABLE IF EXISTS data_versions;
      `);
    },
  },
];

/**
 * Run all pending migrations in order.
 * Creates the `migrations` tracking table if it doesn't exist.
 */
export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // Ensure the migrations tracking table exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const migration of migrations) {
    const exists = await db.getFirstAsync<{ '1': number }>(
      'SELECT 1 FROM migrations WHERE version = ?',
      [migration.version],
    );

    if (!exists) {
      console.log(
        `[DB] Running migration ${migration.version}: ${migration.name}`,
      );
      await migration.up(db);
      await db.runAsync('INSERT INTO migrations (version) VALUES (?)', [
        migration.version,
      ]);
      console.log(`[DB] Migration ${migration.version} applied successfully`);
    }
  }
}
