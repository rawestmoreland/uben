import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { vocabularyService } from '@/services/vocabularyService';
import { spacedRepetitionService } from '@/services/spacedRepetitionService';
import type { UserStats } from '@/types/database';

interface HomeData {
  stats: UserStats;
  nounCount: number;
  userNounCount: number;
  streak: number;
  hasReviewedToday: boolean;
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
  const [userNounCount, setUserNounCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hasReviewedToday, setHasReviewedToday] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        try {
          const [
            fetchedStats,
            fetchedCount,
            fetchedUserCount,
            fetchedStreak,
            fetchedHasReviewedToday,
          ] = await Promise.all([
            vocabularyService.getUserStats(),
            vocabularyService.getNounCount(),
            vocabularyService.getUserNounCount(),
            spacedRepetitionService.getStudyStreak(),
            spacedRepetitionService.hasReviewedToday(),
          ]);

          if (!cancelled) {
            setStats(fetchedStats);
            setNounCount(fetchedCount);
            setUserNounCount(fetchedUserCount);
            setStreak(fetchedStreak);
            setHasReviewedToday(fetchedHasReviewedToday);
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

  return { stats, nounCount, userNounCount, streak, hasReviewedToday, isLoading };
}
