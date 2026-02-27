import {
  PB_API_KEY,
  PB_URL,
  SYNC_CONFIG,
  formatPocketBaseTimestamp,
} from '@/constants/pocketbase';
import { getDatabase } from '@/database/db';
import { settingsService } from './settingsService';

// ── PocketBase response types ────────────────────────────────────────

interface PBListResponse<T> {
  page: number;
  perPage: number;
  totalPages: number;
  totalItems: number;
  items: T[];
}

interface PBCategory {
  id: string;
  name: string;
  display_name: string;
  display_order: number;
  created: string;
  updated: string;
}

interface PBNoun {
  id: string;
  german: string;
  article: 'der' | 'die' | 'das';
  plural: string;
  english: string;
  translation_key: string;
  level: string;
  category: string; // PocketBase category ID (relation)
  expand?: {
    category?: PBCategory;
  };
  created: string;
  updated: string;
}

interface PBNounTranslation {
  id: string;
  noun_id: string;
  locale: 'en' | 'it' | 'pl';
  translation: string;
  created: string;
  updated: string;
}

// ── Sync result ──────────────────────────────────────────────────────

export interface SyncResult {
  status: 'synced' | 'skipped' | 'error';
  categoriesSynced?: number;
  nounsSynced?: number;
  /** Collections that had a count mismatch and required a full re-fetch. */
  patchedCollections?: string[];
  error?: string;
}

// ── Service ──────────────────────────────────────────────────────────

class SyncService {
  private get db() {
    return getDatabase();
  }

  /**
   * Pull new/updated vocabulary from PocketBase.
   *
   * - Returns `'skipped'` immediately when PB_URL is not configured.
   * - Never throws — all errors are caught and returned in the result.
   * - Safe to call on every app launch (non-blocking, idempotent).
   */
  async syncIfOnline(): Promise<SyncResult> {
    if (!PB_URL || !PB_API_KEY) {
      return { status: 'skipped' };
    }

    try {
      // Read per-collection timestamps so that newly-added collections (which
      // have no stored timestamp yet) always do a full fetch, even when other
      // collections have already been synced before.
      const [lastSyncCategories, lastSyncNouns, lastSyncTranslations] =
        await Promise.all([
          settingsService.getSetting(SYNC_CONFIG.LAST_SYNC_KEYS.categories),
          settingsService.getSetting(SYNC_CONFIG.LAST_SYNC_KEYS.nouns),
          settingsService.getSetting(
            SYNC_CONFIG.LAST_SYNC_KEYS.noun_translations,
          ),
        ]);

      const syncedAt = new Date().toISOString();

      // Pull categories first — nouns reference them via category name
      const remoteCategories = await this.fetchRecords<PBCategory>(
        'categories',
        lastSyncCategories,
      );
      const categoriesSynced = await this.upsertCategories(remoteCategories);
      await settingsService.setSetting(
        SYNC_CONFIG.LAST_SYNC_KEYS.categories,
        syncedAt,
      );

      // Pull nouns WITH expanded category relation
      const remoteNouns = await this.fetchRecords<PBNoun>(
        'nouns',
        lastSyncNouns,
        'category',
      );
      const nounsSynced = await this.upsertNouns(remoteNouns);
      await settingsService.setSetting(
        SYNC_CONFIG.LAST_SYNC_KEYS.nouns,
        syncedAt,
      );

      // Pull noun translations
      const remoteNounTranslations = await this.fetchRecords<PBNounTranslation>(
        'noun_translations',
        lastSyncTranslations,
        'noun_id',
      );
      const nounTranslationsSynced = await this.upsertNounTranslations(
        remoteNounTranslations,
      );
      await settingsService.setSetting(
        SYNC_CONFIG.LAST_SYNC_KEYS.noun_translations,
        syncedAt,
      );

      if (categoriesSynced > 0 || nounsSynced > 0) {
        console.log(
          `[Sync] Complete: ${categoriesSynced} categories, ${nounsSynced} nouns, ${nounTranslationsSynced} noun translations`,
        );
      }

      // Integrity check: if local counts don't match remote after incremental
      // sync, some records were silently missed (e.g. network dropped mid-page).
      // Re-fetch the entire collection without a timestamp filter to patch gaps.
      const patchedCollections = await this.patchSyncIfCountMismatch();

      return { status: 'synced', categoriesSynced, nounsSynced, patchedCollections };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[Sync] Failed:', message);
      return { status: 'error', error: message };
    }
  }

