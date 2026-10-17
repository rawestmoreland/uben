import { purchaseService } from '@/services/purchaseService';
import {
  verbPrepositionBrowseService,
  type VerbPrepositionBrowseData,
} from '@/services/verbPrepositionBrowseService';
import { useEffect, useState } from 'react';

export type VerbPrepositionPatternsPhase =
  | 'loading'
  | 'ready'
  | 'error'
  | 'locked';

export interface VerbPrepositionPatternsData {
  phase: VerbPrepositionPatternsPhase;
  data: VerbPrepositionBrowseData | null;
}

/**
 * Loads the verb preposition cheat sheet. Pro-only like the quiz (no free
 * trial): a non-Pro learner reaching this screen by deep link gets the
 * 'locked' phase, which the screen turns into a paywall redirect.
 */
export function useVerbPrepositionPatterns(): VerbPrepositionPatternsData {
  const [phase, setPhase] = useState<VerbPrepositionPatternsPhase>('loading');
  const [data, setData] = useState<VerbPrepositionBrowseData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const unlocked = await purchaseService.isProUnlocked();
        if (!unlocked) {
          if (!cancelled) setPhase('locked');
          return;
        }

        const patterns =
          await verbPrepositionBrowseService.getPatternsByPreposition();
        if (cancelled) return;
        setData(patterns);
        setPhase('ready');
      } catch (error) {
        console.error('[VerbPrepositionPatterns] Failed to load:', error);
        if (!cancelled) setPhase('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { phase, data };
}
