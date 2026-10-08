import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

/** Singulars longer than this drop to a smaller size so the blank still fits. */
const LONG_NOUN_LENGTH = 12;

interface PluralQuestionCardProps {
  article: string;
  /** The singular, already adjusted for the learner's ß/ss preference. */
  singular: string;
  /** Homograph hint, e.g. "bench" for die Bank (Bänke) vs "bank" (Banken). */
  sense: string | null;
  translation: string | null;
}

/** The question: the singular with its article and a blank for the ending, e.g. "das Kind ___". */
export function PluralQuestionCard({
  article,
  singular,
  sense,
  translation,
}: PluralQuestionCardProps) {
  const { t } = useTranslation('app');

  return (
    <View style={[styles.card, shadowStyle]}>
      <Text style={styles.prompt}>{t('plural_quiz.prompt').toUpperCase()}</Text>
      <Text
        style={[
          styles.noun,
          singular.length > LONG_NOUN_LENGTH && styles.nounLong,
        ]}
        accessibilityLabel={t('plural_quiz.question_a11y', {
          noun: `${article} ${singular}`,
        })}
      >
        <Text style={styles.article}>{article} </Text>
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
