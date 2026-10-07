import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import type { PluralQuizResult } from '@/hooks/use-plural-quiz-session';
import { getPluralEndingLabel } from '@/services/pluralService';
import { applyGermanTextPreference } from '@/utils/germanText';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface PluralResultRowProps {
  result: PluralQuizResult;
  eszettPreference: 'eszett' | 'ss';
}

/** One reviewed noun on the results screen, e.g. "das Kind → die Kinder (-er)". */
export const PluralResultRow = memo(function PluralResultRow({
  result,
  eszettPreference,
}: PluralResultRowProps) {
  const { t } = useTranslation('app');
  const { card } = result;
  const display = (text: string) =>
    applyGermanTextPreference(text, eszettPreference);

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.indicator,
          result.isCorrect ? styles.indicatorCorrect : styles.indicatorWrong,
        ]}
      />
      <View style={styles.body}>
        <Text style={styles.word}>
          {card.article} {display(card.german)} → die {display(card.plural)} (
          {getPluralEndingLabel(card.ending)})
        </Text>
        {!result.isCorrect && (
          <Text style={styles.picked}>
            {t('plural_quiz.you_picked', {
              ending: getPluralEndingLabel(result.selectedEnding),
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
  word: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
  },
  picked: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
});
