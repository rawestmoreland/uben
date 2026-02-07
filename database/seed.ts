import type * as SQLite from 'expo-sqlite';
import { a1Nouns } from './seeds/a1-nouns';
import { categories, nounCategoryMap } from './seeds/categories';

/**
 * Seed the database with vocabulary and categories.
 * Uses the `data_versions` table to ensure each seed set is only applied once.
 * Categories must be seeded before nouns for foreign key relationships.
 */
export async function seedVocabulary(
  db: SQLite.SQLiteDatabase,
): Promise<void> {
  // Seed categories first (required for foreign key relationships)
  await seedCategories(db, '2.0.0_categories');

  // Seed A1 nouns with category assignments
  await seedA1Nouns(db, '1.0.0_a1_nouns');
  await seedA1Nouns(db, '1.1.0_a1_nouns_expanded');
  await seedA1Nouns(db, '1.2.0_a1_nouns_full');

  // Enforce NOT NULL constraint on category_id after all nouns have categories
  await enforceNounCategoryConstraint(db, '2.0.1_noun_category_not_null');
}

/**
 * Seed categories table.
 */
async function seedCategories(
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

  console.log(`[DB] Seeding categories (${version})...`);

  await db.withTransactionAsync(async () => {
    for (const category of categories) {
      await db.runAsync(
        `INSERT OR IGNORE INTO categories (name, display_name, display_order)
         VALUES (?, ?, ?)`,
        [category.name, category.display_name, category.display_order],
      );
    }

    await db.runAsync('INSERT INTO data_versions (version) VALUES (?)', [
      version,
    ]);
  });

  console.log(`[DB] Seeded ${categories.length} categories`);
}

/**
 * Inserts all A1 nouns with category assignments.
 * Uses INSERT OR IGNORE so only genuinely new rows are added.
 * Resolves category IDs from category names using nounCategoryMap.
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

  console.log(`[DB] Seeding A1 nouns with categories (${version})...`);

  // Pre-fetch category ID mappings for efficiency
  const categoryMap = new Map<string, number>();
  for (const categoryName of new Set(Object.values(nounCategoryMap))) {
    const category = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE name = ?',
      [categoryName],
    );
    if (category) {
      categoryMap.set(categoryName, category.id);
    }
  }

  await db.withTransactionAsync(async () => {
    for (const noun of a1Nouns) {
      const categoryName = nounCategoryMap[noun.german];
      const categoryId = categoryName ? categoryMap.get(categoryName) : null;

      if (!categoryId) {
        console.warn(
          `[DB] No category mapping found for noun "${noun.german}", skipping`,
        );
        continue;
      }

      await db.runAsync(
        `INSERT OR IGNORE INTO nouns (german, article, plural, english, level, category_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          noun.german,
          noun.article,
          noun.plural,
          noun.english,
          noun.level,
          categoryId,
        ],
      );
    }

    await db.runAsync('INSERT INTO data_versions (version) VALUES (?)', [
      version,
    ]);
  });

  console.log(
    `[DB] Seeded A1 nouns (${version}), ${a1Nouns.length} entries processed`,
  );
}

/**
 * Enforce NOT NULL constraint on category_id after data migration.
 * This recreates the nouns table with proper foreign key constraint.
 */
async function enforceNounCategoryConstraint(
  db: SQLite.SQLiteDatabase,
  version: string,
): Promise<void> {
  const exists = await db.getFirstAsync<{ '1': number }>(
    'SELECT 1 FROM data_versions WHERE version = ?',
    [version],
  );

  if (exists) {
    return; // Already applied
  }

  console.log('[DB] Enforcing NOT NULL constraint on nouns.category_id...');

  await db.withTransactionAsync(async () => {
    // Check if any nouns lack a category
    const orphanedCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM nouns WHERE category_id IS NULL',
    );

    if (orphanedCount && orphanedCount.count > 0) {
      console.warn(
        `[DB] Found ${orphanedCount.count} nouns without categories. Assigning to 'general'...`,
      );

      const generalCategory = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM categories WHERE name = ?',
        ['general'],
      );

      if (generalCategory) {
        await db.runAsync(
          'UPDATE nouns SET category_id = ? WHERE category_id IS NULL',
          [generalCategory.id],
        );
      }
    }

    // Recreate nouns table with NOT NULL constraint and foreign key
    await db.execAsync(`
      CREATE TABLE nouns_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        german TEXT NOT NULL,
        article TEXT NOT NULL CHECK(article IN ('der', 'die', 'das')),
        plural TEXT,
        english TEXT,
        level TEXT CHECK(level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
        category_id INTEGER NOT NULL,
        is_user_added BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(german, article),
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
      );
    `);

    // Copy data
    await db.execAsync(`
      INSERT INTO nouns_new
      SELECT * FROM nouns;
    `);

    // Drop old table and rename new
    await db.execAsync('DROP TABLE nouns;');
    await db.execAsync('ALTER TABLE nouns_new RENAME TO nouns;');

    // Recreate indexes
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_nouns_level ON nouns(level);',
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_nouns_user_added ON nouns(is_user_added);',
    );
    await db.execAsync(
      'CREATE INDEX IF NOT EXISTS idx_nouns_category ON nouns(category_id);',
    );

    // Mark as applied
    await db.runAsync('INSERT INTO data_versions (version) VALUES (?)', [
      version,
    ]);
  });

  console.log('[DB] NOT NULL constraint enforced on nouns.category_id');
}
