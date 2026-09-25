import { purchaseService } from '@/services/purchaseService';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

/**
 * Reports whether the "Üben Pro" bundle (no ads, B-level words, unlimited
 * added words, adjective endings) is unlocked. Backed by purchaseService,
 * which checks the RevenueCat entitlement (cached locally for offline use).
 *
 * Re-checks on every screen focus (not just mount) so gated surfaces (ads,
 * the level selector, the add-word screen) update immediately after a
 * purchase, the same pattern useHomeData uses for stats.
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

  return { isPro, isLoading, refresh };
}
