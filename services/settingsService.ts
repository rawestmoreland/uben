import { getDatabase } from '@/database/db';
import type { Setting } from '@/types/database';

// ── Settings Keys ─────────────────────────────────────────────────────

export const SETTINGS_KEYS = {
  SHOW_ENGLISH_HINT: 'show_english_hint',
  ESZETT_PREFERENCE: 'eszett_preference',
  SELECTED_CATEGORIES: 'selected_categories',
  SELECTED_LEVELS: 'selected_levels',
  APP_LANGUAGE: 'app_language',
  QUIZ_SESSIONS_COMPLETED: 'quiz_sessions_completed',
  LAST_REVIEW_REQUEST_DATE: 'last_review_request_date',
  INTERSTITIAL_SESSION_COUNT: 'interstitial_session_count',
  ADJECTIVE_DECLENSION_UNLOCKED: 'adjective_declension_unlocked',
  ADJECTIVE_DECLENSION_TRIAL_QUESTIONS_USED:
    'adjective_declension_trial_questions_used',
  PRO_UNLOCKED: 'pro_unlocked',
  PRO_GRANDFATHER_MIGRATION_DONE: 'pro_grandfather_migration_done',
  GRANDFATHERED_B_LEVEL: 'grandfathered_b_level',
  GRANDFATHERED_WORD_CAP: 'grandfathered_word_cap',
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

  // ── Convenience: Selected Levels ──────────────────────────────────

  /** Get selected CEFR levels for focused practice. Returns ['A1'] if never set. */
  async getSelectedLevels(): Promise<string[]> {
    const value = await this.getSetting(SETTINGS_KEYS.SELECTED_LEVELS);
    if (!value) return ['A1'];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['A1'];
    } catch {
      return ['A1'];
    }
  }

  /** Save selected CEFR levels. Pass empty array for "all levels". */
  async setSelectedLevels(levels: string[]): Promise<void> {
    await this.setSetting(
      SETTINGS_KEYS.SELECTED_LEVELS,
      JSON.stringify(levels),
    );
  }

  // ── Convenience: App Language ──────────────────────────────────────

  /** App display language. Default: 'en'. */
  async getAppLanguage(): Promise<'en' | 'it' | 'pl'> {
    const value = await this.getSetting(SETTINGS_KEYS.APP_LANGUAGE);
    if (value === 'it' || value === 'pl') return value;
    return 'en';
  }

  async setAppLanguage(language: 'en' | 'it' | 'pl'): Promise<void> {
    await this.setSetting(SETTINGS_KEYS.APP_LANGUAGE, language);
  }

  // ── Convenience: Interstitial Ad Session Count ────────────────────

  /** Number of quiz sessions completed since the last interstitial ad was shown. */
  async getInterstitialSessionCount(): Promise<number> {
    const value = await this.getSetting(SETTINGS_KEYS.INTERSTITIAL_SESSION_COUNT);
    return value ? parseInt(value, 10) : 0;
  }

  async setInterstitialSessionCount(count: number): Promise<void> {
    await this.setSetting(
      SETTINGS_KEYS.INTERSTITIAL_SESSION_COUNT,
      String(count),
    );
  }

  // ── Convenience: Üben Pro Unlock ───────────────────────────────────
  // An offline-fast-path cache of the RevenueCat entitlement (see
  // purchaseService.ts), written through on every successful purchase,
  // restore, customer-info check, or customer-info update event.

  /** Whether the Üben Pro bundle (no ads, B-level words, unlimited words, adjective endings) is unlocked. */
  async getProUnlocked(): Promise<boolean> {
    const value = await this.getSetting(SETTINGS_KEYS.PRO_UNLOCKED);
    if (value === 'true') return true;
    // Legacy: some installs unlocked adjective declension only, before it
    // was folded into the Pro bundle. Honor that purchase as full Pro.
    const legacy = await this.getSetting(
      SETTINGS_KEYS.ADJECTIVE_DECLENSION_UNLOCKED,
    );
    return legacy === 'true';
  }

  async setProUnlocked(unlocked: boolean): Promise<void> {
    await this.setSetting(
      SETTINGS_KEYS.PRO_UNLOCKED,
      unlocked ? 'true' : 'false',
    );
  }

  // ── Convenience: Pro Bundle Grandfathering ─────────────────────────
  // One-time migration flags set on first launch after the Pro bundle
  // shipped, so users who already had B1+ selected or more than the new
  // free word cap keep what they had rather than being locked out.

  async getProGrandfatherMigrationDone(): Promise<boolean> {
    const value = await this.getSetting(
      SETTINGS_KEYS.PRO_GRANDFATHER_MIGRATION_DONE,
    );
    return value === 'true';
  }

  async setProGrandfatherMigrationDone(done: boolean): Promise<void> {
    await this.setSetting(
      SETTINGS_KEYS.PRO_GRANDFATHER_MIGRATION_DONE,
      done ? 'true' : 'false',
    );
  }

  async getGrandfatheredBLevel(): Promise<boolean> {
    const value = await this.getSetting(SETTINGS_KEYS.GRANDFATHERED_B_LEVEL);
    return value === 'true';
  }

  async setGrandfatheredBLevel(grandfathered: boolean): Promise<void> {
    await this.setSetting(
      SETTINGS_KEYS.GRANDFATHERED_B_LEVEL,
      grandfathered ? 'true' : 'false',
    );
  }

  async getGrandfatheredWordCap(): Promise<boolean> {
    const value = await this.getSetting(SETTINGS_KEYS.GRANDFATHERED_WORD_CAP);
    return value === 'true';
  }

  async setGrandfatheredWordCap(grandfathered: boolean): Promise<void> {
    await this.setSetting(
      SETTINGS_KEYS.GRANDFATHERED_WORD_CAP,
      grandfathered ? 'true' : 'false',
    );
  }

  // ── Convenience: Adjective Endings Free Trial ─────────────────────
  // A lifetime (not daily) counter: once spent, it never replenishes on
  // its own — the whole point is a one-time taste before the paywall.

  /** Total free trial questions answered so far (lifetime, not per-session). */
  async getAdjectiveDeclensionTrialQuestionsUsed(): Promise<number> {
    const value = await this.getSetting(
      SETTINGS_KEYS.ADJECTIVE_DECLENSION_TRIAL_QUESTIONS_USED,
    );
    return value ? parseInt(value, 10) : 0;
  }

  async setAdjectiveDeclensionTrialQuestionsUsed(count: number): Promise<void> {
    await this.setSetting(
      SETTINGS_KEYS.ADJECTIVE_DECLENSION_TRIAL_QUESTIONS_USED,
      String(count),
    );
  }

}

export const settingsService = new SettingsService();
