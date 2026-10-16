import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import { uiUpperCase } from '@/utils/uiText';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface VerbPrepositionTrapNoteProps {
  /** The pattern's note on a common English-speaker mistake. */
  note: string;
}

/** Callout in the feedback panel for the "English trap" behind a pattern, e.g. English "wait for" pulling toward für. */
export function VerbPrepositionTrapNote({
  note,
}: VerbPrepositionTrapNoteProps) {
  const { t } = useTranslation('app');

  return (
    <View style={styles.trap}>
      <Text style={styles.label}>
        {uiUpperCase(t('verb_preposition_quiz.english_trap'))}
      </Text>
      <Text style={styles.text}>{note}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trap: {
    alignSelf: 'stretch',
    backgroundColor: AppColors.cream,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  label: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: Spacing.xs,
  },
  text: {
    fontSize: Typography.small,
    color: AppColors.black,
  },
});
