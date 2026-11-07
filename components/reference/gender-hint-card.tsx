import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import type { GenderHint } from '@/constants/reference/genderHints';
import { uiUpperCase } from '@/utils/uiText';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface GenderHintCardProps {
  hint: GenderHint;
  /** Renders German text in the user's ß / ss preference (`useGermanText`). */
  german: (text: string) => string;
}

/** One ending or meaning group, with its examples and known exceptions. */
export function GenderHintCard({ hint, german }: GenderHintCardProps) {
  const { t } = useTranslation('app');
  const label = hint.hasLabel ? t(`gender_hints.hints.${hint.id}`) : null;
  const isRule = hint.strength === 'rule';

  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          {hint.pattern ? (
            <Text style={styles.pattern}>{german(hint.pattern)}</Text>
          ) : null}
          {label ? (
            <Text style={hint.pattern ? styles.label : styles.labelOnly}>
              {label}
            </Text>
          ) : null}
        </View>
        <View style={[styles.tag, isRule && styles.tagRule]}>
          <Text style={[styles.tagText, isRule && styles.tagTextRule]}>
            {uiUpperCase(t(`gender_hints.strength.${hint.strength}`))}
          </Text>
        </View>
      </View>
      <Text style={styles.examples}>{german(hint.examples.join('  ·  '))}</Text>
      {hint.exceptions ? (
        <Text style={styles.exceptions}>
          <Text style={styles.exceptionsLabel}>
            {t('gender_hints.exceptions')}:{' '}
          </Text>
          {german(hint.exceptions.join(', '))}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  headText: {
    flex: 1,
  },
  pattern: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  label: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  labelOnly: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  tag: {
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
  },
  tagRule: {
    backgroundColor: AppColors.black,
  },
  tagText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 0.5,
  },
  tagTextRule: {
    color: AppColors.white,
  },
  examples: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    lineHeight: 24,
    marginTop: Spacing.sm,
  },
  exceptions: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  exceptionsLabel: {
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
});
