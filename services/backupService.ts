import { getDatabase } from '@/database/db';
import { SETTINGS_KEYS, settingsService } from './settingsService';

/**
 * Serialization and restore for the Pro cloud backup.
 *
 * This layer only turns on-device progress into a portable JSON payload and
 * back again. It does no networking and no entitlement checks — the upload
 * route and the RevenueCat gate live elsewhere, so the payload format can be
 * reviewed and tested on its own.
 *
 * Local integer IDs differ across installs, so nothing in the payload refers
 * to them. Words are identified by a `WordKey`: the PocketBase `remote_id`
 * for official nouns, and `(german, article)` / `german` for user-added
 * nouns and for adjectives.
 */

export const BACKUP_PAYLOAD_VERSION = 1;

/**
 * Settings that are safe and useful to carry to a new install. Deliberately
 * excluded: `pro_unlocked` (RevenueCat is the source of truth),
 * `selected_categories` (holds local category IDs), and ad/review-prompt
 * counters that only make sense per install.
 */
export const BACKED_UP_SETTINGS_KEYS = [
  SETTINGS_KEYS.SHOW_ENGLISH_HINT,
  SETTINGS_KEYS.ESZETT_PREFERENCE,
  SETTINGS_KEYS.SELECTED_LEVELS,
  SETTINGS_KEYS.APP_LANGUAGE,
  SETTINGS_KEYS.QUIZ_SESSIONS_COMPLETED,
  SETTINGS_KEYS.ADJECTIVE_DECLENSION_TRIAL_QUESTIONS_USED,
  SETTINGS_KEYS.ADJECTIVE_DECLENSION_DIFFICULTY,
  SETTINGS_KEYS.PRO_GRANDFATHER_MIGRATION_DONE,
  SETTINGS_KEYS.GRANDFATHERED_B_LEVEL,
  SETTINGS_KEYS.GRANDFATHERED_WORD_CAP,
] as const;

// ── Payload types ─────────────────────────────────────────────────────

export interface BackupReview {
  quality: number;
  timeTakenMs: number | null;
  reviewedAt: string;
}

export interface BackupCardProgress {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  totalReviews: number;
  correctReviews: number;
  lastReviewedAt: string | null;
  createdAt: string;
  reviews: BackupReview[];
}

export interface BackupNounKey {
  remoteId: string | null;
  german: string;
  article: string;
  sense: string | null;
}

export interface BackupUserNoun extends BackupNounKey {
  plural: string | null;
  english: string | null;
  level: string | null;
  /** Category `name` (machine name), not the local ID. */
  categoryName: string | null;
  createdAt: string;
}

export interface BackupUserAdjective {
  german: string;
  english: string;
  level: string | null;
  createdAt: string;
}

export interface BackupPayload {
  version: number;
  createdAt: string;
  userNouns: BackupUserNoun[];
  userAdjectives: BackupUserAdjective[];
  nounProgress: (BackupNounKey & { progress: BackupCardProgress })[];
  adjectiveProgress: { german: string; progress: BackupCardProgress }[];
  settings: Record<string, string>;
}

export interface RestoreResult {
  restoredCards: number;
  restoredReviews: number;
  /** Cards whose word does not exist on this install (yet) and were skipped. */
  skippedCards: number;
  restoredUserWords: number;
}

// ── Row types ─────────────────────────────────────────────────────────

interface ProgressRow {
  id: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  total_reviews: number;
  correct_reviews: number;
  last_reviewed_at: string | null;
  created_at: string;
}

interface NounProgressRow extends ProgressRow {
  remote_id: string | null;
  german: string;
  article: string;
  sense: string | null;
}

interface AdjectiveProgressRow extends ProgressRow {
  german: string;
}

interface ReviewRow {
  card_progress_id: number;
  quality: number;
  time_taken_ms: number | null;
  reviewed_at: string;
}

const PROGRESS_COLUMNS = `cp.id, cp.ease_factor, cp.interval, cp.repetitions,
  cp.next_review_date, cp.total_reviews, cp.correct_reviews,
  cp.last_reviewed_at, cp.created_at`;

function toCardProgress(
  row: ProgressRow,
  reviewsByCard: Map<number, BackupReview[]>,
): BackupCardProgress {
  return {
    easeFactor: row.ease_factor,
    interval: row.interval,
    repetitions: row.repetitions,
    nextReviewDate: row.next_review_date,
    totalReviews: row.total_reviews,
    correctReviews: row.correct_reviews,
    lastReviewedAt: row.last_reviewed_at,
    createdAt: row.created_at,
    reviews: reviewsByCard.get(row.id) ?? [],
  };
}

class BackupService {
  private db = getDatabase();

