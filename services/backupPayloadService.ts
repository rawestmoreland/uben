import type { SQLiteDatabase } from 'expo-sqlite';
import {
  BACKUP_PAYLOAD_VERSION,
  type BackupAdjectiveTuple,
  type BackupCardKey,
  type BackupCardTuple,
  type BackupCardType,
  type BackupNounTuple,
  type BackupPayload,
  type BackupPayloadErrorCode,
  type BackupReviewTuple,
  type BackupVerbTuple,
  type RestoreSummary,
} from '@/types/backup';

/**
 * Builds and restores the portable cloud-backup snapshot. Pure database work:
 * it takes the `db` handle so it can run against an in-memory SQLite in tests
 * and never touches the network.
 *
 * Portability rule: the payload never contains a local integer ID. A card is
 * identified by the word it belongs to, so restoring on a fresh install maps
 * each card onto that install's own rows.
 */

/**
 * Settings that are safe to carry to another install. Left out on purpose:
 * `pro_unlocked` / promo flags (RevenueCat owns entitlement), `selected_categories`
 * (local IDs), ad / review-prompt counters (per install), and `app_language` and
 * reminders (restoring them needs side effects: a translation download and a
 * notification permission prompt).
 */
export const BACKUP_SETTING_KEYS = [
  'show_english_hint',
  'eszett_preference',
  'selected_levels',
  'adjective_declension_difficulty',
  'verb_preposition_case_step',
  'plural_notation_hint_seen',
] as const;

export class BackupPayloadError extends Error {
  constructor(
    public readonly code: BackupPayloadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BackupPayloadError';
  }
}

// ── Row shapes ────────────────────────────────────────────────────────

