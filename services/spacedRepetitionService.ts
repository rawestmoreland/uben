import { getDatabase } from '@/database/db';
import type { CardReview, DueCard, ReviewSession } from '@/types/database';

// ── SM-2 Core Algorithm ───────────────────────────────────────────────

/**
 * Calculate the next review state using the SM-2 algorithm.
 *
 * @param currentCard - Current card state (ease, interval, reps, next date)
 * @param quality     - User response quality (0-5)
 * @param reviewDate  - The date of the review (defaults to now)
 * @returns Updated card state with new ease, interval, reps, and next review date
 */
export function calculateNextReview(
  currentCard: CardReview,
  quality: number,
  reviewDate: Date = new Date(),
): CardReview {
  let { easeFactor, interval, repetitions } = currentCard;

  // Step 1: Update ease factor based on quality
  if (quality >= 3) {
    easeFactor =
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  }

  // Clamp ease factor to minimum of 1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Step 2: Update repetitions and interval
  if (quality < 3) {
    // Incorrect answer — reset
    repetitions = 0;
    interval = 0;
  } else {
    // Correct answer — grow interval
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1; // First correct: review tomorrow
    } else if (repetitions === 2) {
      interval = 6; // Second correct: review in 6 days
    } else {
      // Third+ correct: multiply by ease factor
      interval = Math.round(interval * easeFactor);
    }
  }

  // Step 3: Calculate next review date
  const nextReviewDate = new Date(reviewDate);
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReviewDate: nextReviewDate.toISOString().split('T')[0], // YYYY-MM-DD
  };
}

/**
 * Map a user's response to a quality score (0-5).
 *
 * - Wrong answer           → 0 (complete blackout)
 * - Correct, slow (>3s)    → 3 (with difficulty)
 * - Correct, medium (1-3s) → 4 (with hesitation)
 * - Correct, fast (<1s)    → 5 (perfect)
 */
export function getQualityFromResponse(
  isCorrect: boolean,
  responseTimeMs: number,
): number {
  if (!isCorrect) {
    return 0;
  }

  if (responseTimeMs < 1000) {
    return 5;
  } else if (responseTimeMs < 3000) {
    return 4;
  } else {
    return 3;
  }
}

// ── Database-Backed Operations ────────────────────────────────────────

/**
 * Service for spaced repetition operations.
 * Combines the SM-2 algorithm with database persistence.
 */
export class SpacedRepetitionService {
  private get db() {
    return getDatabase();
  }

