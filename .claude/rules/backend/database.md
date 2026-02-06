# Database Rules (SQLite)

## Context

Local-first SQLite database using expo-sqlite. All data stored on-device. No backend, no cloud sync (for now).

## Database Setup

### Initialization

```typescript
import * as SQLite from 'expo-sqlite';

// Open/create database
const db = SQLite.openDatabaseSync('german_learning.db');

// Run migrations on app start
await runMigrations(db);
```

### Platform Support

- ✅ iOS: Full SQLite support
- ✅ Android: Full SQLite support
- ❌ Web: SQLite NOT supported (skip for v1)

## Schema Design

### Core Tables

#### Nouns

```sql
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

CREATE INDEX idx_nouns_level ON nouns(level);
CREATE INDEX idx_nouns_user_added ON nouns(is_user_added);
```

#### Verbs

```sql
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

CREATE INDEX idx_verbs_level ON verbs(level);
CREATE INDEX idx_verbs_separable ON verbs(is_separable);
```

#### Card Progress (Spaced Repetition)

```sql
CREATE TABLE IF NOT EXISTS card_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_type TEXT NOT NULL CHECK(word_type IN ('noun', 'verb')),
  word_id INTEGER NOT NULL,

  -- SM-2 algorithm fields
  ease_factor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  next_review_date DATE DEFAULT CURRENT_DATE,

  -- Statistics
  total_reviews INTEGER DEFAULT 0,
  correct_reviews INTEGER DEFAULT 0,
  last_reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(word_type, word_id)
);

CREATE INDEX idx_card_progress_next_review ON card_progress(next_review_date);
CREATE INDEX idx_card_progress_word ON card_progress(word_type, word_id);
```

#### Review History

```sql
CREATE TABLE IF NOT EXISTS review_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_progress_id INTEGER NOT NULL,
  quality INTEGER NOT NULL CHECK(quality BETWEEN 0 AND 5),
  time_taken_ms INTEGER,
  reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_progress_id) REFERENCES card_progress(id) ON DELETE CASCADE
);

CREATE INDEX idx_review_history_card ON review_history(card_progress_id);
CREATE INDEX idx_review_history_date ON review_history(reviewed_at);
```

#### Settings

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Data Versions (Migration Tracking)

