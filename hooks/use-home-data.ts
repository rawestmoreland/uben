import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { vocabularyService } from '@/services/vocabularyService';
import { spacedRepetitionService } from '@/services/spacedRepetitionService';
import { statisticsService } from '@/services/statisticsService';
import { settingsService } from '@/services/settingsService';
import { purchaseService } from '@/services/purchaseService';
import type { UserStats } from '@/types/database';

export interface LevelOption {
  level: string;
  wordCount: number;
  comingSoon: boolean;
  /** True when this level requires Üben Pro (and the user doesn't have it). */
  locked: boolean;
}

/** CEFR levels bundled behind the Üben Pro entitlement (B-level and up). */
const PRO_GATED_LEVELS = ['B1+'];

const ALL_CEFR_LEVELS = ['A1', 'A2', 'B1+'];
const VALID_LEVELS = ALL_CEFR_LEVELS;
const LEGACY_LEVELS_MAP: Record<string, string> = { B1: 'B1+', B2: 'B1+', C1: 'B1+', C2: 'B1+' };

interface HomeData {
  stats: UserStats;
  nounCount: number;
  userNounCount: number;
  streak: number;
  hasReviewedToday: boolean;
  strugglingCount: number;
  masteredCount: number;
  availableLevels: LevelOption[];
  selectedLevels: string[];
  setSelectedLevels: (levels: string[]) => Promise<void>;
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
  const [strugglingCount, setStrugglingCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [availableLevels, setAvailableLevels] = useState<LevelOption[]>([]);
  const [selectedLevels, setSelectedLevelsState] = useState<string[]>(['A1']);
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
            fetchedStrugglingCount,
            fetchedMasteredCount,
            fetchedLevels,
            fetchedSelectedLevels,
            isPro,
            isGrandfatheredBLevel,
          ] = await Promise.all([
            vocabularyService.getUserStats(),
            vocabularyService.getNounCount(),
            vocabularyService.getUserNounCount(),
            spacedRepetitionService.getStudyStreak(),
            spacedRepetitionService.hasReviewedToday(),
            statisticsService.getStrugglingWordsCount(),
            statisticsService.getMasteredCount(),
            vocabularyService.getLevelsWithCounts(),
            settingsService.getSelectedLevels(),
            purchaseService.isProUnlocked(),
            settingsService.getGrandfatheredBLevel(),
          ]);

          if (!cancelled) {
            setStats(fetchedStats);
            setNounCount(fetchedCount);
            setUserNounCount(fetchedUserCount);
            setStreak(fetchedStreak);
            setHasReviewedToday(fetchedHasReviewedToday);
            setStrugglingCount(fetchedStrugglingCount);
            setMasteredCount(fetchedMasteredCount);
            const canAccessProLevels = isPro || isGrandfatheredBLevel;
            const mergedLevels: LevelOption[] = ALL_CEFR_LEVELS.map((level) => {
              const locked =
                PRO_GATED_LEVELS.includes(level) && !canAccessProLevels;
              if (level === 'B1+') {
                // Virtual level: includes all words in the database
                return {
                  level: 'B1+',
                  wordCount: fetchedCount,
                  comingSoon: false,
                  locked,
                };
              }
              const found = fetchedLevels.find((l) => l.level === level);
              return found
                ? { ...found, comingSoon: false, locked }
                : { level, wordCount: 0, comingSoon: true, locked };
            });
            setAvailableLevels(mergedLevels);

            // Migrate any stale level selections (B1/B2/C1/C2 → B1+)
            const migrated = fetchedSelectedLevels.map(
              (l) => LEGACY_LEVELS_MAP[l] ?? l,
            );
            const normalised = [...new Set(migrated)].filter((l) =>
              VALID_LEVELS.includes(l),
            );
            const finalLevels = normalised.length > 0 ? normalised : ['A1'];
            setSelectedLevelsState(finalLevels);
            if (
              JSON.stringify(finalLevels) !==
              JSON.stringify(fetchedSelectedLevels)
            ) {
              await settingsService.setSelectedLevels(finalLevels);
            }
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

  const setSelectedLevels = useCallback(async (levels: string[]) => {
    setSelectedLevelsState(levels);
    await settingsService.setSelectedLevels(levels);
  }, []);

  return {
    stats,
    nounCount,
    userNounCount,
    streak,
    hasReviewedToday,
    strugglingCount,
    masteredCount,
    availableLevels,
    selectedLevels,
    setSelectedLevels,
    isLoading,
  };
}
