import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { vocabularyService } from '@/services/vocabularyService';
import { spacedRepetitionService } from '@/services/spacedRepetitionService';
import type { UserStats } from '@/types/database';

interface HomeData {
  stats: UserStats;
  nounCount: number;
  streak: number;
  isLoading: boolean;
}

const defaultStats: UserStats = {
  total_cards: 0,
  total_reviews: 0,
  correct_reviews: 0,
  success_rate: null,
  due_today: 0,
};

/**
 * Fetches all data needed for the home screen dashboard.
 * Re-fetches every time the screen gains focus so stats
 * update after a practice session.
 */
export function useHomeData(): HomeData {
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [nounCount, setNounCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        try {
          const [fetchedStats, fetchedCount, fetchedStreak] =
            await Promise.all([
              vocabularyService.getUserStats(),
              vocabularyService.getNounCount(),
              spacedRepetitionService.getStudyStreak(),
            ]);

          if (!cancelled) {
            setStats(fetchedStats);
            setNounCount(fetchedCount);
            setStreak(fetchedStreak);
          }
        } catch (error) {
          console.error('[HomeData] Failed to load:', error);
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      }

      load();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  return { stats, nounCount, streak, isLoading };
}