interface CardRow {
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

// ── Build ─────────────────────────────────────────────────────────────

/** Card queries per type: each selects the card columns plus the word's natural key. */
const CARD_QUERIES: Record<
  BackupCardType,
  { sql: string; key: (row: Record<string, unknown>) => BackupCardKey }
> = {
  noun: {
    sql: `SELECT cp.*, n.german AS k1, n.article AS k2, n.sense AS k3
          FROM card_progress cp JOIN nouns n ON cp.word_id = n.id
          WHERE cp.word_type = 'noun'`,
    key: (r) => [r.k1 as string, r.k2 as string, (r.k3 as string | null) ?? null],
  },
  noun_plural: {
    sql: `SELECT cp.*, n.german AS k1, n.article AS k2, n.sense AS k3
          FROM card_progress cp JOIN nouns n ON cp.word_id = n.id
          WHERE cp.word_type = 'noun_plural'`,
    key: (r) => [r.k1 as string, r.k2 as string, (r.k3 as string | null) ?? null],
  },
  adjective: {
    sql: `SELECT cp.*, a.german AS k1
          FROM card_progress cp JOIN adjectives a ON cp.word_id = a.id
          WHERE cp.word_type = 'adjective'`,
    key: (r) => [r.k1 as string],
  },
  verb: {
    sql: `SELECT cp.*, v.infinitive AS k1
          FROM card_progress cp JOIN verbs v ON cp.word_id = v.id
          WHERE cp.word_type = 'verb'`,
    key: (r) => [r.k1 as string],
  },
  verb_prep: {
    sql: `SELECT cp.*, vp.kind AS k1, vp.verb AS k2, vp.is_reflexive AS k3,
                 vp.preposition AS k4, vp.sentence AS k5
          FROM card_progress cp JOIN verb_prepositions vp ON cp.word_id = vp.id
          WHERE cp.word_type = 'verb_prep'`,
    key: (r) => [
      r.k1 as string,
      r.k2 as string,
      r.k3 ? 1 : 0,
      r.k4 as string,
      r.k5 as string,
    ],
  },
  verb_prep_compound: {
    sql: `SELECT cp.*, vp.kind AS k1, vp.verb AS k2, vp.is_reflexive AS k3,
                 vp.preposition AS k4, vp.sentence AS k5, vpc.form AS k6
          FROM card_progress cp
          JOIN verb_preposition_compounds vpc ON cp.word_id = vpc.id
          JOIN verb_prepositions vp ON vpc.verb_preposition_id = vp.id
          WHERE cp.word_type = 'verb_prep_compound'`,
    key: (r) => [
      r.k1 as string,
      r.k2 as string,
      r.k3 ? 1 : 0,
      r.k4 as string,
      r.k5 as string,
      r.k6 as string,
    ],
  },
};

/** Snapshot all progress, user-added words and portable settings. */
export async function buildBackupPayload(
  db: SQLiteDatabase,
): Promise<BackupPayload> {
  const historyByCard = new Map<number, BackupReviewTuple[]>();
  const historyRows = await db.getAllAsync<{
    card_progress_id: number;
    quality: number;
    time_taken_ms: number | null;
    reviewed_at: string;
  }>(
    `SELECT card_progress_id, quality, time_taken_ms, reviewed_at
     FROM review_history ORDER BY reviewed_at ASC, id ASC`,
  );
  for (const row of historyRows) {
    const list = historyByCard.get(row.card_progress_id) ?? [];
    list.push([row.quality, row.time_taken_ms ?? null, row.reviewed_at]);
    historyByCard.set(row.card_progress_id, list);
  }

  const cards: BackupCardTuple[] = [];
  for (const [type, query] of Object.entries(CARD_QUERIES) as [
    BackupCardType,
    (typeof CARD_QUERIES)[BackupCardType],
  ][]) {
    const rows = await db.getAllAsync<CardRow & Record<string, unknown>>(
      query.sql,
    );
    for (const row of rows) {
      cards.push([
        type,
        query.key(row),
        row.ease_factor,
        row.interval,
        row.repetitions,
        row.next_review_date,
        row.total_reviews,
        row.correct_reviews,
        row.last_reviewed_at ?? null,
        row.created_at,
        historyByCard.get(row.id) ?? [],
      ]);
    }
  }

  const nouns = await db.getAllAsync<{
    german: string;
    article: string;
    article_alt: string | null;
    plural: string | null;
    english: string | null;
    level: string | null;
    category: string | null;
  }>(
    `SELECT n.german, n.article, n.article_alt, n.plural, n.english, n.level,
            c.name AS category
     FROM nouns n LEFT JOIN categories c ON c.id = n.category_id
     WHERE n.is_user_added = 1 ORDER BY n.id`,
  );
  const adjectives = await db.getAllAsync<{
    german: string;
    english: string;
    level: string | null;
  }>(
    'SELECT german, english, level FROM adjectives WHERE is_user_added = 1 ORDER BY id',
  );
  const verbs = await db.getAllAsync<{
    infinitive: string;
    past_tense: string | null;
    past_du: string | null;
    past_wir: string | null;
    past_ihr: string | null;
    past_sie: string | null;
    past_participle: string | null;
    english: string | null;
    is_separable: number;
    level: string | null;
  }>('SELECT * FROM verbs WHERE is_user_added = 1 ORDER BY id');

  const settings: Record<string, string> = {};
  for (const key of BACKUP_SETTING_KEYS) {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    if (row) settings[key] = row.value;
  }

  return {
    version: BACKUP_PAYLOAD_VERSION,
    createdAt: new Date().toISOString(),
    settings,
    nouns: nouns.map(
      (n): BackupNounTuple => [
        n.german,
        n.article,
        n.article_alt ?? null,
        n.plural ?? null,
        n.english ?? null,
        n.level ?? null,
        n.category ?? null,
      ],
    ),
    adjectives: adjectives.map(
      (a): BackupAdjectiveTuple => [a.german, a.english, a.level ?? null],
    ),
    verbs: verbs.map(
      (v): BackupVerbTuple => [
        v.infinitive,
        v.past_tense ?? null,
        v.past_du ?? null,
        v.past_wir ?? null,
        v.past_ihr ?? null,
        v.past_sie ?? null,
        v.past_participle ?? null,
        v.english ?? null,
        v.is_separable ? 1 : 0,
        v.level ?? null,
      ],
    ),
    cards,
  };
}

// ── Validate ──────────────────────────────────────────────────────────

/**
 * Check a downloaded payload is something this app can restore. Throws a
 * `BackupPayloadError`; individual malformed cards are skipped at restore
 * time instead, so one bad row can't block a whole restore.
 */
export function assertRestorablePayload(
  value: unknown,
): asserts value is BackupPayload {
  if (!value || typeof value !== 'object') {
    throw new BackupPayloadError('invalid', 'Backup is not an object');
  }
  const payload = value as Partial<BackupPayload>;
  if (typeof payload.version !== 'number' || payload.version < 1) {
    throw new BackupPayloadError('invalid', 'Backup has no version');
  }
  if (payload.version > BACKUP_PAYLOAD_VERSION) {
    throw new BackupPayloadError(
      'unsupported_version',
      `Backup version ${payload.version} is newer than this app understands`,
    );
  }
  if (
    !Array.isArray(payload.cards) ||
    !Array.isArray(payload.nouns) ||
    !Array.isArray(payload.adjectives) ||
    !Array.isArray(payload.verbs) ||
    !payload.settings ||
    typeof payload.settings !== 'object'
  ) {
    throw new BackupPayloadError('invalid', 'Backup is missing sections');
  }
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isValidCard(card: unknown): card is BackupCardTuple {
  if (!Array.isArray(card) || card.length !== 11) return false;
  const [type, key, ease, interval, reps, nextReview, total, correct] = card;
  return (
    typeof type === 'string' &&
    type in CARD_QUERIES &&
    Array.isArray(key) &&
    key.length > 0 &&
    [ease, interval, reps, total, correct].every(
      (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0,
    ) &&
    typeof nextReview === 'string' &&
    DATE_ONLY.test(nextReview) &&
    Array.isArray(card[10])
  );
}

// ── Restore ───────────────────────────────────────────────────────────

/** Local row ID for a card's word, or null when this install doesn't have it. */
async function resolveWordId(
  db: SQLiteDatabase,
  type: BackupCardType,
  key: BackupCardKey,
): Promise<number | null> {
  let row: { id: number } | null = null;
  switch (type) {
    case 'noun':
    case 'noun_plural':
      row = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM nouns
         WHERE german = ? AND article = ? AND COALESCE(sense, '') = COALESCE(?, '')`,
        [key[0], key[1], key[2] ?? null],
      );
      break;
    case 'adjective':
      row = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM adjectives WHERE german = ?',
        [key[0]],
      );
      break;
    case 'verb':
      row = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM verbs WHERE infinitive = ?',
        [key[0]],
      );
      break;
    case 'verb_prep':
      row = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM verb_prepositions
         WHERE kind = ? AND verb = ? AND is_reflexive = ? AND preposition = ? AND sentence = ?`,
        key.slice(0, 5),
      );
      break;
    case 'verb_prep_compound':
      row = await db.getFirstAsync<{ id: number }>(
        `SELECT vpc.id FROM verb_preposition_compounds vpc
         JOIN verb_prepositions vp ON vp.id = vpc.verb_preposition_id
         WHERE vp.kind = ? AND vp.verb = ? AND vp.is_reflexive = ?
           AND vp.preposition = ? AND vp.sentence = ? AND vpc.form = ?`,
        key.slice(0, 6),
      );
      break;
  }
  return row?.id ?? null;
}

/** Re-create user-added words that this install doesn't have. Returns how many were added. */
async function restoreUserWords(
  db: SQLiteDatabase,
  payload: BackupPayload,
): Promise<number> {
  let added = 0;

  for (const noun of payload.nouns) {
    if (!Array.isArray(noun) || typeof noun[0] !== 'string') continue;
    const [german, article, articleAlt, plural, english, level, category] = noun;

    // The word may already exist (seeded, or user-added here): never duplicate.
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM nouns
       WHERE german = ? AND sense IS NULL
         AND (article IN (?, ?) OR article_alt IN (?, ?))`,
      [german, article, articleAlt ?? article, article, articleAlt ?? article],
    );
    if (existing) continue;

    const categoryRow =
      (category
        ? await db.getFirstAsync<{ id: number }>(
            'SELECT id FROM categories WHERE name = ?',
            [category],
          )
        : null) ??
      (await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM categories ORDER BY id LIMIT 1',
      ));
    if (!categoryRow) continue;

    const result = await db.runAsync(
      `INSERT OR IGNORE INTO nouns
         (german, article, article_alt, category_id, plural, english, level, is_user_added)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [german, article, articleAlt, categoryRow.id, plural, english, level],
    );
    added += result.changes;
  }

  for (const adjective of payload.adjectives) {
    if (!Array.isArray(adjective) || typeof adjective[0] !== 'string') continue;
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO adjectives (german, english, level, is_user_added)
       VALUES (?, ?, ?, 1)`,
      adjective,
    );
    added += result.changes;
  }

  for (const verb of payload.verbs) {
    if (!Array.isArray(verb) || typeof verb[0] !== 'string') continue;
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO verbs
         (infinitive, past_tense, past_du, past_wir, past_ihr, past_sie,
          past_participle, english, is_separable, level, is_user_added)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      verb,
    );
    added += result.changes;
  }

  return added;
}

/**
 * Apply a backup to this install in ONE transaction: if anything throws,
 * nothing is changed.
 *
 * A backed-up card overwrites the local card (and its review history) for the
 * same word. Cards for words this install doesn't have are skipped and
 * counted, not treated as errors.
 */
export async function restoreBackupPayload(
  db: SQLiteDatabase,
  payload: unknown,
): Promise<RestoreSummary> {
  assertRestorablePayload(payload);

  const summary: RestoreSummary = {
    restoredCards: 0,
    skippedCards: 0,
    addedWords: 0,
    restoredReviews: 0,
  };

  await db.withTransactionAsync(async () => {
    summary.addedWords = await restoreUserWords(db, payload);

    for (const card of payload.cards as unknown[]) {
      if (!isValidCard(card)) {
        summary.skippedCards += 1;
        continue;
      }
      const [type, key, ease, interval, reps, nextReview, total, correct] = card;
      const wordId = await resolveWordId(db, type, key);
      if (wordId === null) {
        summary.skippedCards += 1;
        continue;
      }

      await db.runAsync(
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
        [type, wordId, ease, interval, reps, nextReview, total, correct, card[8], card[9]],
      );
      const progress = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM card_progress WHERE word_type = ? AND word_id = ?',
        [type, wordId],
      );
      if (!progress) {
        summary.skippedCards += 1;
        continue;
      }

      // The backup is the source of truth for this card's history.
      await db.runAsync(
        'DELETE FROM review_history WHERE card_progress_id = ?',
        [progress.id],
      );
      for (const review of card[10]) {
        const [quality, timeTaken, reviewedAt] = review;
        if (
          !Number.isInteger(quality) ||
          quality < 0 ||
          quality > 5 ||
          typeof reviewedAt !== 'string'
        ) {
          continue;
        }
        await db.runAsync(
          `INSERT INTO review_history (card_progress_id, quality, time_taken_ms, reviewed_at)
           VALUES (?, ?, ?, ?)`,
          [progress.id, quality, timeTaken ?? null, reviewedAt],
        );
        summary.restoredReviews += 1;
      }
      summary.restoredCards += 1;
    }

    // Study days (the streak) are device-local and not part of the payload, so
    // rebuild them from the restored history: every day with a review counts,
    // the same grandfathering as migration 015.
    await db.runAsync(
      `INSERT OR IGNORE INTO study_days (day)
       SELECT DISTINCT date(reviewed_at, 'localtime') FROM review_history`,
    );

    for (const key of BACKUP_SETTING_KEYS) {
      const value = payload.settings[key];
      if (typeof value !== 'string') continue;
      await db.runAsync(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        [key, value],
      );
    }
  });

  return summary;
}
