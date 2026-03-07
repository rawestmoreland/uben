import {
  AppColors,
  Layout,
  shadowStyle,
  shadowStyleSmall,
  Spacing,
  Typography,
} from '@/constants/design';
import { useHomeData, type LevelOption } from '@/hooks/use-home-data';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
    strugglingCount,
    masteredCount,
    availableLevels,
    selectedLevels,
    setSelectedLevels,
    isLoading,
  } = useHomeData();

  const handleLevelToggle = useCallback(
    async (level: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const levelOrder = availableLevels.map((l) => l.level);
      const tappedIndex = levelOrder.indexOf(level);
      if (tappedIndex < 0) return;
      // Cumulative selection: select all levels up to and including the tapped one.
      // Tapping A1 when A1 is already the only selection is a no-op (can't go lower).
      const next = levelOrder.slice(0, tappedIndex + 1);
      await setSelectedLevels(next);
    },
    [availableLevels, setSelectedLevels],
  );

  const isFirstTime = stats.total_reviews === 0;
  const accuracyText =
    stats.success_rate != null ? `${Math.round(stats.success_rate)}%` : '--';
  const newCount = Math.max(0, nounCount - stats.total_cards);
  const learningCount = Math.max(0, stats.total_cards - masteredCount);

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

        {/* ── Level Filter ─────────────────────────────────────── */}
        {!isLoading && availableLevels.length > 0 && (
          <LevelSelector
            availableLevels={availableLevels}
            selectedLevels={selectedLevels}
            onToggle={handleLevelToggle}
            label={t('level_filter.label')}
            comingSoonLabel={t('level_filter.coming_soon')}
            tooltip={{
              title: t('level_filter.tooltip_title'),
              intro: t('level_filter.tooltip_intro'),
              citeKrashen: t('level_filter.tooltip_cite_krashen'),
              citeNation: t('level_filter.tooltip_cite_nation'),
              citeWebb: t('level_filter.tooltip_cite_webb'),
              close: t('level_filter.tooltip_close'),
            }}
          />
        )}

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

        {/* ── Struggling Words ─────────────────────────────────── */}
        {!isLoading && strugglingCount > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.strugglingButton,
              shadowStyleSmall,
              pressed && styles.strugglingButtonPressed,
            ]}
            onPress={() => router.push('/quiz?mode=struggling')}
            accessibilityRole="button"
            accessibilityLabel={t('struggling_words_button', {
              count: strugglingCount,
            })}
          >
            <View style={styles.strugglingButtonInner}>
              <Text style={styles.strugglingButtonText}>
                {t('struggling_words_button', { count: strugglingCount }).toUpperCase()}
              </Text>
              <Text style={styles.strugglingButtonSub}>
                {t('struggling_words_label')}
              </Text>
            </View>
          </Pressable>
        )}

        {/* ── Mastery Card ─────────────────────────────────────── */}
        <View style={styles.masteryCard}>
          <View style={styles.masteryHeader}>
            <Text style={styles.masteryTitle}>
              {t('mastery_title')}
            </Text>
            <Text style={styles.masteryCount}>
              {t('mastery_summary', {
                mastered: isLoading ? '-' : masteredCount,
                total: isLoading ? '-' : nounCount,
              })}
            </Text>
          </View>
          <View style={styles.masteryBar}>
            {nounCount === 0 ? (
              <View style={[styles.masterySegment, styles.masterySegmentNew, { flex: 1 }]} />
            ) : (
              <>
                {newCount > 0 && (
                  <View style={[styles.masterySegment, styles.masterySegmentNew, { flex: newCount }]} />
                )}
                {learningCount > 0 && (
                  <View style={[styles.masterySegment, styles.masterySegmentLearning, { flex: learningCount }]} />
                )}
                {masteredCount > 0 && (
                  <View style={[styles.masterySegment, styles.masterySegmentMastered, { flex: masteredCount }]} />
                )}
              </>
            )}
          </View>
          <View style={styles.masteryLegend}>
            <MasteryLegendItem
              color={AppColors.lightGray}
              label={t('mastery_new')}
              count={isLoading ? '-' : String(newCount)}
            />
            <MasteryLegendItem
              color={AppColors.blue}
              label={t('mastery_learning')}
              count={isLoading ? '-' : String(learningCount)}
            />
            <MasteryLegendItem
              color={AppColors.green}
              label={t('mastery_mastered')}
              count={isLoading ? '-' : String(masteredCount)}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Level Selector Component ─────────────────────────────────────────

interface LevelSelectorProps {
  availableLevels: LevelOption[];
  selectedLevels: string[];
  onToggle: (level: string) => void;
  label: string;
  comingSoonLabel: string;
  tooltip: {
    title: string;
    intro: string;
    citeKrashen: string;
    citeNation: string;
    citeWebb: string;
    close: string;
  };
}

