import type * as SQLite from 'expo-sqlite';
import { categories } from './seeds/categories';
import { nounSeedVersions } from './seeds/nouns';

/**
 * Seed the database with vocabulary and categories.
 * Uses the `data_versions` table to ensure each seed set is only applied once.
 * Categories must be seeded before nouns for foreign key relationships.
 */
export async function seedVocabulary(db: SQLite.SQLiteDatabase): Promise<void> {
  // Seed categories first (required for foreign key relationships)
  await seedCategories(db, '2.0.0_categories');

  // Bridge legacy versioning system to new versioned-file approach
  await markLegacyVersions(db);

  // Seed nouns from versioned seed files (each version contains only its new words)
  await seedNounVersions(db);

  // Safety net: backfill categories for any orphaned nouns
  await backfillNounCategories(db, '2.0.0_backfill_noun_categories');

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

// Legacy versions from the old seeding system (all pointed at the same full noun list)
const LEGACY_NOUN_VERSIONS = [
  '1.0.0_a1_nouns',
  '1.1.0_a1_nouns_expanded',
  '1.2.0_a1_nouns_full',
];

/**
 * Bridge the old (v1.x) and new (v3.x) versioning systems so that:
 * - Existing users (who have legacy versions): mark new v3 versions as applied
 *   since they already have all the nouns.
 * - New users (empty data_versions): mark legacy versions as applied so the
 *   old code paths are never triggered, then let seedNounVersions handle seeding.
 */
async function markLegacyVersions(db: SQLite.SQLiteDatabase): Promise<void> {
  const hasLegacy = await db.getFirstAsync<{ '1': number }>(
    'SELECT 1 FROM data_versions WHERE version = ?',
    [LEGACY_NOUN_VERSIONS[0]],
  );

  if (hasLegacy) {
    // Existing user: they already have all nouns from the legacy system.
    // Mark each new versioned seed as applied so seedNounVersions skips them.
    for (const seedVersion of nounSeedVersions) {
      const alreadyMarked = await db.getFirstAsync<{ '1': number }>(
        'SELECT 1 FROM data_versions WHERE version = ?',
        [seedVersion.version],
      );
      if (!alreadyMarked) {
        await db.runAsync('INSERT INTO data_versions (version) VALUES (?)', [
          seedVersion.version,
        ]);
        console.log(
          `[DB] Marked ${seedVersion.version} as applied (existing user, data already present)`,
        );
      }
    }
    return;
  }

  // New user: mark legacy versions as applied so they are never re-triggered
  // by any residual code path. The actual seeding happens in seedNounVersions.
  for (const legacyVersion of LEGACY_NOUN_VERSIONS) {
    const alreadyMarked = await db.getFirstAsync<{ '1': number }>(
      'SELECT 1 FROM data_versions WHERE version = ?',
      [legacyVersion],
    );
    if (!alreadyMarked) {
      await db.runAsync('INSERT INTO data_versions (version) VALUES (?)', [
        legacyVersion,
      ]);
    }
  }
}

/**
 * Seed nouns from versioned seed files.
 * Each version contains only the nouns introduced in that release.
 * Uses UPSERT to preserve existing row IDs (and thus card_progress references).
 */
async function seedNounVersions(db: SQLite.SQLiteDatabase): Promise<void> {
  // Pre-fetch all category name→ID mappings in one pass
  const categoryIdMap = new Map<string, number>();
  const allCategories = await db.getAllAsync<{ id: number; name: string }>(
    'SELECT id, name FROM categories',
  );
  for (const cat of allCategories) {
    categoryIdMap.set(cat.name, cat.id);
  }

  for (const seedVersion of nounSeedVersions) {
    const exists = await db.getFirstAsync<{ '1': number }>(
      'SELECT 1 FROM data_versions WHERE version = ?',
      [seedVersion.version],
    );

    if (exists) {
      continue; // Already applied
    }

    console.log(
      `[DB] Seeding nouns (${seedVersion.version}), ${seedVersion.nouns.length} entries...`,
    );

    await db.withTransactionAsync(async () => {
      for (const noun of seedVersion.nouns) {
        const categoryId = categoryIdMap.get(noun.category);

        if (!categoryId) {
          console.warn(
            `[DB] Unknown category "${noun.category}" for noun "${noun.german}", skipping`,
          );
          continue;
        }

        await db.runAsync(
          `INSERT INTO nouns (german, article, plural, english, level, category_id, is_user_added)
           VALUES (?, ?, ?, ?, ?, ?, 0)
           ON CONFLICT(german, article) DO UPDATE SET
             level = COALESCE(nouns.level, excluded.level),
             english = COALESCE(nouns.english, excluded.english),
             plural = COALESCE(nouns.plural, excluded.plural),
             category_id = CASE
               WHEN nouns.category_id IS NULL THEN excluded.category_id
               ELSE nouns.category_id
             END,
             is_user_added = 0`,
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
        seedVersion.version,
      ]);
    });

    console.log(
      `[DB] Seeded nouns (${seedVersion.version}), ${seedVersion.nouns.length} entries processed`,
    );
  }
}

// Legacy noun→category mapping, used only by backfillNounCategories as a safety net.
// This data is inlined in v1-initial.ts for new users; this constant exists solely
// to handle the (unlikely) case of orphaned nouns from very old app versions.
const LEGACY_NOUN_CATEGORY_MAP: Record<string, string> = {
  // People & Family
  Mann: 'people',
  Frau: 'people',
  Kind: 'people',
  Junge: 'people',
  Mädchen: 'people',
  Freund: 'people',
  Freundin: 'people',
  Bruder: 'people',
  Schwester: 'people',
  Mutter: 'people',
  Vater: 'people',
  Baby: 'people',
  Lehrer: 'people',
  Lehrerin: 'people',
  Arzt: 'people',
  Ärztin: 'people',
  Nachbar: 'people',
  Familie: 'people',
  Eltern: 'people',
  Großvater: 'people',
  Großmutter: 'people',
  Sohn: 'people',
  Tochter: 'people',
  Mensch: 'people',
  Kollege: 'people',
  Chef: 'people',
  Student: 'people',
  Studentin: 'people',
  Schüler: 'people',
  Paar: 'people',
  // Animals
  Hund: 'animals',
  Katze: 'animals',
  Vogel: 'animals',
  Fisch: 'animals',
  Pferd: 'animals',
  Maus: 'animals',
  Kuh: 'animals',
  Schwein: 'animals',
  Huhn: 'animals',
  Bär: 'animals',
  Schaf: 'animals',
  Tier: 'animals',
  Kaninchen: 'animals',
  Schmetterling: 'animals',
  Elefant: 'animals',
  Affe: 'animals',
  // Home & Rooms
  Haus: 'home',
  Wohnung: 'home',
  Zimmer: 'home',
  Küche: 'home',
  Bad: 'home',
  Schlafzimmer: 'home',
  Wohnzimmer: 'home',
  Tür: 'home',
  Fenster: 'home',
  Wand: 'home',
  Boden: 'home',
  Dach: 'home',
  Treppe: 'home',
  Garten: 'home',
  Balkon: 'home',
  Garage: 'home',
  Keller: 'home',
  Flur: 'home',
  Etage: 'home',
  // Furniture & Household Objects
  Tisch: 'furniture',
  Stuhl: 'furniture',
  Bett: 'furniture',
  Sofa: 'furniture',
  Schrank: 'furniture',
  Regal: 'furniture',
  Spiegel: 'furniture',
  Lampe: 'furniture',
  Uhr: 'furniture',
  Bild: 'furniture',
  Schlüssel: 'furniture',
  Telefon: 'furniture',
  Tasche: 'furniture',
  Buch: 'furniture',
  Zeitung: 'furniture',
  Brille: 'furniture',
  Koffer: 'furniture',
  Teppich: 'furniture',
  Seife: 'furniture',
  Handtuch: 'furniture',
  Regenschirm: 'furniture',
  Messer: 'furniture',
  Gabel: 'furniture',
  Löffel: 'furniture',
  Teller: 'furniture',
  Tasse: 'furniture',
  Glas: 'furniture',
  Flasche: 'furniture',
  Topf: 'furniture',
  Kühlschrank: 'furniture',
  Waschmaschine: 'furniture',
  Computer: 'furniture',
  Handy: 'furniture',
  Fernseher: 'furniture',
  Radio: 'furniture',
  Kamera: 'furniture',
  Stift: 'furniture',
  Papier: 'furniture',
  Brief: 'furniture',
  Karte: 'furniture',
  Geschenk: 'furniture',
  // Food & Drink
  Wasser: 'food',
  Brot: 'food',
  Milch: 'food',
  Apfel: 'food',
  Ei: 'food',
  Kaffee: 'food',
  Tee: 'food',
  Fleisch: 'food',
  Kuchen: 'food',
  Käse: 'food',
  Butter: 'food',
  Reis: 'food',
  Nudel: 'food',
  Suppe: 'food',
  Salat: 'food',
  Kartoffel: 'food',
  Tomate: 'food',
  Zwiebel: 'food',
  Banane: 'food',
  Orange: 'food',
  Zucker: 'food',
  Salz: 'food',
  Öl: 'food',
  Saft: 'food',
  Bier: 'food',
  Wein: 'food',
  Schokolade: 'food',
  Eis: 'food',
  Obst: 'food',
  Gemüse: 'food',
  Hähnchen: 'food',
  Wurst: 'food',
  Brötchen: 'food',
  Mahlzeit: 'food',
  Frühstück: 'food',
  Mittagessen: 'food',
  Abendessen: 'food',
  Getränk: 'food',
  Restaurant: 'food',
  // Body
  Kopf: 'body',
  Hand: 'body',
  Auge: 'body',
  Herz: 'body',
  Fuß: 'body',
  Arm: 'body',
  Bein: 'body',
  Finger: 'body',
  Nase: 'body',
  Mund: 'body',
  Ohr: 'body',
  Haar: 'body',
  Zahn: 'body',
  Rücken: 'body',
  Bauch: 'body',
  Gesicht: 'body',
  Hals: 'body',
  Knie: 'body',
  Schulter: 'body',
  Haut: 'body',
  // Clothing
  Schuh: 'clothing',
  Hose: 'clothing',
  Kleid: 'clothing',
  Hemd: 'clothing',
  Jacke: 'clothing',
  Mantel: 'clothing',
  Hut: 'clothing',
  Rock: 'clothing',
  Pullover: 'clothing',
  Socke: 'clothing',
  Mütze: 'clothing',
  Handschuh: 'clothing',
  Schal: 'clothing',
  Anzug: 'clothing',
  // Nature
  Land: 'nature',
  Baum: 'nature',
  Blume: 'nature',
  Park: 'nature',
  Fluss: 'nature',
  Berg: 'nature',
  See: 'nature',
  Meer: 'nature',
  Strand: 'nature',
  Wald: 'nature',
  Feld: 'nature',
  Insel: 'nature',
  Himmel: 'nature',
  Sonne: 'nature',
  Mond: 'nature',
  Stern: 'nature',
  Erde: 'nature',
  Luft: 'nature',
  Feuer: 'nature',
  Stein: 'nature',
  // Places & Buildings
  Stadt: 'places',
  Straße: 'places',
  Schule: 'places',
  Brücke: 'places',
  Weg: 'places',
  Platz: 'places',
  Kirche: 'places',
  Krankenhaus: 'places',
  Bahnhof: 'places',
  Flughafen: 'places',
  Hotel: 'places',
  Museum: 'places',
  Bibliothek: 'places',
  Supermarkt: 'places',
  Markt: 'places',
  Geschäft: 'places',
  Apotheke: 'places',
  Bank: 'places',
  Post: 'places',
  Polizei: 'places',
  Büro: 'places',
  Fabrik: 'places',
  Theater: 'places',
  Kino: 'places',
  Universität: 'places',
  Kindergarten: 'places',
  Rathaus: 'places',
  Schloss: 'places',
  Café: 'places',
  Bäckerei: 'places',
  // Transportation
  Auto: 'transportation',
  Zug: 'transportation',
  Fahrrad: 'transportation',
  Bus: 'transportation',
  Flugzeug: 'transportation',
  Schiff: 'transportation',
  Straßenbahn: 'transportation',
  Taxi: 'transportation',
  Motorrad: 'transportation',
  Boot: 'transportation',
  Haltestelle: 'transportation',
  Fahrkarte: 'transportation',
  Führerschein: 'transportation',
  // Time & Calendar
  Tag: 'time',
  Nacht: 'time',
  Jahr: 'time',
  Woche: 'time',
  Monat: 'time',
  Stunde: 'time',
  Minute: 'time',
  Morgen: 'time',
  Abend: 'time',
  Mittag: 'time',
  Wochenende: 'time',
  Uhrzeit: 'time',
  Geburtstag: 'time',
  Feiertag: 'time',
  Termin: 'time',
  Urlaub: 'time',
  Anfang: 'time',
  Ende: 'time',
  // Weather
  Wetter: 'weather',
  Regen: 'weather',
  Schnee: 'weather',
  Wind: 'weather',
  Wolke: 'weather',
  Gewitter: 'weather',
  Nebel: 'weather',
  Temperatur: 'weather',
  Grad: 'weather',
  // Work & Education
  Arbeit: 'education',
  Beruf: 'education',
  Firma: 'education',
  Aufgabe: 'education',
  Kurs: 'education',
  Prüfung: 'education',
  Klasse: 'education',
  Unterricht: 'education',
  Hausaufgabe: 'education',
  Beispiel: 'education',
  Frage: 'education',
  Antwort: 'education',
  Wort: 'education',
  Satz: 'education',
  Text: 'education',
  Sprache: 'education',
  Seite: 'education',
  Übung: 'education',
  Heft: 'education',
  Tafel: 'education',
  // Money & Shopping
  Geld: 'money',
  Preis: 'money',
  Euro: 'money',
  Cent: 'money',
  Rechnung: 'money',
  Kasse: 'money',
  Angebot: 'money',
  // Communication & Feelings
  Name: 'communication',
  Nummer: 'communication',
  Adresse: 'communication',
  'E-Mail': 'communication',
  Nachricht: 'communication',
  Gespräch: 'communication',
  Musik: 'communication',
  Lied: 'communication',
  Film: 'communication',
  Foto: 'communication',
  Spiel: 'communication',
  Sport: 'communication',
  Hobby: 'communication',
  Reise: 'communication',
  Fest: 'communication',
  Party: 'communication',
  Spaß: 'communication',
  Freude: 'communication',
  Angst: 'communication',
  Liebe: 'communication',
  Glück: 'communication',
  Problem: 'communication',
  Hilfe: 'communication',
  Idee: 'communication',
  Grund: 'communication',
  Meinung: 'communication',
  Interesse: 'communication',
  Wunsch: 'communication',
  Traum: 'communication',
  Ruhe: 'communication',
  Lärm: 'communication',
  // Health
  Gesundheit: 'health',
  Krankheit: 'health',
  Schmerz: 'health',
  Medikament: 'health',
  Fieber: 'health',
  Erkältung: 'health',
  // Colours
  Farbe: 'colors',
  // General & Abstract
  Ding: 'general',
  Teil: 'general',
  Stück: 'general',
  Art: 'general',
  Zahl: 'general',
  Gruppe: 'general',
  Leben: 'general',
  Geschichte: 'general',
  Erfahrung: 'general',
  Regel: 'general',
  Chance: 'general',
  Unterschied: 'general',
  Zukunft: 'general',
  Vergangenheit: 'general',
  Wahrheit: 'general',
  Frieden: 'general',
  Erfolg: 'general',
  Fehler: 'general',
  Ziel: 'general',
  Recht: 'general',
  Situation: 'general',
  Bedeutung: 'general',
  Information: 'general',
  Programm: 'general',
  Zeichen: 'general',
  Möglichkeit: 'general',
};

/**
 * Backfill category assignments for nouns that were seeded before categories existed.
 * Uses LEGACY_NOUN_CATEGORY_MAP to assign proper categories, falls back to 'general'.
 */
async function backfillNounCategories(
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

  // Check if there are any nouns without categories
  const orphanedCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM nouns WHERE category_id IS NULL',
  );

  if (!orphanedCount || orphanedCount.count === 0) {
    // No orphaned nouns, just mark as done
    await db.runAsync('INSERT INTO data_versions (version) VALUES (?)', [
      version,
    ]);
    return;
  }

  console.log(
    `[DB] Backfilling categories for ${orphanedCount.count} nouns...`,
  );

  // Pre-fetch category ID mappings
  const categoryIdMap = new Map<string, number>();
  for (const categoryName of new Set(Object.values(LEGACY_NOUN_CATEGORY_MAP))) {
    const category = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE name = ?',
      [categoryName],
    );
    if (category) {
      categoryIdMap.set(categoryName, category.id);
    }
  }

  // Get 'general' category as fallback
  const generalCategory = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM categories WHERE name = ?',
    ['general'],
  );

  if (!generalCategory) {
    throw new Error('[DB] General category not found — cannot backfill');
  }

  await db.withTransactionAsync(async () => {
    // Fetch all nouns without a category
    const orphanedNouns = await db.getAllAsync<{
      id: number;
      german: string;
    }>('SELECT id, german FROM nouns WHERE category_id IS NULL');

    let mapped = 0;
    let fallback = 0;

    for (const noun of orphanedNouns) {
      const categoryName = LEGACY_NOUN_CATEGORY_MAP[noun.german];
      const categoryId = categoryName
        ? categoryIdMap.get(categoryName)
        : undefined;

      if (categoryId) {
        await db.runAsync('UPDATE nouns SET category_id = ? WHERE id = ?', [
          categoryId,
          noun.id,
        ]);
        mapped++;
      } else {
        await db.runAsync('UPDATE nouns SET category_id = ? WHERE id = ?', [
          generalCategory.id,
          noun.id,
        ]);
        fallback++;
      }
    }

    await db.runAsync('INSERT INTO data_versions (version) VALUES (?)', [
      version,
    ]);

    console.log(
      `[DB] Backfilled categories: ${mapped} mapped, ${fallback} assigned to 'general'`,
    );
  });
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
    // Safety check: any remaining NULLs get assigned to 'general'
    const orphanedCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM nouns WHERE category_id IS NULL',
    );

    if (orphanedCount && orphanedCount.count > 0) {
      console.warn(
        `[DB] Found ${orphanedCount.count} nouns still without categories. Assigning to 'general'...`,
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

    // Copy data with explicit column mapping (column order differs between
    // the ALTERed table and the new definition)
    await db.execAsync(`
      INSERT INTO nouns_new (id, german, article, plural, english, level, category_id, is_user_added, created_at)
      SELECT id, german, article, plural, english, level, category_id, is_user_added, created_at
      FROM nouns;
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
