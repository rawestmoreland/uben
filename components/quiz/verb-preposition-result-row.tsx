import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import type { VerbPrepositionQuizResult } from '@/hooks/use-verb-preposition-quiz-session';
import {
  formatCaseName,
  isCorrectPreposition,
} from '@/services/verbPrepositionService';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface VerbPrepositionResultRowProps {
  result: VerbPrepositionQuizResult;
}

/** One reviewed pattern on the results screen, e.g. "warten auf + Akk." over its completed sentence. */
export const VerbPrepositionResultRow = memo(function VerbPrepositionResultRow({
  result,
}: VerbPrepositionResultRowProps) {
  const { t } = useTranslation('app');
  const { question } = result.card;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.indicator,
          result.isCorrect ? styles.indicatorCorrect : styles.indicatorWrong,
        ]}
      />
      <View style={styles.body}>
        <Text style={styles.pattern}>{question.patternLabel}</Text>
        <Text style={styles.sentence}>{question.completedSentence}</Text>
        {!isCorrectPreposition(question, result.selectedPreposition) && (
          <Text style={styles.picked}>
            {t('verb_preposition_quiz.you_picked', {
              preposition: result.selectedPreposition,
            })}
          </Text>
        )}
        {result.selectedCase !== null &&
          result.selectedCase !== question.caseGoverned && (
            <Text style={styles.picked}>
              {t('verb_preposition_quiz.case_you_picked', {
                picked: formatCaseName(result.selectedCase),
                correct: formatCaseName(question.caseGoverned),
              })}
            </Text>
          )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  indicator: {
    width: 12,
    height: 12,
    marginRight: Spacing.md,
  },
  indicatorCorrect: {
    backgroundColor: AppColors.green,
  },
  indicatorWrong: {
    backgroundColor: AppColors.red,
  },
  body: {
    flex: 1,
  },
  pattern: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  sentence: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  picked: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    marginTop: Spacing.xs,
  },
});
