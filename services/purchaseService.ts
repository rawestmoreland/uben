import { getDatabase } from '@/database/db';
import { settingsService } from './settingsService';

/**
 * Number of free adjective-endings questions a user can answer before
 * hitting the paywall. Lifetime, not per-session or per-day — the goal is a
 * one-time taste ("get them hooked"), not a recurring free allowance.
 */
export const ADJECTIVE_DECLENSION_TRIAL_QUESTION_LIMIT = 10;

/**
 * Free-tier cap on self-added words. Existing users who already had more
 * than this before the cap shipped are grandfathered in — see
 * `runProGrandfatherMigration`.
 */
export const PRO_FREE_WORD_LIMIT = 5;

/**
 * Entitlement layer for the "Üben Pro" bundle: no ads, B-level words,
 * unlimited added words, and adjective endings practice — all behind a
 * single one-time purchase.
 *
 * This is currently a LOCAL-ONLY STUB — there is no real payment processor
 * wired up yet. `purchasePro` just flips a local flag so the paywall and
 * every gated surface can be built and tested end-to-end. When RevenueCat
 * (react-native-purchases) is integrated, only the bodies of these methods
 * need to change to call the SDK and cache its result via settingsService —
 * callers don't need to change.
 */
class PurchaseService {
  /** Whether the Üben Pro bundle is unlocked (purchased). */
  async isProUnlocked(): Promise<boolean> {
    return settingsService.getProUnlocked();
  }

  /** How many free trial questions the user has left (0 once spent or once Pro is unlocked). */
  async getAdjectiveDeclensionTrialQuestionsRemaining(): Promise<number> {
    const unlocked = await this.isProUnlocked();
    if (unlocked) return 0;
    const used = await settingsService.getAdjectiveDeclensionTrialQuestionsUsed();
    return Math.max(0, ADJECTIVE_DECLENSION_TRIAL_QUESTION_LIMIT - used);
  }

  /**
   * Whether the user can enter the adjective endings quiz right now — either
   * they've purchased Pro, or they still have free trial questions left.
   */
  async canAccessAdjectiveDeclension(): Promise<boolean> {
    const unlocked = await this.isProUnlocked();
    if (unlocked) return true;
    const remaining = await this.getAdjectiveDeclensionTrialQuestionsRemaining();
    return remaining > 0;
  }

  /**
   * Record that one free trial question was answered. No-ops once the user
   * has purchased Pro (nothing left to meter) or the trial is already spent.
   */
  async recordAdjectiveDeclensionTrialQuestionUsed(): Promise<void> {
    const unlocked = await this.isProUnlocked();
    if (unlocked) return;
    const used = await settingsService.getAdjectiveDeclensionTrialQuestionsUsed();
    if (used >= ADJECTIVE_DECLENSION_TRIAL_QUESTION_LIMIT) return;
    await settingsService.setAdjectiveDeclensionTrialQuestionsUsed(used + 1);
  }

  /**
   * Complete a one-time purchase unlocking the full Üben Pro bundle.
   *
   * TODO(RevenueCat): replace this body with a real purchase flow —
   * `Purchases.purchasePackage(...)` against the `lifetime_pro` product,
   * then persist the resulting entitlement via settingsService.setProUnlocked
   * on success (checking `customerInfo.entitlements.active['üben_german_articles_pro']`).
   */
  async purchasePro(): Promise<{ success: boolean; error?: string }> {
    await settingsService.setProUnlocked(true);
    return { success: true };
  }

  /**
   * TODO(RevenueCat): replace with `Purchases.restorePurchases()` and sync
   * the resulting entitlement state via settingsService.
   */
  async restorePurchases(): Promise<{ success: boolean; error?: string }> {
    const unlocked = await settingsService.getProUnlocked();
    return { success: unlocked };
  }

  /**
   * One-time migration that runs on app startup: grandfathers in users who
   * already had B1+ selected, or already had more than the new free word
   * cap, before the Pro bundle (and its gates) shipped. Safe to call on
   * every launch — no-ops once it has already run.
   */
  async runProGrandfatherMigration(): Promise<void> {
    const alreadyDone = await settingsService.getProGrandfatherMigrationDone();
    if (alreadyDone) return;

    try {
      const selectedLevels = await settingsService.getSelectedLevels();
      if (selectedLevels.includes('B1+')) {
        await settingsService.setGrandfatheredBLevel(true);
      }

      const db = getDatabase();
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM nouns WHERE is_user_added = 1',
      );
      if ((result?.count ?? 0) > PRO_FREE_WORD_LIMIT) {
        await settingsService.setGrandfatheredWordCap(true);
      }

      await settingsService.setProGrandfatherMigrationDone(true);
    } catch (error) {
      console.error('[Purchase] Pro grandfather migration failed:', error);
    }
  }
}

export const purchaseService = new PurchaseService();
