import { purchaseService } from '@/services/purchaseService';
import { useCallback, useEffect, useState } from 'react';

/**
 * Reports whether the (premium) adjective declension feature is unlocked.
 * Backed by purchaseService — currently a local-only stub, see its TODOs
 * for where RevenueCat plugs in.
 */
export function useAdjectiveDeclensionEntitlement() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const unlocked = await purchaseService.isAdjectiveDeclensionUnlocked();
      setIsUnlocked(unlocked);
    } catch (error) {
      console.error(
        '[Entitlement] Failed to check adjective declension unlock:',
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { isUnlocked, isLoading, refresh };
}