```sql
CREATE TABLE IF NOT EXISTS data_versions (
  version TEXT PRIMARY KEY,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Strategy

### Migration Files

Structure: `/database/migrations/001_initial_schema.ts`

```typescript
export const migrations = [
  {
    version: '001',
    name: 'initial_schema',
    up: async (db: SQLite.SQLiteDatabase) => {
      // Create tables
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS nouns (...)
      `);
    },
    down: async (db: SQLite.SQLiteDatabase) => {
      // Rollback (optional, rarely used in SQLite mobile apps)
      await db.execAsync('DROP TABLE IF EXISTS nouns');
    },
  },
  // Add more migrations as needed
];
```

### Running Migrations

```typescript
// database/migrations.ts
export async function runMigrations(db: SQLite.SQLiteDatabase) {
  // Create migrations table if not exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const migration of migrations) {
    const exists = await db.getFirstAsync(
      'SELECT 1 FROM migrations WHERE version = ?',
      [migration.version],
    );

    if (!exists) {
      console.log(`Running migration ${migration.version}: ${migration.name}`);
      await migration.up(db);
      await db.runAsync('INSERT INTO migrations (version) VALUES (?)', [
        migration.version,
      ]);
    }
  }
}
```

## Data Seeding

### Seed Data Structure

```typescript
// database/seeds/a1_nouns.ts
export const a1Nouns = [
  {
    german: 'Hund',
    article: 'der',
    plural: 'Hunde',
    english: 'dog',
    level: 'A1',
  },
  {
    german: 'Katze',
    article: 'die',
    plural: 'Katzen',
    english: 'cat',
    level: 'A1',
  },
  {
    german: 'Haus',
    article: 'das',
    plural: 'Häuser',
    english: 'house',
    level: 'A1',
  },
  // ... more A1 nouns
];
```

### Seeding Function

```typescript
// database/seed.ts
export async function seedVocabulary(db: SQLite.SQLiteDatabase) {
  const version = '1.0.0_a1_nouns';

  const exists = await db.getFirstAsync(
    'SELECT 1 FROM data_versions WHERE version = ?',
    [version],
  );

  if (!exists) {
    console.log('Seeding A1 nouns...');

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

    console.log(`Seeded ${a1Nouns.length} A1 nouns`);
  }
}
```

## Query Patterns

### Prepared Statements (Safer)

```typescript
// ✅ GOOD: Use prepared statements
const noun = await db.getFirstAsync('SELECT * FROM nouns WHERE id = ?', [
  nounId,
]);

// ❌ BAD: String interpolation (SQL injection risk)
const noun = await db.getFirstAsync(`SELECT * FROM nouns WHERE id = ${nounId}`);
```

### Common Queries

#### Get Due Cards for Review

```typescript
export async function getDueCards(
  db: SQLite.SQLiteDatabase,
  limit: number = 20,
) {
  return await db.getAllAsync(
    `
    SELECT 
      cp.*,
      CASE 
        WHEN cp.word_type = 'noun' THEN n.german
        WHEN cp.word_type = 'verb' THEN v.infinitive
      END as word,
      CASE
        WHEN cp.word_type = 'noun' THEN n.article
      END as article
    FROM card_progress cp
    LEFT JOIN nouns n ON cp.word_type = 'noun' AND cp.word_id = n.id
    LEFT JOIN verbs v ON cp.word_type = 'verb' AND cp.word_id = v.id
    WHERE cp.next_review_date <= date('now')
    ORDER BY cp.next_review_date ASC
    LIMIT ?
  `,
    [limit],
  );
}
```

#### Get Random New Words

```typescript
export async function getRandomNewWords(
  db: SQLite.SQLiteDatabase,
  level: string,
  count: number = 10,
) {
  return await db.getAllAsync(
    `
    SELECT n.* 
    FROM nouns n
    LEFT JOIN card_progress cp 
      ON cp.word_type = 'noun' AND cp.word_id = n.id
    WHERE n.level = ? AND cp.id IS NULL
    ORDER BY RANDOM()
    LIMIT ?
  `,
    [level, count],
  );
}
```

#### Update Card Progress

```typescript
export async function updateCardProgress(
  db: SQLite.SQLiteDatabase,
  cardId: number,
  updates: {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReviewDate: string;
  },
) {
  await db.runAsync(
    `
    UPDATE card_progress
    SET 
      ease_factor = ?,
      interval = ?,
      repetitions = ?,
      next_review_date = ?,
      total_reviews = total_reviews + 1,
      correct_reviews = correct_reviews + ?,
      last_reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
    [
      updates.easeFactor,
      updates.interval,
      updates.repetitions,
      updates.nextReviewDate,
      updates.repetitions > 0 ? 1 : 0, // Increment correct if reps increased
      cardId,
    ],
  );
}
```

#### Add User Word

```typescript
export async function addUserNoun(
  db: SQLite.SQLiteDatabase,
  noun: { german: string; article: string; plural?: string; english?: string },
) {
  try {
    const result = await db.runAsync(
      `INSERT INTO nouns (german, article, plural, english, is_user_added)
       VALUES (?, ?, ?, ?, 1)`,
      [noun.german, noun.article, noun.plural || null, noun.english || null],
    );
    return { success: true, id: result.lastInsertRowId };
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint')) {
      return {
        success: false,
        error: 'This word already exists in the database',
      };
    }
    throw error;
  }
}
```

#### Get User Statistics

```typescript
export async function getUserStats(db: SQLite.SQLiteDatabase) {
  const stats = await db.getFirstAsync(`
    SELECT 
      COUNT(*) as total_cards,
      SUM(total_reviews) as total_reviews,
      SUM(correct_reviews) as correct_reviews,
      ROUND(100.0 * SUM(correct_reviews) / NULLIF(SUM(total_reviews), 0), 1) as success_rate,
      COUNT(CASE WHEN next_review_date <= date('now') THEN 1 END) as due_today
    FROM card_progress
  `);

  return stats;
}
```

## Database Service Pattern

### Centralized Database Access

```typescript
// database/db.ts
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (Platform.OS === 'web') {
    throw new Error('SQLite not supported on web');
  }

  if (!db) {
    db = SQLite.openDatabaseSync('german_learning.db');
  }

  return db;
}

export async function initializeDatabase() {
  const database = getDatabase();
  await runMigrations(database);
  await seedVocabulary(database);
}
```

### Service Layer

```typescript
// services/vocabularyService.ts
import { getDatabase } from '@/database/db';