  // ── Fetching ─────────────────────────────────────────────────────

  /**
   * Fetch all records from a PocketBase collection that were updated
   * after `since`. Handles pagination automatically.
   */
  private async fetchRecords<T>(
    collection: string,
    since: string | null,
    expand?: string,
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(SYNC_CONFIG.PAGE_SIZE),
        key: PB_API_KEY!,
      });

      if (expand) {
        params.set('expand', expand);
      }

      if (since) {
        const pbTimestamp = formatPocketBaseTimestamp(since);
        params.set('filter', `(updated > '${pbTimestamp}')`);
      }

      const url = `${PB_URL}/api/collections/${collection}/records?${params}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `PocketBase ${collection} fetch failed: ${response.status}`,
        );
      }

      const data: PBListResponse<T> = await response.json();
      allItems.push(...data.items);
      totalPages = data.totalPages;
      page++;
    }

    return allItems;
  }

  // ── Categories upsert ────────────────────────────────────────────

  /**
   * Upsert categories from PocketBase into local SQLite.
   * Matches on remote_id to preserve local integer IDs.
   * Falls back to matching on `name` if remote_id isn't found.
   */
  private async upsertCategories(categories: PBCategory[]): Promise<number> {
    if (categories.length === 0) return 0;

    let synced = 0;

    await this.db.withTransactionAsync(async () => {
      for (const cat of categories) {
        try {
          // Primary path: match on remote_id
          const result = await this.db.runAsync(
            `INSERT INTO categories (name, display_name, display_order, remote_id)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(remote_id) DO UPDATE SET
               name = excluded.name,
               display_name = excluded.display_name,
               display_order = excluded.display_order`,
            [cat.name, cat.display_name, cat.display_order, cat.id],
          );
          if (result.changes > 0) synced++;
        } catch (error) {
          // Fallback: UNIQUE(name) conflict — row exists with a different remote_id.
          // Update it in place and assign the PocketBase remote_id.
          const message =
            error instanceof Error ? error.message : String(error);
          if (message.includes('UNIQUE constraint')) {
            await this.db.runAsync(
              `UPDATE categories
               SET display_name = ?, display_order = ?, remote_id = ?
               WHERE name = ?`,
              [cat.display_name, cat.display_order, cat.id, cat.name],
            );
            synced++;
          } else {
            console.warn(
              `[Sync] Failed to upsert category "${cat.name}":`,
              message,
            );
          }
        }
      }
    });

    return synced;
  }

  // ── Nouns upsert ─────────────────────────────────────────────────

  /**
   * Upsert nouns from PocketBase into local SQLite.
   * Matches on remote_id so that the local integer ID (and thus
   * card_progress / review_history references) is preserved.
   * Falls back to matching on (german, article) natural key.
   */
  private async upsertNouns(nouns: PBNoun[]): Promise<number> {
    if (nouns.length === 0) return 0;

    // Build map of category REMOTE_ID → local ID
    const categoryRemoteIdMap = new Map<string, number>();
    const allCategories = await this.db.getAllAsync<{
      id: number;
      remote_id: string | null;
    }>('SELECT id, remote_id FROM categories');

    for (const cat of allCategories) {
      if (cat.remote_id) {
        categoryRemoteIdMap.set(cat.remote_id, cat.id);
      }
    }

    let synced = 0;

    await this.db.withTransactionAsync(async () => {
      for (const noun of nouns) {
        // Get category remote ID from expand data (preferred) or relation field (fallback)
        const categoryRemoteId = noun.expand?.category?.id ?? noun.category;
        const categoryId = categoryRemoteIdMap.get(categoryRemoteId);

        if (!categoryId) {
          // Better error message with category name if available
          const categoryInfo = noun.expand?.category?.name
            ? `"${noun.expand.category.name}" (${categoryRemoteId})`
            : categoryRemoteId;
          console.warn(
            `[Sync] Unknown category ${categoryInfo} for noun "${noun.german}", skipping`,
          );
          continue;
        }

        // Check if noun with this remote_id already exists
        const existing = await this.db.getFirstAsync<{ id: number }>(
          'SELECT id FROM nouns WHERE remote_id = ?',
          [noun.id],
        );

        if (existing) {
          // Update existing noun
          const result = await this.db.runAsync(
            `UPDATE nouns
             SET german = ?, article = ?, plural = ?, english = ?, translation_key = ?, level = ?, category_id = ?
             WHERE remote_id = ?`,
            [
              noun.german,
              noun.article,
              noun.plural || null,
              noun.english || null,
              noun.translation_key || null,
              noun.level,
              categoryId,
              noun.id,
            ],
          );
          if (result.changes > 0) synced++;
        } else {
          // Insert new noun
          try {
            const result = await this.db.runAsync(
              `INSERT INTO nouns (german, article, plural, english, translation_key, level, category_id, remote_id, is_user_added)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
              [
                noun.german,
                noun.article,
                noun.plural || null,
                noun.english || null,
                noun.translation_key || null,
                noun.level,
                categoryId,
                noun.id,
              ],
            );
            if (result.changes > 0) synced++;
          } catch (error) {
            // Handle UNIQUE(german, article) constraint violation
            const message =
              error instanceof Error ? error.message : String(error);
            if (message.includes('UNIQUE constraint')) {
              // Word exists with same german+article but different/no remote_id.
              // Check if it's a user-added word — if so, only assign remote_id
              // without overwriting user's custom data.
              const existingWord = await this.db.getFirstAsync<{
                id: number;
                is_user_added: number;
              }>(
                'SELECT id, is_user_added FROM nouns WHERE german = ? AND article = ?',
                [noun.german, noun.article],
              );

              if (existingWord?.is_user_added) {
                // User-added word exists — only assign remote_id, preserve user data
                const result = await this.db.runAsync(
                  `UPDATE nouns
                   SET remote_id = ?
                   WHERE german = ? AND article = ?`,
                  [noun.id, noun.german, noun.article],
                );
                if (result.changes > 0) {
                  console.log(
                    `[Sync] Linked user word "${noun.german}" to PocketBase (preserved user data)`,
                  );
                  synced++;
                }
              } else {
                // Pre-seeded word without remote_id — safe to update with PocketBase data
                const result = await this.db.runAsync(
                  `UPDATE nouns
                   SET plural = ?, english = ?, translation_key = ?, level = ?, category_id = ?, remote_id = ?
                   WHERE german = ? AND article = ?`,
                  [
                    noun.plural || null,
                    noun.english || null,
                    noun.translation_key || null,
                    noun.level,
                    categoryId,
                    noun.id,
                    noun.german,
                    noun.article,
                  ],
                );
                if (result.changes > 0) synced++;
              }
            } else {
              console.warn(
                `[Sync] Failed to insert noun "${noun.german}":`,
                message,
              );
            }
          }
        }
      }
    });

    return synced;
  }
  // ── Count integrity / patch sync ─────────────────────────────────

  /**
   * After an incremental sync, compare remote `totalItems` with local counts.
   * If they disagree, do a full (no-filter) re-fetch for that collection so
   * any records that slipped through a previous partial failure are recovered.
   *
   * Returns the list of collections that were patched.
   */
  private async patchSyncIfCountMismatch(): Promise<string[]> {
    const patched: string[] = [];

    // ── Nouns ──────────────────────────────────────────────────────
    const [remoteNounCount, localNounCount] = await Promise.all([
      this.fetchRemoteCount('nouns'),
      this.db
        .getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM nouns WHERE is_user_added = 0',
        )
        .then((r) => r?.count ?? 0),
    ]);

    if (remoteNounCount !== localNounCount) {
      console.log(
        `[Sync] Noun count mismatch (remote=${remoteNounCount}, local=${localNounCount}). Running patch sync…`,
      );
      const allNouns = await this.fetchRecords<PBNoun>('nouns', null, 'category');
      await this.upsertNouns(allNouns);
      // Prune nouns deleted from PocketBase (local > remote case)
      if (allNouns.length > 0) {
        const remoteIds = allNouns.map((n) => n.id);
        const placeholders = remoteIds.map(() => '?').join(',');
        await this.db.runAsync(
          `DELETE FROM nouns WHERE is_user_added = 0 AND remote_id NOT IN (${placeholders})`,
          remoteIds,
        );
      }
      await settingsService.setSetting(
        SYNC_CONFIG.LAST_SYNC_KEYS.nouns,
        new Date().toISOString(),
      );
      patched.push('nouns');
    }

    // ── Noun translations ──────────────────────────────────────────
    const [remoteTranslationCount, localTranslationCount] = await Promise.all([
      this.fetchRemoteCount('noun_translations'),
      this.db
        .getFirstAsync<{ count: number }>(
          'SELECT COUNT(*) as count FROM noun_translations',
        )
        .then((r) => r?.count ?? 0),
    ]);

    if (remoteTranslationCount !== localTranslationCount) {
      console.log(
        `[Sync] Noun translation count mismatch (remote=${remoteTranslationCount}, local=${localTranslationCount}). Running patch sync…`,
      );
      const allTranslations = await this.fetchRecords<PBNounTranslation>(
        'noun_translations',
        null,
        'noun_id',
      );
      await this.upsertNounTranslations(allTranslations);
      // Prune translations deleted from PocketBase (local > remote case)
      if (allTranslations.length > 0) {
        const remoteIds = allTranslations.map((t) => t.id);
        const placeholders = remoteIds.map(() => '?').join(',');
        await this.db.runAsync(
          `DELETE FROM noun_translations WHERE remote_id NOT IN (${placeholders})`,
          remoteIds,
        );
      }
      await settingsService.setSetting(
        SYNC_CONFIG.LAST_SYNC_KEYS.noun_translations,
        new Date().toISOString(),
      );
      patched.push('noun_translations');
    }

    return patched;
  }

  /**
   * Fetch only the first page (perPage=1) from a PocketBase collection
   * to cheaply read the `totalItems` count.
   */
  private async fetchRemoteCount(collection: string): Promise<number> {
    const params = new URLSearchParams({ perPage: '1', key: PB_API_KEY! });
    const url = `${PB_URL}/api/collections/${collection}/records?${params}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `PocketBase ${collection} count check failed: ${response.status}`,
      );
    }
    const data: PBListResponse<unknown> = await response.json();
    return data.totalItems;
  }

  // ── Noun translations upsert ─────────────────────────────────────

  /**
   * Upsert noun translations from PocketBase into local SQLite.
   * Matches on noun_id (the PocketBase remote noun ID stored as TEXT) since
   * the local table has no FK to the integer nouns.id — the remote ID is the
   * stable join key.
   */
  private async upsertNounTranslations(
    translations: PBNounTranslation[],
  ): Promise<number> {
    if (translations.length === 0) return 0;

    let synced = 0;

    await this.db.withTransactionAsync(async () => {
      for (const translation of translations) {
        try {
          const result = await this.db.runAsync(
            `INSERT INTO noun_translations (remote_id, noun_id, locale, translation)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(noun_id, locale) DO UPDATE SET
               remote_id = excluded.remote_id,
               translation = excluded.translation,
               updated_at = CURRENT_TIMESTAMP`,
            [
              translation.id,
              translation.noun_id,
              translation.locale,
              translation.translation,
            ],
          );
          if (result.changes > 0) synced++;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `[Sync] Failed to upsert noun translation for noun "${translation.noun_id}":`,
            message,
          );
        }
      }
    });

    return synced;
  }
}

export const syncService = new SyncService();
