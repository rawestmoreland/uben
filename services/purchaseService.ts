import { getDatabase } from '@/database/db';
import Purchases, {
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { settingsService } from './settingsService';

/**
 * The RevenueCat entitlement identifier configured in the dashboard.
 *
 * Written as an explicit ü (U+00FC, precomposed "u with diaeresis")
 * escape rather than a literal character on purpose: the identifier
 * contains "ü", which can round-trip as either the precomposed codepoint or
 * "u" + a combining diaeresis (U+0308) — two byte sequences that render
 * identically but never string-match. Before shipping, copy the identifier
 * directly from the RevenueCat dashboard and confirm it matches this exact
 * escape (or update the escape to match) rather than retyping either one.
 */
export const PRO_ENTITLEMENT_ID = 'üben_german_articles_pro';

/** The one-time, non-consumable product that unlocks the Üben Pro bundle. */
export const LIFETIME_PRO_PRODUCT_ID = 'lifetime_pro';

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
 * single one-time purchase, backed by RevenueCat.
 *
 * `settingsService`'s `pro_unlocked` flag is kept as an offline-fast-path
 * cache of the entitlement RevenueCat reports, per the app's offline-first
 * architecture — it's written through on every successful RevenueCat call
 * and read as a fallback when the SDK call fails (no network, not
 * configured on web, etc).
 */
class PurchaseService {
  private isEntitlementActive(customerInfo: CustomerInfo): boolean {
    return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT_ID]);
  }

  /**
   * Cache the Pro entitlement state from a CustomerInfo payload. Also used
   * by the app-wide `addCustomerInfoUpdateListener` in `app/_layout.tsx` so
   * a purchase or restore completed outside this session's own flow (e.g.
   * from another device, or via the App/Play Store directly) updates the
   * cache immediately.
   */
  async syncCustomerInfo(customerInfo: CustomerInfo): Promise<boolean> {
    const unlocked = this.isEntitlementActive(customerInfo);
    await settingsService.setProUnlocked(unlocked);
    return unlocked;
  }

  private isUserCancelledError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const purchasesError = error as Partial<PurchasesError>;
    return (
      purchasesError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
      purchasesError.userCancelled === true
    );
  }

  /** Finds the `lifetime_pro` package, checked across the current offering first, then all configured offerings. */
  private findLifetimePackage(
    offerings: PurchasesOfferings,
  ): PurchasesPackage | null {
    const offeringsToSearch = offerings.current
      ? [offerings.current, ...Object.values(offerings.all)]
      : Object.values(offerings.all);

    for (const offering of offeringsToSearch) {
      const match =
        offering.lifetime ??
        offering.availablePackages.find(
          (pkg) => pkg.product.identifier === LIFETIME_PRO_PRODUCT_ID,
        );
      if (match) return match;
    }

    return null;
  }

  /** Whether the Üben Pro bundle is unlocked (purchased). */
  async isProUnlocked(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return settingsService.getProUnlocked();
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return await this.syncCustomerInfo(customerInfo);
    } catch (error) {
      console.error(
        '[Purchase] Failed to fetch customer info, using cached entitlement:',
        error,
      );
      return settingsService.getProUnlocked();
    }
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

  /** Complete a one-time purchase unlocking the full Üben Pro bundle. */
  async purchasePro(): Promise<{
    success: boolean;
    error?: string;
    cancelled?: boolean;
  }> {
    if (Platform.OS === 'web') {
      return { success: false, error: 'Purchases are not available on web.' };
    }

    try {
      const offerings = await Purchases.getOfferings();
      const lifetimePackage = this.findLifetimePackage(offerings);

      if (!lifetimePackage) {
        console.error(
          `[Purchase] No "${LIFETIME_PRO_PRODUCT_ID}" package found in RevenueCat offerings`,
        );
        return {
          success: false,
          error:
            'The Pro upgrade is not available right now. Please try again later.',
        };
      }

      const { customerInfo } = await Purchases.purchasePackage(lifetimePackage);
      const unlocked = await this.syncCustomerInfo(customerInfo);

      if (!unlocked) {
        console.error(
          '[Purchase] Purchase completed but entitlement is not active:',
          customerInfo.entitlements.all,
        );
        return {
          success: false,
          error:
            'Purchase completed, but Pro could not be activated. Please try restoring your purchase.',
        };
      }

      return { success: true };
    } catch (error) {
      if (this.isUserCancelledError(error)) {
        return { success: false, cancelled: true };
      }
      console.error('[Purchase] purchasePro failed:', error);
      return {
        success: false,
        error: 'Something went wrong completing your purchase. Please try again.',
      };
    }
  }

  /** Restore a previous purchase (e.g. after a reinstall or on a new device). */
  async restorePurchases(): Promise<{ success: boolean; error?: string }> {
    if (Platform.OS === 'web') {
      return { success: false, error: 'Purchases are not available on web.' };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const unlocked = await this.syncCustomerInfo(customerInfo);
      return unlocked
        ? { success: true }
        : { success: false, error: 'No previous purchase found for this account.' };
    } catch (error) {
      console.error('[Purchase] restorePurchases failed:', error);
      return {
        success: false,
        error: 'Something went wrong restoring your purchase. Please try again.',
      };
    }
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
