import { PB_API_KEY, PB_URL, SYNC_CONFIG } from '@/constants/pocketbase';
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
  level: string;
  category: string; // category name (text field, not a relation)
  created: string;
  updated: string;
}

// ── Sync result ──────────────────────────────────────────────────────

export interface SyncResult {
  status: 'synced' | 'skipped' | 'error';
  categoriesSynced?: number;
  nounsSynced?: number;
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
      const lastSync = await settingsService.getSetting(
        SYNC_CONFIG.LAST_SYNC_KEY,
      );

      // Pull categories first — nouns reference them via category name
      const remoteCategories = await this.fetchRecords<PBCategory>(
        'categories',
        lastSync,
      );
      const categoriesSynced = await this.upsertCategories(remoteCategories);

      // Pull nouns
      const remoteNouns = await this.fetchRecords<PBNoun>('nouns', lastSync);
      const nounsSynced = await this.upsertNouns(remoteNouns);

      // Persist the sync timestamp so next launch only fetches the delta
      await settingsService.setSetting(
        SYNC_CONFIG.LAST_SYNC_KEY,
        new Date().toISOString(),
      );

      if (categoriesSynced > 0 || nounsSynced > 0) {
        console.log(
          `[Sync] Complete: ${categoriesSynced} categories, ${nounsSynced} nouns`,
        );
      }

      return { status: 'synced', categoriesSynced, nounsSynced };
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

      if (since) {
        params.set('filter', `updated > "${since}"`);
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

    // Pre-fetch category name → local ID
    const categoryIdMap = new Map<string, number>();
    const allCategories = await this.db.getAllAsync<{
      id: number;
      name: string;
    }>('SELECT id, name FROM categories');
    for (const cat of allCategories) {
      categoryIdMap.set(cat.name, cat.id);
    }

    let synced = 0;

    await this.db.withTransactionAsync(async () => {
      for (const noun of nouns) {
        const categoryId = categoryIdMap.get(noun.category);
        if (!categoryId) {
          console.warn(
            `[Sync] Unknown category "${noun.category}" for noun "${noun.german}", skipping`,
          );
          continue;
        }

        try {
          // Primary path: match on remote_id
          const result = await this.db.runAsync(
            `INSERT INTO nouns
               (german, article, plural, english, level, category_id, remote_id, is_user_added)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)
             ON CONFLICT(remote_id) DO UPDATE SET
               german     = excluded.german,
               article    = excluded.article,
               plural     = excluded.plural,
               english    = excluded.english,
               level      = excluded.level,
               category_id = excluded.category_id`,
            [
              noun.german,
              noun.article,
              noun.plural || null,
              noun.english || null,
              noun.level,
              categoryId,
              noun.id,
            ],
          );
          if (result.changes > 0) synced++;
        } catch (error) {
          // Fallback: UNIQUE(german, article) conflict — row exists with a
          // different (or no) remote_id. Update in place and assign the PB id.
          const message =
            error instanceof Error ? error.message : String(error);
          if (message.includes('UNIQUE constraint')) {
            await this.db.runAsync(
              `UPDATE nouns
               SET plural = ?, english = ?, level = ?, category_id = ?, remote_id = ?
               WHERE german = ? AND article = ?`,
              [
                noun.plural || null,
                noun.english || null,
                noun.level,
                categoryId,
                noun.id,
                noun.german,
                noun.article,
              ],
            );
            synced++;
          } else {
            console.warn(
              `[Sync] Failed to upsert noun "${noun.german}":`,
              message,
            );
          }
        }
      }
    });

    return synced;
  }
}

export const syncService = new SyncService();
