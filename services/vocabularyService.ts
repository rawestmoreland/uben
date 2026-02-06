import { getDatabase } from '@/database/db';
import type {
  DueCard,
  Noun,
  UserNounInput,
  UserStats,
} from '@/types/database';

/**
 * Service for vocabulary CRUD and query operations.
 * All methods use the singleton database connection.
 */
export class VocabularyService {
  private get db() {
    return getDatabase();
  }

  /**
   * Get cards that are due for review today (or overdue).
   * Joins card_progress with the underlying word table.
   */
  async getDueCards(limit: number = 20): Promise<DueCard[]> {
    return await this.db.getAllAsync<DueCard>(
      `
      SELECT
        cp.*,
        CASE
          WHEN cp.word_type = 'noun' THEN n.german
          WHEN cp.word_type = 'verb' THEN v.infinitive
        END AS word,
        CASE
          WHEN cp.word_type = 'noun' THEN n.article
        END AS article
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

  /**
   * Get random words at the given level that have never been reviewed.
   * Useful for introducing new vocabulary into the study session.
   */
  async getRandomNewWords(
    level: string,
    count: number = 10,
  ): Promise<Noun[]> {
    return await this.db.getAllAsync<Noun>(
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

  /**
   * Add a user-created noun to the database.
   * Returns success/failure with an error message for duplicates.
   */
  async addUserNoun(
    noun: UserNounInput,
  ): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      const result = await this.db.runAsync(
        `INSERT INTO nouns (german, article, plural, english, is_user_added)
         VALUES (?, ?, ?, ?, 1)`,
        [
          noun.german,
          noun.article,
          noun.plural ?? null,
          noun.english ?? null,
        ],
      );
      return { success: true, id: result.lastInsertRowId };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      if (message.includes('UNIQUE constraint')) {
        return {
          success: false,
          error: 'This word already exists in the database',
        };
      }
      throw error;
    }
  }

  /**
   * Get aggregated statistics across all card progress records.
   */
  async getUserStats(): Promise<UserStats> {
    const stats = await this.db.getFirstAsync<UserStats>(`
      SELECT
        COUNT(*) AS total_cards,
        COALESCE(SUM(total_reviews), 0) AS total_reviews,
        COALESCE(SUM(correct_reviews), 0) AS correct_reviews,
        ROUND(
          100.0 * SUM(correct_reviews) / NULLIF(SUM(total_reviews), 0),
          1
        ) AS success_rate,
        COUNT(
          CASE WHEN next_review_date <= date('now') THEN 1 END
        ) AS due_today
      FROM card_progress
    `);

    return (
      stats ?? {
        total_cards: 0,
        total_reviews: 0,
        correct_reviews: 0,
        success_rate: null,
        due_today: 0,
      }
    );
  }

  /**
   * Get all nouns, optionally filtered by level.
   */
  async getNouns(level?: string): Promise<Noun[]> {
    if (level) {
      return await this.db.getAllAsync<Noun>(
        'SELECT * FROM nouns WHERE level = ? ORDER BY german',
        [level],
      );
    }
    return await this.db.getAllAsync<Noun>(
      'SELECT * FROM nouns ORDER BY german',
    );
  }

  /**
   * Get the total count of nouns in the database.
   */
  async getNounCount(): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM nouns',
    );
    return result?.count ?? 0;
  }
}

/** Singleton instance for use across the app */
export const vocabularyService = new VocabularyService();
