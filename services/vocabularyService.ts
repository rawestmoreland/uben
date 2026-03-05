import { getDatabase } from '@/database/db';
import type {
  Category,
  DueCard,
  Noun,
  UserNounInput,
  UserNounWithCategory,
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
   * Check if a noun with the given German word and article already exists.
   * Used for real-time duplicate validation in the add word form.
   */
  async checkNounExists(
    german: string,
    article: string,
  ): Promise<{ exists: boolean; isUserAdded?: boolean }> {
    const existing = await this.db.getFirstAsync<{ is_user_added: number }>(
      'SELECT is_user_added FROM nouns WHERE german = ? AND article = ?',
      [german, article],
    );
    if (existing) {
      return { exists: true, isUserAdded: !!existing.is_user_added };
    }
    return { exists: false };
  }

  /**
   * Add a user-created noun to the database.
   * Validates that the category exists before insertion.
   * If the word already exists (e.g. from seed data), returns a specific
   * message so the UI can inform the user.
   */
  async addUserNoun(
    noun: UserNounInput,
  ): Promise<{ success: boolean; id?: number; error?: string; existingId?: number }> {
    // Validate category exists
    const categoryExists = await this.db.getFirstAsync<{ '1': number }>(
      'SELECT 1 FROM categories WHERE id = ?',
      [noun.category_id],
    );

    if (!categoryExists) {
      return {
        success: false,
        error: 'Invalid category selected',
      };
    }

    // Check if the word already exists before attempting insert
    const existing = await this.db.getFirstAsync<{ id: number; is_user_added: number }>(
      'SELECT id, is_user_added FROM nouns WHERE german = ? AND article = ?',
      [noun.german, noun.article],
    );

    if (existing) {
      return {
        success: false,
        existingId: existing.id,
        error: existing.is_user_added
          ? 'You have already added this word'
          : 'This word is already in your vocabulary',
      };
    }

    try {
      const result = await this.db.runAsync(
        `INSERT INTO nouns (german, article, category_id, plural, english, is_user_added)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          noun.german,
          noun.article,
          noun.category_id,
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
          error: 'This word already exists in your vocabulary',
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
   * Get all nouns, optionally filtered by level and/or category.
   */
  async getNouns(options?: {
    level?: string;
    categoryId?: number;
  }): Promise<Noun[]> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.level) {
      conditions.push('level = ?');
      params.push(options.level);
    }

    if (options?.categoryId) {
      conditions.push('category_id = ?');
      params.push(options.categoryId);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return await this.db.getAllAsync<Noun>(
      `SELECT * FROM nouns ${whereClause} ORDER BY german`,
      params,
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

  /**
   * Get all categories, ordered by display_order.
   * Used for populating category selectors in UI.
   */
  async getCategories(): Promise<Category[]> {
    return await this.db.getAllAsync<Category>(
      'SELECT * FROM categories ORDER BY display_order ASC',
    );
  }

  /**
   * Get all categories with their word counts.
   * Used for category selection screen.
   */
  async getCategoriesWithCounts(): Promise<
    (Category & { wordCount: number })[]
  > {
    return await this.db.getAllAsync<Category & { wordCount: number }>(
      `SELECT c.*, COUNT(n.id) as wordCount
       FROM categories c
       LEFT JOIN nouns n ON n.category_id = c.id
       GROUP BY c.id
       ORDER BY c.display_order ASC`,
    );
  }

  /**
   * Get a single category by ID.
   */
  async getCategoryById(id: number): Promise<Category | null> {
    return await this.db.getFirstAsync<Category>(
      'SELECT * FROM categories WHERE id = ?',
      [id],
    );
  }

  /**
   * Get random words filtered by level and optionally by category.
   * Useful for focused practice sessions.
   */
  async getRandomNewWords(
    level: string,
    count: number = 10,
    categoryId?: number,
  ): Promise<Noun[]> {
    const categoryFilter = categoryId ? 'AND n.category_id = ?' : '';
    const params = categoryId ? [level, categoryId, count] : [level, count];

    return await this.db.getAllAsync<Noun>(
      `
      SELECT n.*
      FROM nouns n
      LEFT JOIN card_progress cp
        ON cp.word_type = 'noun' AND cp.word_id = n.id
      WHERE n.level = ? ${categoryFilter} AND cp.id IS NULL
      ORDER BY RANDOM()
      LIMIT ?
      `,
      params,
    );
  }

  /**
   * Get all user-added nouns, joined with their category display name.
   * Ordered by most recently added first.
   */
  async getUserNouns(): Promise<UserNounWithCategory[]> {
    return await this.db.getAllAsync<UserNounWithCategory>(
      `SELECT n.*, c.display_name AS category_display_name
       FROM nouns n
       JOIN categories c ON n.category_id = c.id
       WHERE n.is_user_added = 1
       ORDER BY n.created_at DESC`,
    );
  }

  /**
   * Get the count of user-added nouns.
   */
  async getUserNounCount(): Promise<number> {
    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM nouns WHERE is_user_added = 1',
    );
    return result?.count ?? 0;
  }

  /**
   * Delete a user-added noun and its associated card_progress / review_history.
   * Only deletes nouns where is_user_added = 1 to prevent accidental
   * deletion of seed data.
   */
  async deleteUserNoun(id: number): Promise<{ success: boolean; error?: string }> {
    // Safety check: only allow deleting user-added nouns
    const noun = await this.db.getFirstAsync<{ is_user_added: number }>(
      'SELECT is_user_added FROM nouns WHERE id = ?',
      [id],
    );

    if (!noun) {
      return { success: false, error: 'Word not found' };
    }

    if (!noun.is_user_added) {
      return { success: false, error: 'Cannot delete built-in vocabulary' };
    }

    await this.db.withTransactionAsync(async () => {
      // Delete review_history entries for this word's card_progress
      await this.db.runAsync(
        `DELETE FROM review_history
         WHERE card_progress_id IN (
           SELECT id FROM card_progress
           WHERE word_type = 'noun' AND word_id = ?
         )`,
        [id],
      );

      // Delete card_progress for this word
      await this.db.runAsync(
        `DELETE FROM card_progress
         WHERE word_type = 'noun' AND word_id = ?`,
        [id],
      );

      // Delete the noun itself
      await this.db.runAsync('DELETE FROM nouns WHERE id = ?', [id]);
    });

    return { success: true };
  }
}

/** Singleton instance for use across the app */
export const vocabularyService = new VocabularyService();
