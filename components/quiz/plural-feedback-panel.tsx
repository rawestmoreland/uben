import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import {
  getPluralEndingLabel,
  getPluralSegments,
  type PluralEnding,
} from '@/services/pluralService';
import { applyGermanTextPreference } from '@/utils/germanText';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { uiUpperCase } from '@/utils/uiText';

interface PluralFeedbackPanelProps {
  article: string;
  singular: string;
  /** The stored plural — highlighted from the stored data, never generated. */
  plural: string;
  correctEnding: PluralEnding;
  selectedEnding: PluralEnding;
  isCorrect: boolean;
  eszettPreference: 'eszett' | 'ss';
}

/**
 * Takes the question card's place once the learner answers: the full stored
 * plural with its ending highlighted, e.g. "die Kind[er] (-er)", plus the
 * learner's pick when it was wrong.
 */
export function PluralFeedbackPanel({
  article,
  singular,
  plural,
  correctEnding,
  selectedEnding,
  isCorrect,
  eszettPreference,
}: PluralFeedbackPanelProps) {
  const { t } = useTranslation('app');
  const segments = getPluralSegments(singular, plural);
  const verdict = t(isCorrect ? 'plural_quiz.correct' : 'plural_quiz.incorrect');
  const display = (text: string) =>
    applyGermanTextPreference(text, eszettPreference);

  const spokenSummary = [
    t('plural_quiz.feedback_a11y', {
      verdict,
      plural: display(plural),
      ending: t(`plural_quiz.endings.${correctEnding}`),
    }),
    !isCorrect &&
      t('plural_quiz.you_picked', {
        ending: t(`plural_quiz.endings.${selectedEnding}`),
      }),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View
      style={[styles.panel, shadowStyle]}
      accessible
      accessibilityLabel={spokenSummary}
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.verdictStrip,
          isCorrect ? styles.verdictCorrect : styles.verdictWrong,
        ]}
      >
        <Text style={styles.verdictText}>{uiUpperCase(verdict)}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.singular}>
          {article} {display(singular)}
        </Text>
        <Text style={styles.plural}>
          die{' '}
          {segments.map((segment, index) => (
            <Text
              key={index}
              style={segment.highlighted ? styles.highlight : undefined}
            >
              {display(segment.text)}
            </Text>
          ))}
          <Text style={styles.endingLabel}>
            {' '}
            ({getPluralEndingLabel(correctEnding)})
          </Text>
        </Text>
        {!isCorrect && (
          <Text style={styles.picked}>
            {t('plural_quiz.you_picked', {
              ending: getPluralEndingLabel(selectedEnding),
            })}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
  },
  verdictStrip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: Layout.borderWidth,
    borderBottomColor: AppColors.black,
  },
  verdictCorrect: {
    backgroundColor: AppColors.green,
  },
  verdictWrong: {
    backgroundColor: AppColors.red,
  },
  verdictText: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
  },
  body: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  singular: {
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
  },
  plural: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  highlight: {
    backgroundColor: AppColors.yellow,
    textDecorationLine: 'underline',
  },
  endingLabel: {
    fontSize: Typography.heading,
    color: AppColors.textSecondary,
  },
  picked: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    marginTop: Spacing.sm,
  },
});