function LevelSelector({ availableLevels, selectedLevels, onToggle, label, comingSoonLabel, tooltip }: LevelSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.levelSelector}>
      <View style={styles.levelSelectorHeader}>
        <Text style={styles.levelSelectorLabel}>{label}</Text>
        <Pressable
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={tooltip.title}
          hitSlop={8}
        >
          <IconSymbol name="info.circle.fill" size={16} color={AppColors.textSecondary} />
        </Pressable>
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{tooltip.title}</Text>
            <Text style={styles.modalIntro}>{tooltip.intro}</Text>
            <View style={styles.modalCiteBlock}>
              <Text style={styles.modalCiteText}>{tooltip.citeKrashen}</Text>
            </View>
            <View style={styles.modalCiteBlock}>
              <Text style={styles.modalCiteText}>{tooltip.citeNation}</Text>
            </View>
            <View style={styles.modalCiteBlock}>
              <Text style={styles.modalCiteText}>{tooltip.citeWebb}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.modalCloseButton, pressed && styles.modalCloseButtonPressed]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>{tooltip.close}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.levelChips}
      >
        {availableLevels.map(({ level, comingSoon }) => {
          const isSelected = selectedLevels.includes(level);
          if (comingSoon) {
            return (
              <View
                key={level}
                style={styles.levelChipComingSoon}
                accessibilityLabel={`${level} level, coming soon`}
              >
                <Text style={styles.levelChipTextComingSoon}>{level}</Text>
                <Text style={styles.levelChipComingSoonBadge}>{comingSoonLabel}</Text>
              </View>
            );
          }
          return (
            <Pressable
              key={level}
              style={[styles.levelChip, isSelected && styles.levelChipSelected]}
              onPress={() => onToggle(level)}
              accessibilityRole="button"
              accessibilityLabel={`${level} level`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.levelChipText, isSelected && styles.levelChipTextSelected]}>
                {level}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
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

// ── Mastery Legend Item Component ────────────────────────────────────

interface MasteryLegendItemProps {
  color: string;
  label: string;
  count: string;
}

function MasteryLegendItem({ color, label, count }: MasteryLegendItemProps) {
  return (
    <View style={styles.masteryLegendItem}>
      <View style={[styles.masteryLegendDot, { backgroundColor: color }]} />
      <Text style={styles.masteryLegendCount}>{count}</Text>
      <Text style={styles.masteryLegendLabel}>{label.toUpperCase()}</Text>
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

  // Level Selector
  levelSelector: {
    marginBottom: Spacing.lg,
  },
  levelSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  levelSelectorLabel: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 1.5,
  },
  levelChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  levelChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  levelChipSelected: {
    backgroundColor: AppColors.yellow,
  },
  levelChipText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
  levelChipTextSelected: {
    color: AppColors.black,
  },
  levelChipComingSoon: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.textSecondary,
    borderStyle: 'dashed',
    backgroundColor: AppColors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    opacity: 0.6,
  },
  levelChipTextComingSoon: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  },
  levelChipComingSoonBadge: {
    fontSize: 8,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
    marginTop: 2,
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

  // Struggling Words Button
  strugglingButton: {
    backgroundColor: AppColors.red,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  strugglingButtonPressed: {
    transform: [{ translateY: 2 }],
    shadowOffset: { width: 2, height: 2 },
  },
  strugglingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strugglingButtonText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 1,
    flex: 1,
  },
  strugglingButtonSub: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.white,
    opacity: 0.85,
    letterSpacing: 0.5,
  },

  // Mastery Card
  masteryCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Layout.cardPadding,
    ...shadowStyle,
  },
  masteryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  masteryTitle: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
  },
  masteryCount: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
  },
  masteryBar: {
    height: 24,
    flexDirection: 'row',
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    overflow: 'hidden',
  },
  masterySegment: {
    height: '100%',
  },
  masterySegmentNew: {
    backgroundColor: AppColors.lightGray,
  },
  masterySegmentLearning: {
    backgroundColor: AppColors.blue,
  },
  masterySegmentMastered: {
    backgroundColor: AppColors.green,
  },
  masteryLegend: {
    flexDirection: 'row',
    marginTop: Spacing.md,
  },
  masteryLegendItem: {
    flex: 1,
    alignItems: 'center',
  },
  masteryLegendDot: {
    width: 12,
    height: 12,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    marginBottom: Spacing.xs,
  },
  masteryLegendCount: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  masteryLegendLabel: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginTop: 2,
  },

  // Level Info Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: AppColors.cream,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.xl,
    width: '100%',
    ...shadowStyle,
  },
  modalTitle: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  modalIntro: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.black,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  modalCiteBlock: {
    borderLeftWidth: Layout.borderWidthThin,
    borderLeftColor: AppColors.black,
    paddingLeft: Spacing.md,
    marginBottom: Spacing.md,
  },
  modalCiteText: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  modalCloseButton: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
    ...shadowStyle,
  },
  modalCloseButtonPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
  },
  modalCloseText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
});
