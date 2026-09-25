import { purchaseService } from '@/services/purchaseService';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';

/**
 * Reports whether the (premium) adjective declension feature is accessible —
 * either purchased outright, or still within the free trial question
 * allowance. Backed by purchaseService — currently a local-only stub, see
 * its TODOs for where RevenueCat plugs in.
 *
 * Re-checks on every screen focus (not just mount) so the home screen's
 * badge/remaining-count updates immediately after a trial session or a
 * purchase, the same pattern useHomeData uses for stats.
 */
export function useAdjectiveDeclensionEntitlement() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [trialQuestionsRemaining, setTrialQuestionsRemaining] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [unlocked, remaining] = await Promise.all([
        purchaseService.isAdjectiveDeclensionUnlocked(),
        purchaseService.getAdjectiveDeclensionTrialQuestionsRemaining(),
      ]);
      setIsUnlocked(unlocked);
      setTrialQuestionsRemaining(remaining);
    } catch (error) {
      console.error(
        '[Entitlement] Failed to check adjective declension unlock:',
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return {
    isUnlocked,
    trialQuestionsRemaining,
    /** Purchased, or still has free trial questions left. */
    canAccess: isUnlocked || trialQuestionsRemaining > 0,
    isLoading,
    refresh,
  };
}
