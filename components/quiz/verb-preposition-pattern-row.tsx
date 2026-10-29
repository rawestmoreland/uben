import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import type {
  VerbPrepositionBrowseItem,
  VerbPrepositionMastery,
} from '@/services/verbPrepositionBrowseService';
import { applyGermanTextPreference } from '@/utils/germanText';
import { uiUpperCase } from '@/utils/uiText';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface VerbPrepositionPatternRowProps {
  item: VerbPrepositionBrowseItem;
  eszettPreference: 'eszett' | 'ss';
}

/** One pattern on the cheat sheet: pattern + case, its sense, an example, and mastery. */
export const VerbPrepositionPatternRow = memo(
  function VerbPrepositionPatternRow({
    item,
    eszettPreference,
  }: VerbPrepositionPatternRowProps) {
    const { t } = useTranslation('app');
    const prefer = (text: string) =>
      applyGermanTextPreference(text, eszettPreference);
    const { example } = item;

    return (
      <View style={styles.row}>
        <View style={styles.headerRow}>
          <Text style={styles.pattern}>
            {prefer(item.pattern)}{' '}
            <Text style={styles.caseLabel}>{item.caseLabel}</Text>
          </Text>
          <View style={[styles.badge, MASTERY_BADGE_STYLES[item.mastery]]}>
            <Text style={styles.badgeText}>
              {uiUpperCase(
                t(`verb_preposition_patterns.mastery.${item.mastery}`),
              )}
            </Text>
          </View>
        </View>

        <Text style={styles.translation}>{item.translation}</Text>

        <Text style={styles.example}>
          {prefer(example.before)}
          <Text style={styles.highlight}>{prefer(example.preposition)}</Text>
          {prefer(example.after)}
        </Text>

        {item.isAlternate && item.primaryPreposition && (
          <Text style={styles.note}>
            {t('verb_preposition_patterns.also_with', {
              preposition: item.primaryPreposition,
            })}
          </Text>
        )}
        {item.contrastPatterns.length > 0 && (
          <Text style={styles.note}>
            {t('verb_preposition_patterns.contrast', {
              patterns: prefer(item.contrastPatterns.join(', ')),
            })}
          </Text>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  row: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pattern: {
    flex: 1,
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    marginRight: Spacing.sm,
  },
  caseLabel: {
    color: AppColors.blue,
  },
  badge: {
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  badgeNew: {
    backgroundColor: AppColors.white,
  },
  badgeLearning: {
    backgroundColor: AppColors.yellow,
  },
  badgeMastered: {
    backgroundColor: AppColors.green,
  },
  badgeText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  translation: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  example: {
    fontSize: Typography.body,
    color: AppColors.black,
    marginTop: Spacing.sm,
  },
  highlight: {
    fontWeight: Typography.bold,
    backgroundColor: AppColors.yellow,
  },
  note: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
});

const MASTERY_BADGE_STYLES: Record<VerbPrepositionMastery, object> = {
  new: styles.badgeNew,
  learning: styles.badgeLearning,
  mastered: styles.badgeMastered,
};