  /** Snapshot everything worth keeping into a portable payload. */
  async createBackupPayload(): Promise<BackupPayload> {
    const [
      userNouns,
      userAdjectives,
      nounRows,
      adjectiveRows,
      reviewRows,
      settings,
    ] = await Promise.all([
      this.db.getAllAsync<{
        remote_id: string | null;
        german: string;
        article: string;
        sense: string | null;
        plural: string | null;
        english: string | null;
        level: string | null;
        category_name: string | null;
        created_at: string;
      }>(
        `SELECT n.remote_id, n.german, n.article, n.sense, n.plural, n.english,
                n.level, c.name AS category_name, n.created_at
         FROM nouns n
         LEFT JOIN categories c ON c.id = n.category_id
         WHERE n.is_user_added = 1`,
      ),
      this.db.getAllAsync<{
        german: string;
        english: string;
        level: string | null;
        created_at: string;
      }>(
        'SELECT german, english, level, created_at FROM adjectives WHERE is_user_added = 1',
      ),
      this.db.getAllAsync<NounProgressRow>(
        `SELECT ${PROGRESS_COLUMNS}, n.remote_id, n.german, n.article, n.sense
         FROM card_progress cp
         JOIN nouns n ON cp.word_type = 'noun' AND cp.word_id = n.id`,
      ),
      this.db.getAllAsync<AdjectiveProgressRow>(
        `SELECT ${PROGRESS_COLUMNS}, a.german
         FROM card_progress cp
         JOIN adjectives a ON cp.word_type = 'adjective' AND cp.word_id = a.id`,
      ),
      this.db.getAllAsync<ReviewRow>(
        `SELECT card_progress_id, quality, time_taken_ms, reviewed_at
         FROM review_history
         ORDER BY reviewed_at ASC, id ASC`,
      ),
      this.readBackedUpSettings(),
    ]);

    const reviewsByCard = new Map<number, BackupReview[]>();
    for (const review of reviewRows) {
      const list = reviewsByCard.get(review.card_progress_id) ?? [];
      list.push({
        quality: review.quality,
        timeTakenMs: review.time_taken_ms,
        reviewedAt: review.reviewed_at,
      });
      reviewsByCard.set(review.card_progress_id, list);
    }

    return {
      version: BACKUP_PAYLOAD_VERSION,
      createdAt: new Date().toISOString(),
      userNouns: userNouns.map((row) => ({
        remoteId: row.remote_id,
        german: row.german,
        article: row.article,
        sense: row.sense,
        plural: row.plural,
        english: row.english,
        level: row.level,
        categoryName: row.category_name,
        createdAt: row.created_at,
      })),
      userAdjectives: userAdjectives.map((row) => ({
        german: row.german,
        english: row.english,
        level: row.level,
        createdAt: row.created_at,
      })),
      nounProgress: nounRows.map((row) => ({
        remoteId: row.remote_id,
        german: row.german,
        article: row.article,
        sense: row.sense,
        progress: toCardProgress(row, reviewsByCard),
      })),
      adjectiveProgress: adjectiveRows.map((row) => ({
        german: row.german,
        progress: toCardProgress(row, reviewsByCard),
      })),
      settings,
    };
  }

  /**
   * Apply a payload to this install, in a single transaction.
   *
   * Merge rules: user-added words are created if missing; every card in the
   * backup overwrites the local card (and its review history) for the same
   * word; local cards the backup doesn't mention are left alone. Cards for
   * words this install doesn't have are skipped and counted, not errors.
   */
  async restoreFromPayload(payload: BackupPayload): Promise<RestoreResult> {
    this.assertSupportedPayload(payload);

    const result: RestoreResult = {
      restoredCards: 0,
      restoredReviews: 0,
      skippedCards: 0,
      restoredUserWords: 0,
    };

    await this.db.withTransactionAsync(async () => {
      for (const noun of payload.userNouns) {
        if (await this.restoreUserNoun(noun)) result.restoredUserWords += 1;
      }
      for (const adjective of payload.userAdjectives) {
        if (await this.restoreUserAdjective(adjective)) {
          result.restoredUserWords += 1;
        }
      }

      for (const entry of payload.nounProgress) {
        const nounId = await this.findNounId(entry);
        await this.applyProgress('noun', nounId, entry.progress, result);
      }
      for (const entry of payload.adjectiveProgress) {
        const adjective = await this.db.getFirstAsync<{ id: number }>(
          'SELECT id FROM adjectives WHERE german = ?',
          [entry.german],
        );
        await this.applyProgress(
          'adjective',
          adjective?.id ?? null,
          entry.progress,
          result,
        );
      }
    });

    // Settings are written outside the transaction: settingsService owns its
    // own upsert and these are idempotent key/value writes.
    for (const key of BACKED_UP_SETTINGS_KEYS) {
      const value = payload.settings[key];
      if (typeof value === 'string') {
        await settingsService.setSetting(key, value);
      }
    }

    return result;
  }

  // ── Internals ───────────────────────────────────────────────────────

