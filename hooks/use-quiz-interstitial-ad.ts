import { AD_CONFIG, AD_UNIT_IDS } from '@/constants/ads';
import { purchaseService } from '@/services/purchaseService';
import { settingsService } from '@/services/settingsService';
import { useCallback, useEffect, useState } from 'react';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

/**
 * Preloads an interstitial ad and shows it between quiz sessions — never
 * mid-quiz. Capped to every Nth completed session (AD_CONFIG) so ads don't
 * interrupt every single review. Never loads or shows for Üben Pro users.
 *
 * Call `maybeShowInterstitial()` once, right when a session ends (e.g. the
 * "back to home" tap on the results screen). It no-ops silently on any
 * failure — ads must never block navigation.
 */
export function useQuizInterstitialAd() {
  const [isPro, setIsPro] = useState(false);
  const { isLoaded, isClosed, load, show } = useInterstitialAd(
    AD_UNIT_IDS.interstitial,
  );

  useEffect(() => {
    purchaseService.isProUnlocked().then(setIsPro).catch(() => {});
  }, []);

  // Preload on mount.
  useEffect(() => {
    if (isPro) return;
    load();
  }, [load, isPro]);

  // Preload the next ad once the current one has been dismissed.
  useEffect(() => {
    if (isPro) return;
    if (isClosed) load();
  }, [isClosed, load, isPro]);

  const maybeShowInterstitial = useCallback(async () => {
    try {
      if (await purchaseService.isProUnlocked()) return;

      const count =
        (await settingsService.getInterstitialSessionCount()) + 1;

      if (count < AD_CONFIG.INTERSTITIAL_SESSION_INTERVAL) {
        await settingsService.setInterstitialSessionCount(count);
        return;
      }

      await settingsService.setInterstitialSessionCount(0);
      if (isLoaded) show();
    } catch (error) {
      console.warn('[Ads] Failed to show interstitial:', error);
    }
  }, [isLoaded, show]);

  return { maybeShowInterstitial };
}
