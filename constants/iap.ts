/**
 * In-app purchase configuration for the "Pro" unlock.
 *
 * A single non-consumable purchase: removes ads and lifts the free-tier
 * cap on user-added words. Future gated features (verb quiz, plural quiz)
 * should check `useEntitlement().isPro` the same way once built.
 *
 * Product IDs must be created in App Store Connect / Google Play Console
 * before a purchase can succeed. Override via env vars once real product
 * IDs are issued; the fallback values are the intended defaults.
 *
 *   EXPO_PUBLIC_IAP_PRO_PRODUCT_ID_IOS
 *   EXPO_PUBLIC_IAP_PRO_PRODUCT_ID_ANDROID
 */
export const IAP_PRODUCT_IDS = {
  pro: {
    ios:
      process.env.EXPO_PUBLIC_IAP_PRO_PRODUCT_ID_IOS ||
      'com.westmorelandcreative.uben.pro',
    android:
      process.env.EXPO_PUBLIC_IAP_PRO_PRODUCT_ID_ANDROID || 'pro_unlock',
  },
} as const;

export const FREE_TIER_LIMITS = {
  /** Max user-added words a non-Pro user can create. */
  MAX_USER_WORDS: 15,
} as const;