  private assertSupportedPayload(payload: BackupPayload): void {
    if (!payload || typeof payload.version !== 'number') {
      throw new Error('Backup data is not valid.');
    }
    if (payload.version > BACKUP_PAYLOAD_VERSION) {
      throw new Error(
        'This backup was made by a newer version of the app. Please update Üben and try again.',
      );
    }
  }

  private async readBackedUpSettings(): Promise<Record<string, string>> {
    const settings: Record<string, string> = {};
    for (const key of BACKED_UP_SETTINGS_KEYS) {
      const value = await settingsService.getSetting(key);
      if (value !== null) settings[key] = value;
    }
    return settings;
  }

  /** Resolve a noun by `remote_id` first, then by its natural key. */
  private async findNounId(key: BackupNounKey): Promise<number | null> {
    if (key.remoteId) {
      const byRemote = await this.db.getFirstAsync<{ id: number }>(
        'SELECT id FROM nouns WHERE remote_id = ?',
        [key.remoteId],
      );
      if (byRemote) return byRemote.id;
    }
    const byNaturalKey = await this.db.getFirstAsync<{ id: number }>(
      `SELECT id FROM nouns
       WHERE german = ? AND article = ? AND COALESCE(sense, '') = COALESCE(?, '')`,
      [key.german, key.article, key.sense],
    );
    return byNaturalKey?.id ?? null;
  }

  /** Returns true if a new user noun row was created. */
  private async restoreUserNoun(noun: BackupUserNoun): Promise<boolean> {
    if (await this.findNounId(noun)) return false;

    // nouns.category_id is NOT NULL: match by category name, else fall back
    // to the first category so the word is never lost.
    const category =
      (noun.categoryName
        ? await this.db.getFirstAsync<{ id: number }>(
            'SELECT id FROM categories WHERE name = ?',
            [noun.categoryName],
          )
        : null) ??
      (await this.db.getFirstAsync<{ id: number }>(
        'SELECT id FROM categories ORDER BY display_order ASC, id ASC LIMIT 1',
      ));
    if (!category) return false;

    await this.db.runAsync(
      `INSERT INTO nouns (german, article, sense, plural, english, level, category_id, is_user_added, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        noun.german,
        noun.article,
        noun.sense,
        noun.plural,
        noun.english,
        noun.level,
        category.id,
        noun.createdAt,
      ],
    );
    return true;
  }

  /** Returns true if a new user adjective row was created. */
  private async restoreUserAdjective(
    adjective: BackupUserAdjective,
  ): Promise<boolean> {
    const existing = await this.db.getFirstAsync<{ id: number }>(
      'SELECT id FROM adjectives WHERE german = ?',
      [adjective.german],
    );
    if (existing) return false;

    await this.db.runAsync(
      `INSERT INTO adjectives (german, english, level, is_user_added, created_at)
       VALUES (?, ?, ?, 1, ?)`,
      [adjective.german, adjective.english, adjective.level, adjective.createdAt],
    );
    return true;
  }

  private async applyProgress(
    wordType: 'noun' | 'adjective',
    wordId: number | null,
    progress: BackupCardProgress,
    result: RestoreResult,
  ): Promise<void> {
    if (wordId === null) {
      result.skippedCards += 1;
      return;
    }

    await this.db.runAsync(
      `INSERT INTO card_progress
         (word_type, word_id, ease_factor, interval, repetitions, next_review_date,
          total_reviews, correct_reviews, last_reviewed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(word_type, word_id) DO UPDATE SET
         ease_factor = excluded.ease_factor,
         interval = excluded.interval,
         repetitions = excluded.repetitions,
         next_review_date = excluded.next_review_date,
         total_reviews = excluded.total_reviews,
         correct_reviews = excluded.correct_reviews,
         last_reviewed_at = excluded.last_reviewed_at,
         created_at = excluded.created_at`,
      [
        wordType,
        wordId,
        progress.easeFactor,
        progress.interval,
        progress.repetitions,
        progress.nextReviewDate,
        progress.totalReviews,
        progress.correctReviews,
        progress.lastReviewedAt,
        progress.createdAt,
      ],
    );

    const card = await this.db.getFirstAsync<{ id: number }>(
      'SELECT id FROM card_progress WHERE word_type = ? AND word_id = ?',
      [wordType, wordId],
    );
    if (!card) return;

    // Replace (not append) the history so restoring twice stays idempotent.
    await this.db.runAsync(
      'DELETE FROM review_history WHERE card_progress_id = ?',
      [card.id],
    );
    for (const review of progress.reviews) {
      await this.db.runAsync(
        `INSERT INTO review_history (card_progress_id, quality, time_taken_ms, reviewed_at)
         VALUES (?, ?, ?, ?)`,
        [card.id, review.quality, review.timeTakenMs, review.reviewedAt],
      );
    }

    result.restoredCards += 1;
    result.restoredReviews += progress.reviews.length;
  }
}

export const backupService = new BackupService();
