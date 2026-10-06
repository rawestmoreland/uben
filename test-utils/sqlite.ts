/// <reference types="jest" />
// Test-only helper: a real in-memory SQLite database (Node's built-in
// `node:sqlite`, Node 22.5+) wrapped in the subset of the expo-sqlite async
// API the app uses, so migrations and service queries can be run for real
// instead of against hand-written mocks. Never imported by app code.

interface NodeSqliteStatement {
  run(...params: unknown[]): {
    lastInsertRowid: number | bigint;
    changes: number | bigint;
  };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

export interface NodeSqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeSqliteStatement;
  close(): void;
}

type DatabaseSyncConstructor = new (path: string) => NodeSqliteDatabase;

function loadDatabaseSync(): DatabaseSyncConstructor | null {
  try {
    return jest.requireActual('node:sqlite').DatabaseSync;
  } catch {
    return null;
  }
}

const DatabaseSync = loadDatabaseSync();

/** `describe` when node:sqlite is available, `describe.skip` on older Node. */
export const describeWithSqlite = DatabaseSync ? describe : describe.skip;

/**
 * Open an in-memory database. Foreign keys are turned on to mirror
 * initializeDatabase(). `raw` is the synchronous node:sqlite handle for
 * test setup and assertions; `db` is the expo-sqlite-shaped async wrapper
 * to hand to app code (cast with `as any`).
 */
export function openTestDatabase() {
  if (!DatabaseSync) {
    throw new Error('node:sqlite is not available on this Node version');
  }

  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');

  const db = {
    execAsync: async (sql: string) => raw.exec(sql),
    runAsync: async (sql: string, params: unknown[] = []) => {
      const result = raw.prepare(sql).run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: Number(result.changes),
      };
    },
    getFirstAsync: async <T>(sql: string, params: unknown[] = []) =>
      (raw.prepare(sql).get(...params) as T | undefined) ?? null,
    getAllAsync: async <T>(sql: string, params: unknown[] = []) =>
      raw.prepare(sql).all(...params) as T[],
    withTransactionAsync: async (task: () => Promise<void>) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
  };

  return { raw, db };
}
