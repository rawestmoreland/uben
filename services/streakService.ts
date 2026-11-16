import { getDatabase } from '@/database/db';
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  hasStudiedOn,
  toLocalDayKey,
} from '@/utils/streak';

/**
 * Study streak, Duolingo-style (rules live in `utils/streak.ts`).
 *
 * A "study day" is a local calendar day with at least one *finished* quiz
 * session, stored in `study_days`. Answering cards without finishing the
 * session does not count.
 */
export class StreakService {
  private get db() {
    return getDatabase();
  }

  /**
   * Record that the user finished a session now. Idempotent per day, so
   * calling it for a second session (or twice for the same one) is harmless.
   */
  async recordStudyDay(now: Date = new Date()): Promise<void> {
    await this.db.runAsync(
      'INSERT OR IGNORE INTO study_days (day) VALUES (?)',
      [toLocalDayKey(now)],
    );
  }

  /** Current streak in days (0 when a full local day has been missed). */
  async getCurrentStreak(now: Date = new Date()): Promise<number> {
    return calculateCurrentStreak(
      await this.getStudyDays(),
      toLocalDayKey(now),
    );
  }

  /** Longest streak ever, in days. */
  async getLongestStreak(): Promise<number> {
    return calculateLongestStreak(await this.getStudyDays());
  }

  /** Whether a session has been finished on today's local calendar day. */
  async hasStudiedToday(now: Date = new Date()): Promise<boolean> {
    return hasStudiedOn(await this.getStudyDays(), toLocalDayKey(now));
  }

  private async getStudyDays(): Promise<string[]> {
    const rows = await this.db.getAllAsync<{ day: string }>(
      'SELECT day FROM study_days ORDER BY day ASC',
    );
    return rows.map((row) => row.day);
  }
}

/** Singleton instance for use across the app */
export const streakService = new StreakService();
