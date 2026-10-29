import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import { uiUpperCase } from '@/utils/uiText';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface VerbPrepositionQuizHeaderProps {
  current: number;
  total: number;
  /** Mode badge text; defaults to the preposition quiz's. */
  badge?: string;
}

function exitQuiz() {
  router.back();
}

function openPatterns() {
  router.push('/verb-preposition-patterns');
}

/** Mode badge, exit button and "3 of 20" progress bar along the top of the preposition quiz. */
export function VerbPrepositionQuizHeader({
  current,
  total,
  badge,
}: VerbPrepositionQuizHeaderProps) {
  const { t } = useTranslation('app');
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <View>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {uiUpperCase(badge ?? t('verb_preposition_quiz.badge'))}
          </Text>
        </View>
        <Pressable
          style={styles.patternsButton}
          onPress={openPatterns}
          accessibilityRole="button"
          accessibilityLabel={t('verb_preposition_patterns.open_a11y')}
          hitSlop={12}
        >
          <Text style={styles.patternsButtonText}>
            {uiUpperCase(t('verb_preposition_patterns.open'))}
          </Text>
        </Pressable>
        <Pressable
          style={styles.closeButton}
          onPress={exitQuiz}
          accessibilityRole="button"
          accessibilityLabel={t('quiz_mode.exit_quiz')}
          hitSlop={12}
        >
          <Text style={styles.closeButtonText}>X</Text>
        </Pressable>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          {t('quiz_mode.quiz_progress', { current, total })}
        </Text>
        <View style={styles.progressBarOuter}>
          {/* Width is the one runtime-computed style: it tracks progress */}
          <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: AppColors.pink,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  badgeText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  patternsButton: {
    flex: 1,
    height: 44,
    marginHorizontal: Spacing.sm,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    backgroundColor: AppColors.yellow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternsButtonText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  progressSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  progressText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  progressBarOuter: {
    height: 12,
    backgroundColor: AppColors.lightGray,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: AppColors.pink,
  },
});
