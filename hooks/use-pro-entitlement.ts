import { purchaseService } from '@/services/purchaseService';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

/**
 * Reports whether the "Üben Pro" bundle (no ads, B-level words, unlimited
 * added words, adjective endings) is unlocked. Backed by purchaseService,
 * which checks the RevenueCat entitlement (cached locally for offline use).
 *
 * Re-checks on every screen focus (not just mount) so gated surfaces (ads,
 * the level selector, the add-word screen) update immediately after a
 * purchase, the same pattern useHomeData uses for stats.
 *
 * Also subscribes directly to RevenueCat's customer info listener, which
 * fires in-process (no network round-trip) the moment a purchase or restore
 * completes. That covers screens that stay mounted and focused through the
 * whole paywall flow (e.g. a trial-exhausted upsell card behind a modal
 * paywall) — without it, those screens wouldn't see the unlock until their
 * next focus event re-triggered a fresh (and possibly slow) network check.
 */
export function useProEntitlement() {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setIsPro(await purchaseService.isProUnlocked());
    } catch (error) {
      console.error('[Entitlement] Failed to check Pro unlock:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    const listener = (customerInfo: CustomerInfo) => {
      purchaseService
        .syncCustomerInfo(customerInfo)
        .then(setIsPro)
        .catch((error) => {
          console.error(
            '[Entitlement] Failed to sync customer info update:',
            error,
          );
        });
    };

    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return { isPro, isLoading, refresh };
}
