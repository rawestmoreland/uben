import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { uiUpperCase } from '@/utils/uiText';

/** Singulars longer than this drop to a smaller size so the blank still fits. */
const LONG_NOUN_LENGTH = 12;

/** Every German plural takes "die", so the question shows it instead of the singular's article. */
const PLURAL_ARTICLE = 'die';

interface PluralQuestionCardProps {
  /** The singular, already adjusted for the learner's ß/ss preference. */
  singular: string;
  /** Homograph hint, e.g. "bench" for die Bank (Bänke) vs "bank" (Banken). */
  sense: string | null;
  translation: string | null;
}

/** The question: the singular with the plural article and a blank for the ending, e.g. "die Kind ___". */
export function PluralQuestionCard({
  singular,
  sense,
  translation,
}: PluralQuestionCardProps) {
  const { t } = useTranslation('app');

  return (
    <View style={[styles.card, shadowStyle]}>
      <Text style={styles.prompt}>{uiUpperCase(t('plural_quiz.prompt'))}</Text>
      <Text
        style={[
          styles.noun,
          singular.length > LONG_NOUN_LENGTH && styles.nounLong,
        ]}
        accessibilityLabel={t('plural_quiz.question_a11y', {
          noun: `${PLURAL_ARTICLE} ${singular}`,
        })}
      >
        <Text style={styles.article}>{PLURAL_ARTICLE} </Text>
        {singular} <Text style={styles.blank}>___</Text>
      </Text>
      {/* Always shown: a homograph's sense can change the plural */}
      {sense && (
        <Text style={styles.sense}>
          ({t(`senses.${sense}`, { defaultValue: sense })})
        </Text>
      )}
      {translation && <Text style={styles.translation}>{translation}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  prompt: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  noun: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
  },
  nounLong: {
    fontSize: Typography.heading,
  },
  article: {
    color: AppColors.textSecondary,
  },
  blank: {
    color: AppColors.blue,
  },
  sense: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  translation: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    marginTop: Spacing.sm,
  },
});
