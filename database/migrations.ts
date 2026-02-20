import type { Migration } from '@/types/database';
import type * as SQLite from 'expo-sqlite';

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
  {
    version: '002',
    name: 'add_categories',
    up: async (db: SQLite.SQLiteDatabase) => {
      // ── Categories ──────────────────────────────────────────────────
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          display_order INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);',
      );

      // ── Add category_id column to nouns ─────────────────────────────
      // SQLite doesn't support ADD COLUMN with foreign key constraint,
      // so we add it nullable first, then enforce NOT NULL after data migration
      await db.execAsync(`
        ALTER TABLE nouns ADD COLUMN category_id INTEGER;
      `);

      // Create index for category filtering
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_nouns_category ON nouns(category_id);',
      );

      // Note: Categories will be seeded via seed.ts
      // Note: NOT NULL constraint and foreign key will be enforced after seeding
    },
    down: async (db: SQLite.SQLiteDatabase) => {
      // Recreate nouns table without category_id column
      await db.execAsync(`
        CREATE TABLE nouns_backup AS SELECT
          id, german, article, plural, english, level, is_user_added, created_at
        FROM nouns;
      `);

      await db.execAsync('DROP TABLE nouns;');

      await db.execAsync(`
        CREATE TABLE nouns (
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

      await db.execAsync(`
        INSERT INTO nouns
        SELECT * FROM nouns_backup;
      `);

      await db.execAsync('DROP TABLE nouns_backup;');

      // Recreate original indexes
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_nouns_level ON nouns(level);',
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_nouns_user_added ON nouns(is_user_added);',
      );

      // Drop categories table
      await db.execAsync('DROP TABLE IF EXISTS categories;');
    },
  },
  {
    version: '003',
    name: 'add_remote_id',
    up: async (db: SQLite.SQLiteDatabase) => {
      console.log('[Migration 003] Adding remote_id columns...');

      // Add remote_id column to categories
      try {
        await db.execAsync('ALTER TABLE categories ADD COLUMN remote_id TEXT;');
        await db.execAsync(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_remote_id ON categories(remote_id) WHERE remote_id IS NOT NULL;',
        );
        console.log('[Migration 003] Added remote_id to categories');
      } catch (error) {
        console.error(
          '[Migration 003] Failed to add remote_id to categories:',
          error,
        );
        throw error;
      }

      // Add remote_id column to nouns
      try {
        await db.execAsync('ALTER TABLE nouns ADD COLUMN remote_id TEXT;');
        await db.execAsync(
          'CREATE UNIQUE INDEX IF NOT EXISTS idx_nouns_remote_id ON nouns(remote_id) WHERE remote_id IS NOT NULL;',
        );
        console.log('[Migration 003] Added remote_id to nouns');
      } catch (error) {
        console.error(
          '[Migration 003] Failed to add remote_id to nouns:',
          error,
        );
        throw error;
      }

      console.log('[Migration 003] Complete');
    },
    down: async (db: SQLite.SQLiteDatabase) => {
      // SQLite doesn't support DROP COLUMN before 3.35.0, so just drop indexes
      await db.execAsync('DROP INDEX IF EXISTS idx_nouns_remote_id;');
      await db.execAsync('DROP INDEX IF EXISTS idx_categories_remote_id;');
    },
  },
  {
    version: '004',
    name: 'canonical_nouns_schema',
    up: async (db: SQLite.SQLiteDatabase) => {
      console.log(
        '[Migration 004] Rebuilding nouns table with canonical schema...',
      );

      // Fix any null category_ids before enforcing NOT NULL
      const generalCat = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM categories WHERE name = ?',
        ['general'],
      );
      if (generalCat) {
        await db.runAsync(
          'UPDATE nouns SET category_id = ? WHERE category_id IS NULL',
          [generalCat.id],
        );
      }

      // Create the authoritative nouns table with all columns defined
      await db.execAsync(`
        CREATE TABLE nouns_v4 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          german TEXT NOT NULL,
          article TEXT NOT NULL CHECK(article IN ('der', 'die', 'das')),
          plural TEXT,
          english TEXT,
          translation_key TEXT,
          level TEXT CHECK(level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
          category_id INTEGER NOT NULL,
          remote_id TEXT,
          is_user_added BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(german, article),
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
        );
      `);

      // Copy data — try including remote_id first; fall back if column doesn't exist
      // (handles the edge case where migration 003 ran but then seed dropped the column)
      try {
        await db.execAsync(`
          INSERT INTO nouns_v4 (id, german, article, plural, english, level, category_id, remote_id, is_user_added, created_at)
          SELECT id, german, article, plural, english, level, category_id, remote_id, is_user_added, created_at
          FROM nouns;
        `);
      } catch {
        // remote_id column doesn't exist in source table — copy without it
        await db.execAsync(`
          INSERT INTO nouns_v4 (id, german, article, plural, english, level, category_id, is_user_added, created_at)
          SELECT id, german, article, plural, english, level, category_id, is_user_added, created_at
          FROM nouns;
        `);
      }

      // Swap tables
      await db.execAsync('DROP TABLE nouns;');
      await db.execAsync('ALTER TABLE nouns_v4 RENAME TO nouns;');

      // Recreate all indexes
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_nouns_level ON nouns(level);',
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_nouns_user_added ON nouns(is_user_added);',
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_nouns_category ON nouns(category_id);',
      );
      await db.execAsync(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_nouns_remote_id ON nouns(remote_id) WHERE remote_id IS NOT NULL;',
      );

      // Pre-mark the seeding step so enforceNounCategoryConstraint is a no-op
      await db.runAsync(
        'INSERT OR IGNORE INTO data_versions (version) VALUES (?)',
        ['2.0.1_noun_category_not_null'],
      );

      console.log('[Migration 004] Complete');
    },
    down: async (db: SQLite.SQLiteDatabase) => {
      await db.execAsync('DROP INDEX IF EXISTS idx_nouns_remote_id;');
    },
  },
  {
    version: '005',
    name: 'add_translation_key',
    up: async (db: SQLite.SQLiteDatabase) => {
      // For users who already have migration 004 applied (which created nouns_v4
      // without translation_key), we need to add the column via ALTER TABLE.
      // New installs already have it from nouns_v4, so the ALTER is a no-op for them.
      try {
        await db.execAsync(
          'ALTER TABLE nouns ADD COLUMN translation_key TEXT;',
        );
      } catch {
        // Column already exists (fresh install: nouns_v4 in migration 004 includes it)
      }
    },
    down: async (_db: SQLite.SQLiteDatabase) => {
      // SQLite cannot drop columns without a full table rebuild; seeds repopulate
      // this column so leaving it in place on rollback is acceptable.
    },
  },
  {
    version: '006',
    name: 'add_noun_translations_table',
    up: async (db: SQLite.SQLiteDatabase) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS noun_translations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          remote_id TEXT NOT NULL,
          noun_id TEXT NOT NULL,
          locale TEXT NOT NULL,
          translation TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(noun_id, locale)
        );
      `);
    },
    down: async (_db: SQLite.SQLiteDatabase) => {
      await _db.execAsync('DROP TABLE IF EXISTS noun_translations;');
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
