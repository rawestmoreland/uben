import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Initializes the Google Mobile Ads SDK once at app startup.
 *
 * AdMob's native SDK isn't available on web, so this is a no-op there.
 * Init failures (e.g. no network on first launch) are swallowed — ads are
 * a monetization add-on and must never block the app from starting.
 */
export function useAdsInit() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    import('react-native-google-mobile-ads')
      .then(({ default: mobileAds }) => mobileAds().initialize())
      .catch((error) => {
        console.warn('[Ads] Failed to initialize Mobile Ads SDK:', error);
      });
  }, []);
}
