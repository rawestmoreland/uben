import { settingsService } from './settingsService';

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
  /** Whether the adjective declension feature is unlocked. */
  async isAdjectiveDeclensionUnlocked(): Promise<boolean> {
    return settingsService.getAdjectiveDeclensionUnlocked();
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
