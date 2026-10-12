/**
 * AdMob isn't supported on web. Ad components/hooks have `.web` stubs that
 * never read these IDs; this file exists so the web bundle doesn't pull in
 * `react-native-google-mobile-ads` (which imports native-only modules).
 */
export const AD_UNIT_IDS = {
  banner: '',
  interstitial: '',
} as const;

export const AD_CONFIG = {
  /** Show an interstitial only every Nth completed quiz session. */
  INTERSTITIAL_SESSION_INTERVAL: 3,
} as const;
