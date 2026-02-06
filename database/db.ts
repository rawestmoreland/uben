import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { runMigrations } from './migrations';
import { seedVocabulary } from './seed';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Return the singleton database connection.
 * Throws on web (SQLite is not supported there).
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not supported on web');
  }

  if (!db) {
    db = SQLite.openDatabaseSync('german_learning.db');
  }

  return db;
}

/**
 * Initialize the database: run migrations, then seed default vocabulary.
 * Safe to call multiple times (migrations and seeds are idempotent).
 */
export async function initializeDatabase(): Promise<void> {
  const database = getDatabase();

  // Enable WAL mode for better concurrent read performance
  await database.execAsync('PRAGMA journal_mode = WAL;');
  // Enable foreign key enforcement (off by default in SQLite)
  await database.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(database);
  await seedVocabulary(database);

  console.log('[DB] Database initialized successfully');
}

/**
 * Reset the database by dropping all tables and re-initializing.
 * Only available in development builds.
 */
export async function resetDatabase(): Promise<void> {
  if (!__DEV__) {
    console.warn('[DB] resetDatabase() is only available in development');
    return;
  }

  const database = getDatabase();

  await database.execAsync(`
    DROP TABLE IF EXISTS review_history;
    DROP TABLE IF EXISTS card_progress;
    DROP TABLE IF EXISTS verbs;
    DROP TABLE IF EXISTS nouns;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS data_versions;
    DROP TABLE IF EXISTS migrations;
  `);

  console.log('[DB] All tables dropped');

  await runMigrations(database);
  await seedVocabulary(database);

  console.log('[DB] Database reset complete');
}
