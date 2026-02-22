import {
  AppColors,
  Layout,
  shadowStyle,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { useProgressData } from '@/hooks/use-progress-data';
import type { DailyActivity, HardWord } from '@/services/statisticsService';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Heatmap constants ────────────────────────────────────────────────

const NUM_WEEKS = 13; // ~3 months of history
const CELL_GAP = 3;
const DAY_LABEL_WIDTH = 12;
const DAY_LABEL_GAP = 6;
const SCREEN_PADDING = Layout.screenPadding;
const CARD_PADDING = Layout.cardPadding;

const SCREEN_WIDTH = Dimensions.get('window').width;
const AVAILABLE_FOR_GRID =
  SCREEN_WIDTH -
  SCREEN_PADDING * 2 - // screen-level padding
  CARD_PADDING * 2 - // card padding
  DAY_LABEL_WIDTH -
  DAY_LABEL_GAP -
  CELL_GAP * (NUM_WEEKS - 1);

const CELL_SIZE = Math.max(
  14,
  Math.floor(AVAILABLE_FOR_GRID / NUM_WEEKS),
);

// Day abbreviations indexed Mon=0 … Sun=6
const DAY_ABBREVS = ['M', '', 'W', '', 'F', '', 'S'];

const MONTH_ABBREVS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// ── Heatmap helpers ──────────────────────────────────────────────────

interface HeatmapCell {
  date: string; // YYYY-MM-DD
  count: number; // -1 = future (greyed out differently)
}

/** Build a 13-column × 7-row grid, Mon-first, newest column on the right. */
function buildHeatmapGrid(activityData: DailyActivity[]): HeatmapCell[][] {
  const activityMap = new Map<string, number>();
  activityData.forEach(d => activityMap.set(d.date, d.count));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the Monday of this week
  const dow = today.getDay(); // 0=Sun
  const daysToMonday = dow === 0 ? 6 : dow - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(thisMonday.getDate() - daysToMonday);

  // Start date = Monday 12 weeks before this week
  const startDate = new Date(thisMonday);
  startDate.setDate(startDate.getDate() - (NUM_WEEKS - 1) * 7);

  const grid: HeatmapCell[][] = [];
  for (let week = 0; week < NUM_WEEKS; week++) {
    const weekCells: HeatmapCell[] = [];
    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(cellDate.getDate() + week * 7 + day);
      const dateStr = cellDate.toISOString().split('T')[0];
      const isFuture = cellDate > today;
      weekCells.push({
        date: dateStr,
        count: isFuture ? -1 : (activityMap.get(dateStr) ?? 0),
      });
    }
    grid.push(weekCells);
  }

  return grid;
}

/** Map a review count to a background color. */
function getCellColor(count: number): string {
  if (count < 0) return AppColors.lightGray; // future
  if (count === 0) return '#E8E8E8'; // no reviews
  if (count <= 2) return '#B3EDCE'; // light green
  if (count <= 5) return '#4DB87A'; // medium green
  return AppColors.green; // heavy activity
}

/** Get the month abbreviation for a given YYYY-MM-DD date string. */
function getMonthAbbrev(dateStr: string): string {
  const month = parseInt(dateStr.split('-')[1], 10) - 1;
  return MONTH_ABBREVS[month] ?? '';
}

// ── Article color helper ─────────────────────────────────────────────

function getArticleColor(article: string): string {
  if (article === 'der') return AppColors.blue;
  if (article === 'die') return AppColors.red;
  return AppColors.green; // das
}

// ── Sub-components ───────────────────────────────────────────────────

interface OverviewStatProps {
  value: string;
  label: string;
  accentColor: string;
}

function OverviewStat({ value, label, accentColor }: OverviewStatProps) {
  return (
    <View style={[styles.overviewStat, shadowStyleSmall]}>
      <View style={[styles.overviewAccent, { backgroundColor: accentColor }]} />
      <Text style={styles.overviewValue}>{value}</Text>
      <Text style={styles.overviewLabel}>{label}</Text>
    </View>
  );
}

// ── Heatmap section ──────────────────────────────────────────────────

interface HeatmapSectionProps {
  activityData: DailyActivity[];
}

