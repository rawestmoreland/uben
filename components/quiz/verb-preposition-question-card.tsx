import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import { splitSentenceAtBlank } from '@/services/verbPrepositionService';
import { applyGermanTextPreference } from '@/utils/germanText';
import { uiUpperCase } from '@/utils/uiText';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

interface VerbPrepositionQuestionCardProps {
  /** Cloze sentence containing the "____" blank. */
  sentence: string;
  /** English gloss of the sense being tested; it is what disambiguates verbs with several prepositions. */
  translation: string | null;
  eszettPreference: 'eszett' | 'ss';
}

/** The question: a cloze sentence with the preposition blanked out, plus its English gloss. */
export function VerbPrepositionQuestionCard({
  sentence,
  translation,
  eszettPreference,
}: VerbPrepositionQuestionCardProps) {
  const { t } = useTranslation('app');
  const displaySentence = applyGermanTextPreference(
    sentence,
    eszettPreference,
  );
  const parts = splitSentenceAtBlank(displaySentence);

  return (
    <View style={[styles.card, shadowStyle]}>
      <Text style={styles.prompt}>
        {uiUpperCase(t('verb_preposition_quiz.prompt'))}
      </Text>
      <Text
        style={styles.sentence}
        accessibilityLabel={t('verb_preposition_quiz.question_a11y', {
          sentence: displaySentence.replace(
            /_{2,}/,
            t('verb_preposition_quiz.blank_a11y'),
          ),
        })}
      >
        {parts ? (
          <>
            {parts.before}
            <Text style={styles.blank}>____</Text>
            {parts.after}
          </>
        ) : (
          displaySentence
        )}
      </Text>
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
    marginBottom: Spacing.md,
  },
  sentence: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
  },
  blank: {
    color: AppColors.blue,
  },
  translation: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