  /**
   * Record a review result for a card.
   * Updates card_progress and inserts a review_history entry in a transaction.
   */
  async recordReview(
    cardProgressId: number,
    quality: number,
    timeTakenMs: number,
  ): Promise<void> {
    const currentCard = await this.db.getFirstAsync<{
      ease_factor: number;
      interval: number;
      repetitions: number;
      next_review_date: string;
    }>(
      'SELECT ease_factor, interval, repetitions, next_review_date FROM card_progress WHERE id = ?',
      [cardProgressId],
    );

    if (!currentCard) {
      throw new Error(`Card progress not found: ${cardProgressId}`);
    }

    const updated = calculateNextReview(
      {
        easeFactor: currentCard.ease_factor,
        interval: currentCard.interval,
        repetitions: currentCard.repetitions,
        nextReviewDate: currentCard.next_review_date,
      },
      quality,
    );

    await this.db.withTransactionAsync(async () => {
      // Update card progress
      await this.db.runAsync(
        `UPDATE card_progress
         SET ease_factor = ?,
             interval = ?,
             repetitions = ?,
             next_review_date = ?,
             total_reviews = total_reviews + 1,
             correct_reviews = correct_reviews + ?,
             last_reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          updated.easeFactor,
          updated.interval,
          updated.repetitions,
          updated.nextReviewDate,
          quality >= 3 ? 1 : 0,
          cardProgressId,
        ],
      );

      // Record in history for analytics
      await this.db.runAsync(
        `INSERT INTO review_history (card_progress_id, quality, time_taken_ms)
         VALUES (?, ?, ?)`,
        [cardProgressId, quality, timeTakenMs],
      );
    });
  }

  /**
   * Create a new card_progress entry for a word the user encounters for the first time.
   * The card starts with default SM-2 values and is due for review immediately.
   */
  async createCardForWord(
    wordType: 'noun' | 'verb',
    wordId: number,
  ): Promise<number> {
    const result = await this.db.runAsync(
      `INSERT OR IGNORE INTO card_progress (word_type, word_id, ease_factor, interval, repetitions, next_review_date)
       VALUES (?, ?, 2.5, 0, 0, date('now'))`,
      [wordType, wordId],
    );
    return result.lastInsertRowId;
  }

  /**
   * Build a daily review session containing due cards and new cards.
   * Optionally filter by category IDs for focused practice.
   */
  async getDailyReviewSession(
    maxCards: number = 20,
    newCardsLimit: number = 5,
    categoryIds?: number[],
  ): Promise<ReviewSession> {
    // Build category filter
    const categoryFilter =
      categoryIds && categoryIds.length > 0
        ? `AND n.category_id IN (${categoryIds.map(() => '?').join(',')})`
        : '';

    // Due cards (already in the review system)
    const dueParams =
      categoryIds && categoryIds.length > 0
        ? [...categoryIds, maxCards - newCardsLimit]
        : [maxCards - newCardsLimit];

    const dueCards = await this.db.getAllAsync<DueCard>(
      `SELECT cp.*, n.german AS word, n.article, n.english
       FROM card_progress cp
       JOIN nouns n ON cp.word_type = 'noun' AND cp.word_id = n.id
       WHERE cp.next_review_date <= date('now') ${categoryFilter}
       ORDER BY cp.next_review_date ASC
       LIMIT ?`,
      dueParams,
    );

    // New cards (words not yet in card_progress)
    const newParams =
      categoryIds && categoryIds.length > 0
        ? [...categoryIds, newCardsLimit]
        : [newCardsLimit];

    const newCards = await this.db.getAllAsync<DueCard>(
      `SELECT
         0 AS id,
         'noun' AS word_type,
         n.id AS word_id,
         2.5 AS ease_factor,
         0 AS interval,
         0 AS repetitions,
         date('now') AS next_review_date,
         0 AS total_reviews,
         0 AS correct_reviews,
         NULL AS last_reviewed_at,
         n.created_at,
         n.german AS word,
         n.article,
         n.english
       FROM nouns n
       LEFT JOIN card_progress cp ON cp.word_type = 'noun' AND cp.word_id = n.id
       WHERE cp.id IS NULL AND (n.level = 'A1' OR n.is_user_added = 1) ${categoryFilter}
       ORDER BY RANDOM()
       LIMIT ?`,
      newParams,
    );

    return {
      cards: [...dueCards, ...newCards],
      dueCount: dueCards.length,
      newCount: newCards.length,
    };
  }

  /**
   * Check if the user has completed at least one review today.
   */
  async hasReviewedToday(): Promise<boolean> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM review_history
       WHERE date(reviewed_at) = date('now')`,
    );

    return (result?.count ?? 0) > 0;
  }

  /**
   * Get the user's current study streak (consecutive days with at least one review).
   * Allows a grace period for the current day - streak is only broken if the most recent
   * review is 2+ days old.
   */
  async getStudyStreak(): Promise<number> {
    const reviews = await this.db.getAllAsync<{ review_date: string }>(
      `SELECT DISTINCT date(reviewed_at) AS review_date
       FROM review_history
       ORDER BY review_date DESC
       LIMIT 365`,
    );

    if (reviews.length === 0) return 0;

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // Check the most recent review date
    const mostRecentReviewDate = new Date(reviews[0].review_date);
    mostRecentReviewDate.setHours(0, 0, 0, 0);

    const daysSinceMostRecent = Math.floor(
      (currentDate.getTime() - mostRecentReviewDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // If most recent review is 2+ days ago, streak is broken
    if (daysSinceMostRecent >= 2) {
      return 0;
    }

    // Start counting streak from the most recent review day
    // This allows a grace period for the current day
    let streak = 0;
    let expectedDaysDiff = daysSinceMostRecent; // 0 if reviewed today, 1 if reviewed yesterday

    for (const review of reviews) {
      const reviewDate = new Date(review.review_date);
      reviewDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (currentDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff === expectedDaysDiff) {
        streak++;
        expectedDaysDiff++;
      } else if (daysDiff > expectedDaysDiff) {
        break; // Gap detected, streak ends
      }
    }

    return streak;
  }
}

/** Singleton instance for use across the app */
export const spacedRepetitionService = new SpacedRepetitionService();