function HeatmapSection({ activityData }: HeatmapSectionProps) {
  const { t } = useTranslation('app');
  const grid = useMemo(() => buildHeatmapGrid(activityData), [activityData]);

  // Derive month labels: show abbreviation in first week of a new month
  const monthLabels = useMemo(() => {
    return grid.map((weekCells, weekIdx) => {
      const firstDayOfWeek = weekCells[0].date;
      const isFirstWeek = weekIdx === 0;
      const prevWeekFirst = weekIdx > 0 ? grid[weekIdx - 1][0].date : null;
      const currentMonth = firstDayOfWeek.split('-')[1];
      const prevMonth = prevWeekFirst?.split('-')[1];
      const showLabel = isFirstWeek || currentMonth !== prevMonth;
      return showLabel ? getMonthAbbrev(firstDayOfWeek) : '';
    });
  }, [grid]);

  return (
    <View style={[styles.card, shadowStyle]}>
      <Text style={styles.cardTitle}>
        {t('progress_screen.activity_title').toUpperCase()}
      </Text>
      <Text style={styles.cardSubtitle}>
        {t('progress_screen.activity_subtitle').toUpperCase()}
      </Text>

      {/* Month labels row */}
      <View style={styles.heatmapOuter}>
        {/* Spacer for day labels column */}
        <View style={{ width: DAY_LABEL_WIDTH + DAY_LABEL_GAP }} />
        <View style={styles.monthLabelsRow}>
          {monthLabels.map((label, idx) => (
            <View key={idx} style={styles.monthLabelCell}>
              <Text style={styles.monthLabelText}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Heatmap grid */}
      <View style={styles.heatmapOuter}>
        {/* Day of week labels */}
        <View style={[styles.dayLabelsColumn, { marginRight: DAY_LABEL_GAP }]}>
          {DAY_ABBREVS.map((abbrev, i) => (
            <View key={i} style={[styles.dayLabelCell, { height: CELL_SIZE }]}>
              <Text style={styles.dayLabelText}>{abbrev}</Text>
            </View>
          ))}
        </View>

        {/* Grid: weeks as columns, days as rows */}
        <View style={styles.heatmapGrid}>
          {grid.map((weekCells, weekIdx) => (
            <View key={weekIdx} style={styles.weekColumn}>
              {weekCells.map((cell, dayIdx) => (
                <View
                  key={dayIdx}
                  style={[
                    styles.heatmapCell,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: getCellColor(cell.count),
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <Text style={styles.legendLabel}>
          {t('progress_screen.legend_less').toUpperCase()}
        </Text>
        {['#E8E8E8', '#B3EDCE', '#4DB87A', AppColors.green].map((color, i) => (
          <View
            key={i}
            style={[styles.legendCell, { backgroundColor: color }]}
          />
        ))}
        <Text style={styles.legendLabel}>
          {t('progress_screen.legend_more').toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

// ── Hardest words section ────────────────────────────────────────────

interface HardestWordsSectionProps {
  words: HardWord[];
}

function HardestWordsSection({ words }: HardestWordsSectionProps) {
  const { t } = useTranslation('app');

  return (
    <View style={[styles.card, shadowStyle]}>
      <Text style={styles.cardTitle}>
        {t('progress_screen.hardest_words_title').toUpperCase()}
      </Text>
      <Text style={styles.cardSubtitle}>
        {t('progress_screen.hardest_words_subtitle').toUpperCase()}
      </Text>

      {words.length === 0 ? (
        <Text style={styles.emptyText}>
          {t('progress_screen.hardest_words_empty')}
        </Text>
      ) : (
        words.map((word, idx) => {
          const rate = word.success_rate ?? 0;
          const articleColor = getArticleColor(word.article);
          return (
            <View
              key={`${word.german}-${idx}`}
              style={[
                styles.hardWordRow,
                idx < words.length - 1 && styles.hardWordRowBorder,
              ]}
            >
              {/* Article badge */}
              <View
                style={[styles.articleBadge, { backgroundColor: articleColor }]}
              >
                <Text style={styles.articleBadgeText}>
                  {word.article.toUpperCase()}
                </Text>
              </View>

              {/* Word info */}
              <View style={styles.wordInfo}>
                <View style={styles.wordNameRow}>
                  <Text style={styles.germanWord}>{word.german}</Text>
                  {word.english ? (
                    <Text style={styles.englishWord}>{word.english}</Text>
                  ) : null}
                </View>

                {/* Success rate bar */}
                <View style={styles.rateBarOuter}>
                  <View
                    style={[
                      styles.rateBarFill,
                      {
                        width: `${rate}%`,
                        backgroundColor:
                          rate < 50 ? AppColors.red : AppColors.yellow,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.rateText}>
                  {t('progress_screen.success_rate', {
                    rate: Math.round(rate),
                    count: word.total_reviews,
                  })}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { t } = useTranslation('app');
  const {
    stats,
    streak,
    longestStreak,
    masteredCount,
    activityData,
    hardestWords,
    isLoading,
  } = useProgressData();

  const accuracyText =
    stats.success_rate != null
      ? `${Math.round(stats.success_rate)}%`
      : '--';

  const hasAnyData = stats.total_reviews > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {t('progress_screen.title').toUpperCase()}
          </Text>
          <Text style={styles.headerSubtitle}>
            {t('progress_screen.subtitle').toUpperCase()}
          </Text>
        </View>

        {/* ── Stats Overview ───────────────────────────────────── */}
        <View style={styles.overviewGrid}>
          <OverviewStat
            value={isLoading ? '-' : String(stats.total_reviews)}
            label={t('progress_screen.total_reviews').toUpperCase()}
            accentColor={AppColors.blue}
          />
          <OverviewStat
            value={isLoading ? '-' : accuracyText}
            label={t('progress_screen.accuracy').toUpperCase()}
            accentColor={
              stats.success_rate != null ? AppColors.green : AppColors.lightGray
            }
          />
          <OverviewStat
            value={isLoading ? '-' : String(stats.total_cards)}
            label={t('progress_screen.words_started').toUpperCase()}
            accentColor={AppColors.yellow}
          />
          <OverviewStat
            value={isLoading ? '-' : String(streak)}
            label={t('progress_screen.current_streak').toUpperCase()}
            accentColor={streak > 0 ? AppColors.yellow : AppColors.lightGray}
          />
          <OverviewStat
            value={isLoading ? '-' : String(longestStreak)}
            label={t('progress_screen.longest_streak').toUpperCase()}
            accentColor={longestStreak > 0 ? AppColors.purple : AppColors.lightGray}
          />
          <OverviewStat
            value={isLoading ? '-' : String(masteredCount)}
            label={t('progress_screen.mastered').toUpperCase()}
            accentColor={masteredCount > 0 ? AppColors.green : AppColors.lightGray}
          />
        </View>

        {/* ── Activity Heatmap ─────────────────────────────────── */}
        {!isLoading && (
          <HeatmapSection activityData={activityData} />
        )}

        {/* ── Hardest Words ────────────────────────────────────── */}
        {!isLoading && hasAnyData && (
          <HardestWordsSection words={hardestWords} />
        )}

        {/* ── Empty state ───────────────────────────────────────── */}
        {!isLoading && !hasAnyData && (
          <View style={[styles.emptyCard, shadowStyleSmall]}>
            <Text style={styles.emptyCardText}>
              {t('progress_screen.no_data')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },

  // ── Header
  header: {
    borderBottomWidth: Layout.borderWidth,
    borderBottomColor: AppColors.black,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 2,
    marginTop: Spacing.xs,
  },

  // ── Overview stats grid (2 rows × 3 cols)
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  overviewStat: {
    width: '30.5%', // 3 per row with gap
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingTop: Spacing.sm + 6, // extra top for accent strip
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    overflow: 'hidden',
  },
  overviewAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  overviewValue: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
  },

  // ── Shared card shell
  card: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Layout.cardPadding,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  cardSubtitle: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },

  // ── Heatmap
  heatmapOuter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  monthLabelsRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: Spacing.xs,
  },
  monthLabelCell: {
    width: CELL_SIZE,
    alignItems: 'flex-start',
  },
  monthLabelText: {
    fontSize: 9,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  dayLabelsColumn: {
    width: DAY_LABEL_WIDTH,
    gap: CELL_GAP,
  },
  dayLabelCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 9,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
  },
  heatmapGrid: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  weekColumn: {
    flexDirection: 'column',
    gap: CELL_GAP,
  },
  heatmapCell: {
    // width and height are set inline (computed from screen width)
    borderRadius: 2,
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  legendLabel: {
    fontSize: 9,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },

  // ── Hardest words
  hardWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  hardWordRowBorder: {
    borderBottomWidth: Layout.borderWidthThin,
    borderBottomColor: AppColors.lightGray,
  },
  articleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    minWidth: 40,
    alignItems: 'center',
  },
  articleBadgeText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 0.5,
  },
  wordInfo: {
    flex: 1,
  },
  wordNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  germanWord: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  englishWord: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
  },
  rateBarOuter: {
    height: 8,
    backgroundColor: AppColors.lightGray,
    borderWidth: 1,
    borderColor: AppColors.black,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  rateBarFill: {
    height: '100%',
  },
  rateText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },

  // ── Empty state card
  emptyCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Layout.cardPadding,
  },
  emptyCardText: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
});
