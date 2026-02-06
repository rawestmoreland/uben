import type * as SQLite from 'expo-sqlite';
import { a1Nouns } from './seeds/a1-nouns';

/**
 * Seed the database with vocabulary.
 * Uses the `data_versions` table to ensure each seed set is only applied once.
 * New seed versions will insert additional words without duplicating existing ones.
 */
export async function seedVocabulary(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  await seedA1Nouns(db, '1.0.0_a1_nouns');
  await seedA1Nouns(db, '1.1.0_a1_nouns_expanded');
  await seedA1Nouns(db, '1.2.0_a1_nouns_full');
}

/**
 * Inserts all A1 nouns if the given version has not been applied yet.
 * Uses INSERT OR IGNORE so only genuinely new rows are added.
 */
async function seedA1Nouns(
  db: SQLite.SQLiteDatabase,
  version: string,
): Promise<void> {
  const exists = await db.getFirstAsync<{ '1': number }>(
    'SELECT 1 FROM data_versions WHERE version = ?',
    [version],
  );

  if (exists) {
    return; // Already seeded
  }

  console.log(`[DB] Seeding A1 nouns (${version})...`);

  await db.withTransactionAsync(async () => {
    for (const noun of a1Nouns) {
      await db.runAsync(
        `INSERT OR IGNORE INTO nouns (german, article, plural, english, level)
         VALUES (?, ?, ?, ?, ?)`,
        [noun.german, noun.article, noun.plural, noun.english, noun.level],
      );
    }

    await db.runAsync('INSERT INTO data_versions (version) VALUES (?)', [
      version,
    ]);
  });

  console.log(`[DB] Seeded A1 nouns (${version}), ${a1Nouns.length} entries processed`);
}
