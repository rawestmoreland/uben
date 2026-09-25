import { settingsService } from './settingsService';

/**
 * Number of free adjective-endings questions a user can answer before
 * hitting the paywall. Lifetime, not per-session or per-day — the goal is a
 * one-time taste ("get them hooked"), not a recurring free allowance.
 */
export const ADJECTIVE_DECLENSION_TRIAL_QUESTION_LIMIT = 10;

/**
 * Entitlement layer for premium, one-time-purchase features.
 *
 * This is currently a LOCAL-ONLY STUB — there is no real payment processor
 * wired up yet. `purchaseAdjectiveDeclension` just flips a local flag so the
 * feature and its paywall can be built and tested end-to-end. When RevenueCat
 * (react-native-purchases) is integrated, only the bodies of these methods
 * need to change to call the SDK and cache its result via settingsService —
 * callers (the paywall screen, the entry-point gate) don't need to change.
 */
class PurchaseService {
  /** Whether the adjective declension feature is unlocked (purchased). */
  async isAdjectiveDeclensionUnlocked(): Promise<boolean> {
    return settingsService.getAdjectiveDeclensionUnlocked();
  }

  /** How many free trial questions the user has left (0 once spent or once purchased). */
  async getAdjectiveDeclensionTrialQuestionsRemaining(): Promise<number> {
    const unlocked = await this.isAdjectiveDeclensionUnlocked();
    if (unlocked) return 0;
    const used = await settingsService.getAdjectiveDeclensionTrialQuestionsUsed();
    return Math.max(0, ADJECTIVE_DECLENSION_TRIAL_QUESTION_LIMIT - used);
  }

  /**
   * Whether the user can enter the adjective endings quiz right now — either
   * they've purchased it, or they still have free trial questions left.
   */
  async canAccessAdjectiveDeclension(): Promise<boolean> {
    const unlocked = await this.isAdjectiveDeclensionUnlocked();
    if (unlocked) return true;
    const remaining = await this.getAdjectiveDeclensionTrialQuestionsRemaining();
    return remaining > 0;
  }

  /**
   * Record that one free trial question was answered. No-ops once the user
   * has purchased (nothing left to meter) or the trial is already spent.
   */
  async recordAdjectiveDeclensionTrialQuestionUsed(): Promise<void> {
    const unlocked = await this.isAdjectiveDeclensionUnlocked();
    if (unlocked) return;
    const used = await settingsService.getAdjectiveDeclensionTrialQuestionsUsed();
    if (used >= ADJECTIVE_DECLENSION_TRIAL_QUESTION_LIMIT) return;
    await settingsService.setAdjectiveDeclensionTrialQuestionsUsed(used + 1);
  }

  /**
   * Complete a one-time purchase unlocking the adjective declension feature.
   *
   * TODO(RevenueCat): replace this body with a real purchase flow —
   * `Purchases.purchasePackage(...)`, then persist the resulting entitlement
   * via settingsService.setAdjectiveDeclensionUnlocked on success.
   */
  async purchaseAdjectiveDeclension(): Promise<{
    success: boolean;
    error?: string;
  }> {
    await settingsService.setAdjectiveDeclensionUnlocked(true);
    return { success: true };
  }

  /**
   * TODO(RevenueCat): replace with `Purchases.restorePurchases()` and sync
   * the resulting entitlement state via settingsService.
   */
  async restorePurchases(): Promise<{ success: boolean; error?: string }> {
    const unlocked = await settingsService.getAdjectiveDeclensionUnlocked();
    return { success: unlocked };
  }
}

export const purchaseService = new PurchaseService();
