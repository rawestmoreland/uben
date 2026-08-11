/**
 * AdMob configuration.
 *
 * Falls back to Google's official test ad unit IDs when real ones aren't
 * configured, so dev/preview builds always show (test) ads instead of
 * failing to load or accidentally serving real ads before an AdMob
 * account is fully set up.
 *
 * Set these once real AdMob units exist:
 *   EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID
 *   EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID
 *
 * The app IDs themselves (used at build time, not here) are set via
 * EXPO_PUBLIC_ADMOB_ANDROID_APP_ID / EXPO_PUBLIC_ADMOB_IOS_APP_ID in
 * app.config.js.
 */
import { TestIds } from 'react-native-google-mobile-ads';

export const AD_UNIT_IDS = {
  banner: process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID || TestIds.BANNER,
  interstitial:
    process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID || TestIds.INTERSTITIAL,
} as const;

export const AD_CONFIG = {
  /** Show an interstitial only every Nth completed quiz session. */
  INTERSTITIAL_SESSION_INTERVAL: 3,
} as const;