export class VocabularyService {
  private db = getDatabase();

  async getDueCards(limit: number = 20) {
    return getDueCards(this.db, limit);
  }

  async addUserNoun(noun: UserNoun) {
    return addUserNoun(this.db, noun);
  }

  // ... more methods
}

// Export singleton instance
export const vocabularyService = new VocabularyService();
```

## Error Handling

### Database Errors

```typescript
try {
  await db.runAsync('INSERT INTO nouns ...');
} catch (error: any) {
  if (error.message?.includes('UNIQUE constraint')) {
    // Handle duplicate
  } else if (error.message?.includes('NOT NULL constraint')) {
    // Handle missing required field
  } else {
    // Log and rethrow
    console.error('Database error:', error);
    throw new Error('Failed to save word');
  }
}
```

### Transaction Support

```typescript
export async function addWordWithProgress(
  db: SQLite.SQLiteDatabase,
  word: NewWord,
) {
  await db.withTransactionAsync(async () => {
    // Insert word
    const result = await db.runAsync(
      'INSERT INTO nouns (german, article, ...) VALUES (?, ?, ...)',
      [word.german, word.article],
    );

    // Create initial progress card
    await db.runAsync(
      'INSERT INTO card_progress (word_type, word_id) VALUES (?, ?)',
      ['noun', result.lastInsertRowId],
    );
  });
}
```

## Performance Tips

### Indexing

- ✅ Index foreign keys
- ✅ Index columns used in WHERE clauses
- ✅ Index columns used in ORDER BY
- ❌ Don't over-index (slows writes)

### Batch Operations

```typescript
// ✅ GOOD: Batch inserts
await db.withTransactionAsync(async () => {
  for (const noun of nouns) {
    await db.runAsync('INSERT INTO nouns ...', [...]);
  }
});

// ❌ BAD: Individual inserts
for (const noun of nouns) {
  await db.runAsync('INSERT INTO nouns ...', [...]);
}
```

### Query Optimization

- Use `LIMIT` for large result sets
- Use `COUNT(*)` efficiently (don't fetch all rows)
- Use indexes on frequently queried columns
- Avoid `SELECT *` when you only need specific columns

## Testing Database Code

### Reset Database (Dev Only)

```typescript
export async function resetDatabase(db: SQLite.SQLiteDatabase) {
  if (__DEV__) {
    await db.execAsync(`
      DROP TABLE IF EXISTS nouns;
      DROP TABLE IF EXISTS verbs;
      DROP TABLE IF EXISTS card_progress;
      DROP TABLE IF EXISTS review_history;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS migrations;
      DROP TABLE IF EXISTS data_versions;
    `);
    await runMigrations(db);
    await seedVocabulary(db);
  }
}
```

### Test Data

- Keep test seed data separate from production
- Use `is_user_added = 1` flag for test data
- Easy to clear: `DELETE FROM nouns WHERE is_user_added = 1`

## Backup & Export (Future Feature)

### Export User Data

```typescript
export async function exportUserData(db: SQLite.SQLiteDatabase) {
  const userData = {
    userNouns: await db.getAllAsync(
      'SELECT * FROM nouns WHERE is_user_added = 1',
    ),
    userVerbs: await db.getAllAsync(
      'SELECT * FROM verbs WHERE is_user_added = 1',
    ),
    progress: await db.getAllAsync('SELECT * FROM card_progress'),
    settings: await db.getAllAsync('SELECT * FROM settings'),
  };

  return JSON.stringify(userData, null, 2);
}
```

## Rules Summary

### Do's

- ✅ Use prepared statements (parameterized queries)
- ✅ Use transactions for multi-step operations
- ✅ Handle UNIQUE constraint violations gracefully
- ✅ Index frequently queried columns
- ✅ Use `INSERT OR IGNORE` for idempotent operations
- ✅ Keep queries in service layer, not components
- ✅ Version migrations and seed data
- ✅ Log database operations in development

### Don'ts

- ❌ Never use string interpolation for queries (SQL injection)
- ❌ Don't run migrations in production without testing
- ❌ Don't delete user data without confirmation
- ❌ Don't over-normalize (keep it simple)
- ❌ Don't use SQLite on web (not supported)
- ❌ Don't put database logic in React components
- ❌ Don't forget to handle errors
- ❌ Don't commit seed data with real user info
