import { getDatabase } from '@/database/db';

// ── Types ─────────────────────────────────────────────────────────────

/** Daily review count for the activity heatmap */
export interface DailyActivity {
  date: string; // YYYY-MM-DD
  count: number;
}

/** A word with a low success rate — shown in the "hardest words" section */
export interface HardWord {
  german: string;
  article: 'der' | 'die' | 'das';
  english: string | null;
  total_reviews: number;
  correct_reviews: number;
  success_rate: number | null;
}

// ── Service ───────────────────────────────────────────────────────────

/**
 * Service for aggregated statistics queries used on the progress screen.
 * Keeps analytics logic separate from core vocabulary/spaced-repetition services.
 */
export class StatisticsService {
  private get db() {
    return getDatabase();
  }

  /**
   * Get daily review counts for the last N days.
   * Only returns days that had at least one review — caller must fill gaps.
   */
  async getActivityData(days: number = 91): Promise<DailyActivity[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0]; // YYYY-MM-DD

    return await this.db.getAllAsync<DailyActivity>(
      `SELECT date(reviewed_at) AS date, COUNT(*) AS count
       FROM review_history
       WHERE date(reviewed_at) >= ?
       GROUP BY date(reviewed_at)
       ORDER BY date ASC`,
      [cutoffStr],
    );
  }

  /**
   * Get the words with the lowest success rates.
   * Only includes cards with at least `minReviews` total reviews to avoid noise.
   */
  async getHardestWords(
    minReviews: number = 3,
    limit: number = 8,
  ): Promise<HardWord[]> {
    return await this.db.getAllAsync<HardWord>(
      `SELECT
         n.german,
         n.article,
         n.english,
         cp.total_reviews,
         cp.correct_reviews,
         ROUND(100.0 * cp.correct_reviews / NULLIF(cp.total_reviews, 0), 1) AS success_rate
       FROM card_progress cp
       JOIN nouns n ON cp.word_type = 'noun' AND cp.word_id = n.id
       WHERE cp.total_reviews >= ?
       ORDER BY success_rate ASC, cp.total_reviews DESC
       LIMIT ?`,
      [minReviews, limit],
    );
  }

  /**
   * Count words considered "mastered" — interval of at least 21 days means
   * the card is solidly in long-term memory.
   */
  async getMasteredCount(): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM card_progress WHERE interval >= 21`,
    );
    return result?.count ?? 0;
  }

  /**
   * Compute the user's all-time longest study streak (in days).
   * Iterates over all distinct review dates in ascending order.
   */
  async getLongestStreak(): Promise<number> {
    const reviews = await this.db.getAllAsync<{ review_date: string }>(
      `SELECT DISTINCT date(reviewed_at) AS review_date
       FROM review_history
       ORDER BY review_date ASC`,
    );

    if (reviews.length === 0) return 0;

    let longest = 1;
    let current = 1;

    for (let i = 1; i < reviews.length; i++) {
      const prev = new Date(reviews[i - 1].review_date);
      const curr = new Date(reviews[i].review_date);
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        current++;
        if (current > longest) longest = current;
      } else {
        current = 1;
      }
    }

    return longest;
  }
}

/** Singleton instance for use across the app */
export const statisticsService = new StatisticsService();
