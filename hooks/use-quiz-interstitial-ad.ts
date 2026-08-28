import { AD_CONFIG, AD_UNIT_IDS } from '@/constants/ads';
import { useEntitlement } from '@/contexts/entitlement-context';
import { settingsService } from '@/services/settingsService';
import { useCallback, useEffect } from 'react';
import { useInterstitialAd } from 'react-native-google-mobile-ads';

/**
 * Preloads an interstitial ad and shows it between quiz sessions — never
 * mid-quiz. Capped to every Nth completed session (AD_CONFIG) so ads don't
 * interrupt every single review. Never loads or shows for Pro users.
 *
 * Call `maybeShowInterstitial()` once, right when a session ends (e.g. the
 * "back to home" tap on the results screen). It no-ops silently on any
 * failure — ads must never block navigation.
 */
export function useQuizInterstitialAd() {
  const { isPro } = useEntitlement();
  const { isLoaded, isClosed, load, show } = useInterstitialAd(
    AD_UNIT_IDS.interstitial,
  );

  // Preload on mount.
  useEffect(() => {
    if (isPro) return;
    load();
  }, [isPro, load]);

  // Preload the next ad once the current one has been dismissed.
  useEffect(() => {
    if (isPro) return;
    if (isClosed) load();
  }, [isPro, isClosed, load]);

  const maybeShowInterstitial = useCallback(async () => {
    if (isPro) return;
    try {
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
  }, [isPro, isLoaded, show]);

  return { maybeShowInterstitial };
}
