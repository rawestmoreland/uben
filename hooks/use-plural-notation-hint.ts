import { settingsService } from '@/services/settingsService';
import { useCallback, useEffect, useState } from 'react';

/**
 * One-time "how to read the ending buttons" hint for the plural quiz — the
 * textbook ¨-er notation is unfamiliar to beginners. Stays hidden until the
 * stored flag has loaded, so it never flashes for learners who already
 * dismissed it.
 */
export function usePluralNotationHint(): {
  isVisible: boolean;
  dismiss: () => void;
  show: () => void;
} {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    settingsService
      .getPluralNotationHintSeen()
      .then((seen) => {
        if (!cancelled) setIsVisible(!seen);
      })
      .catch((error) => {
        console.error('[PluralQuiz] Failed to load notation hint state:', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    settingsService.setPluralNotationHintSeen(true).catch((error) => {
      console.error('[PluralQuiz] Failed to save notation hint state:', error);
    });
  }, []);

  // Re-opens the hint on demand; the stored "seen" flag stays set, so it
  // doesn't come back uninvited next session.
  const show = useCallback(() => {
    setIsVisible(true);
  }, []);

  return { isVisible, dismiss, show };
}
