import { getDatabase } from '@/database/db';
import type { Setting } from '@/types/database';

// ── Settings Keys ─────────────────────────────────────────────────────

export const SETTINGS_KEYS = {
  SHOW_ENGLISH_HINT: 'show_english_hint',
  ESZETT_PREFERENCE: 'eszett_preference',
  SELECTED_CATEGORIES: 'selected_categories',
  APP_LANGUAGE: 'app_language',
} as const;

// ── Settings Service ──────────────────────────────────────────────────

class SettingsService {
  private db = getDatabase();

  /** Read a setting value by key. Returns `null` if not set. */
  async getSetting(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<Setting>(
      'SELECT * FROM settings WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  }

  /** Upsert a setting value. */
  async setSetting(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
      [key, value],
    );
  }

  // ── Convenience: Show English Hint ────────────────────────────────

  /** Whether to show the English translation during the quiz. Default: true. */
  async getShowEnglishHint(): Promise<boolean> {
    const value = await this.getSetting(SETTINGS_KEYS.SHOW_ENGLISH_HINT);
    // Default to true if never set
    return value !== 'false';
  }

  async setShowEnglishHint(enabled: boolean): Promise<void> {
    await this.setSetting(
      SETTINGS_KEYS.SHOW_ENGLISH_HINT,
      enabled ? 'true' : 'false',
    );
  }

  // ── Convenience: Eszett Preference ────────────────────────────────

  /** German spelling preference: 'eszett' (ß) or 'ss' (Swiss). Default: 'eszett'. */
  async getEszettPreference(): Promise<'eszett' | 'ss'> {
    const value = await this.getSetting(SETTINGS_KEYS.ESZETT_PREFERENCE);
    return value === 'ss' ? 'ss' : 'eszett';
  }

  async setEszettPreference(preference: 'eszett' | 'ss'): Promise<void> {
    await this.setSetting(SETTINGS_KEYS.ESZETT_PREFERENCE, preference);
  }

  // ── Convenience: Selected Categories ──────────────────────────────

  /** Get selected category IDs for focused practice. Returns empty array for "all categories". */
  async getSelectedCategories(): Promise<number[]> {
    const value = await this.getSetting(SETTINGS_KEYS.SELECTED_CATEGORIES);
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** Save selected category IDs. Pass empty array for "all categories". */
  async setSelectedCategories(categoryIds: number[]): Promise<void> {
    await this.setSetting(
      SETTINGS_KEYS.SELECTED_CATEGORIES,
      JSON.stringify(categoryIds),
    );
  }

  // ── Convenience: App Language ──────────────────────────────────────

  /** App display language. Default: 'en'. */
  async getAppLanguage(): Promise<'en' | 'it'> {
    const value = await this.getSetting(SETTINGS_KEYS.APP_LANGUAGE);
    return value === 'it' ? 'it' : 'en';
  }

  async setAppLanguage(language: 'en' | 'it'): Promise<void> {
    await this.setSetting(SETTINGS_KEYS.APP_LANGUAGE, language);
  }
}

export const settingsService = new SettingsService();
