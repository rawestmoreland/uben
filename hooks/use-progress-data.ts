import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { spacedRepetitionService } from '@/services/spacedRepetitionService';
import {
  statisticsService,
  type DailyActivity,
  type HardWord,
} from '@/services/statisticsService';
import { vocabularyService } from '@/services/vocabularyService';
import type { UserStats } from '@/types/database';

// ── Types ─────────────────────────────────────────────────────────────

export interface ProgressData {
  stats: UserStats;
  streak: number;
  longestStreak: number;
  masteredCount: number;
  activityData: DailyActivity[];
  hardestWords: HardWord[];
  isLoading: boolean;
}

const defaultStats: UserStats = {
  total_cards: 0,
  total_reviews: 0,
  correct_reviews: 0,
  success_rate: null,
  due_today: 0,
};

// ── Hook ──────────────────────────────────────────────────────────────

/**
 * Fetches all data needed for the progress screen.
 * Re-fetches every time the screen gains focus so stats stay current.
 */
export function useProgressData(): ProgressData {
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [activityData, setActivityData] = useState<DailyActivity[]>([]);
  const [hardestWords, setHardestWords] = useState<HardWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        try {
          const [
            fetchedStats,
            fetchedStreak,
            fetchedLongest,
            fetchedMastered,
            fetchedActivity,
            fetchedHardest,
          ] = await Promise.all([
            vocabularyService.getUserStats(),
            spacedRepetitionService.getStudyStreak(),
            statisticsService.getLongestStreak(),
            statisticsService.getMasteredCount(),
            statisticsService.getActivityData(91),
            statisticsService.getHardestWords(3, 8),
          ]);

          if (!cancelled) {
            setStats(fetchedStats);
            setStreak(fetchedStreak);
            setLongestStreak(fetchedLongest);
            setMasteredCount(fetchedMastered);
            setActivityData(fetchedActivity);
            setHardestWords(fetchedHardest);
          }
        } catch (error) {
          console.error('[ProgressData] Failed to load:', error);
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

  return {
    stats,
    streak,
    longestStreak,
    masteredCount,
    activityData,
    hardestWords,
    isLoading,
  };
}
