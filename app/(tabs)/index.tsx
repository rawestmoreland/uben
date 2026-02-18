import {
  AppColors,
  Layout,
  shadowStyle,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { useHomeData } from '@/hooks/use-home-data';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Home Screen ──────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation('app');
  const {
    stats,
    nounCount,
    userNounCount,
    streak,
    hasReviewedToday,
    isLoading,
  } = useHomeData();

  const isFirstTime = stats.total_reviews === 0;
  const accuracyText =
    stats.success_rate != null ? `${Math.round(stats.success_rate)}%` : '--';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Üben</Text>
          <Text style={styles.headerSubtitle}>
            {t('article_practice_title')}
          </Text>
        </View>

        {/* ── Stats Row ───────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            value={isLoading ? '-' : String(stats.due_today)}
            label={t('to_review').toUpperCase()}
            accentColor={
              stats.due_today > 0 ? AppColors.blue : AppColors.lightGray
            }
          />
          <StatCard
            value={isLoading ? '-' : String(streak)}
            label={t('streak').toUpperCase()}
            accentColor={streak > 0 ? AppColors.yellow : AppColors.lightGray}
            showIndicator={!isLoading && streak > 0 && !hasReviewedToday}
          />
          <StatCard
            value={isLoading ? '-' : accuracyText}
            label={t('accuracy').toUpperCase()}
            accentColor={
              stats.success_rate != null ? AppColors.green : AppColors.lightGray
            }
          />
        </View>

        {/* ── CTA Button ──────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
          ]}
          onPress={() => router.push('/select-categories')}
          accessibilityRole="button"
          accessibilityLabel={
            isFirstTime ? t('learn_your_first_words') : t('start_practice')
          }
        >
          <Text style={styles.ctaText}>
            {isFirstTime
              ? t('learn_your_first_words').toUpperCase()
              : t('start_practice').toUpperCase()}
          </Text>
        </Pressable>
        <Text style={styles.ctaSubtext}>
          {isLoading
            ? ' '
            : isFirstTime
              ? t('nouns_ready', { count: nounCount })
              : t('cards_waiting_for_review', {
                  count: stats.due_today,
                })}
        </Text>

        {/* ── Word Actions ─────────────────────────────────────── */}
        <View style={styles.wordActionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.addWordButton,
              shadowStyleSmall,
              pressed && styles.addWordButtonPressed,
            ]}
            onPress={() => router.push('/add-word')}
            accessibilityRole="button"
            accessibilityLabel={t('add_word')}
          >
            <Text style={styles.addWordButtonText}>
              + {t('add_word').toUpperCase()}
            </Text>
          </Pressable>
          {!isLoading && userNounCount > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.myWordsButton,
                shadowStyleSmall,
                pressed && styles.myWordsButtonPressed,
              ]}
              onPress={() => router.push('/my-words')}
              accessibilityRole="button"
              accessibilityLabel={t('my_words_added', { count: userNounCount })}
            >
              <Text style={styles.myWordsButtonText}>
                {t('my_words_count', { count: userNounCount })}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Progress Card ───────────────────────────────────── */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>PROGRESS</Text>
            <Text style={styles.progressCount}>
              {t('progress', {
                total_cards: stats.total_cards,
                total_words: nounCount,
              })}
            </Text>
          </View>
          <View style={styles.progressBarOuter}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width:
                    nounCount > 0
                      ? `${Math.round((stats.total_cards / nounCount) * 100)}%`
                      : '0%',
                },
              ]}
            />
          </View>
          <Text style={styles.progressSubtext}>
            {isFirstTime
              ? t('start_practicing')
              : t('total_reviews', {
                  count: stats.total_reviews,
                })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Stat Card Component ──────────────────────────────────────────────

interface StatCardProps {
  value: string;
  label: string;
  accentColor: string;
  showIndicator?: boolean;
}

function StatCard({ value, label, accentColor, showIndicator }: StatCardProps) {
  return (
    <View style={[styles.statCard, shadowStyleSmall]}>
      <View style={[styles.statAccent, { backgroundColor: accentColor }]} />
      <View style={styles.statValueContainer}>
        <Text style={styles.statValue}>{value}</Text>
        {showIndicator && (
          <View style={styles.indicator}>
            <Text style={styles.indicatorText}>!</Text>
          </View>
        )}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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

  // Header
  header: {
    borderBottomWidth: Layout.borderWidth,
    borderBottomColor: AppColors.black,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.huge,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 2,
    marginTop: Spacing.xs,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  statValue: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
  },
  indicator: {
    backgroundColor: AppColors.red,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  indicatorText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.white,
    lineHeight: Typography.small,
  },
  statLabel: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },

  // CTA Button
  ctaButton: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    ...shadowStyle,
  },
  ctaButtonPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
  },
  ctaText: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  ctaSubtext: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },

  // Word Actions
  wordActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  addWordButton: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  addWordButtonPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  addWordButtonText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  myWordsButton: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  myWordsButtonPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  myWordsButtonText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },

  // Progress Card
  progressCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Layout.cardPadding,
    ...shadowStyle,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
  },
  progressCount: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
  },
  progressBarOuter: {
    height: 24,
    backgroundColor: AppColors.lightGray,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: AppColors.green,
    borderRightWidth: Layout.borderWidth,
    borderRightColor: AppColors.black,
    minWidth: 0,
  },
  progressSubtext: {
    fontSize: Typography.tiny,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    marginTop: Spacing.sm,
  },
});
