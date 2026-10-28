import {
  AppColors,
  Layout,
  shadowStyle,
  Spacing,
  Typography,
} from '@/constants/design';
import {
  formatCaseName,
  isCorrectPreposition,
  splitSentenceAtBlank,
  type VerbPrepositionQuestion,
} from '@/services/verbPrepositionService';
import type { VerbPrepositionCase } from '@/types/database';
import { applyGermanTextPreference } from '@/utils/germanText';
import { uiUpperCase } from '@/utils/uiText';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { VerbPrepositionCompoundNote } from './verb-preposition-compound-note';

interface VerbPrepositionFeedbackPanelProps {
  question: VerbPrepositionQuestion;
  selectedPreposition: string;
  /** The case tapped in the case step; null when that step did not apply. */
  selectedCase: VerbPrepositionCase | null;
  isCorrect: boolean;
  eszettPreference: 'eszett' | 'ss';
}

/**
 * Takes the question card's place once the learner answers: the full pattern
 * with its case ("warten auf + Akk."), the completed sentence with the
 * preposition highlighted, the gloss, and any other accepted prepositions.
 * The pattern (with its case) is shown whether or not the case step was asked
 * or answered correctly. For da(r)-/wo(r)- questions it also shows how the
 * compound is built and the rule for people.
 */
export function VerbPrepositionFeedbackPanel({
  question,
  selectedPreposition,
  selectedCase,
  isCorrect,
  eszettPreference,
}: VerbPrepositionFeedbackPanelProps) {
  const { t } = useTranslation('app');
  const display = (text: string) =>
    applyGermanTextPreference(text, eszettPreference);
  const verdict = t(
    isCorrect
      ? 'verb_preposition_quiz.correct'
      : 'verb_preposition_quiz.incorrect',
  );
  // The two ways to miss: a wrong preposition, or the right preposition
  // with the wrong case (only possible when the case step was asked).
  const wrongPreposition = !isCorrectPreposition(question, selectedPreposition);
  const wrongCase =
    selectedCase !== null && selectedCase !== question.caseGoverned;
  const caseMissText = wrongCase
    ? t('verb_preposition_quiz.case_you_picked', {
        picked: formatCaseName(selectedCase),
        correct: formatCaseName(question.caseGoverned),
      })
    : null;
  const alternates = question.acceptedAnswers.filter(
    (answer) => answer !== question.primaryAnswer,
  );

  // completedSentence = before + filled word + after, so the filled word
  // (which is capitalised at the start of a sentence) is whatever lies between.
  const parts = splitSentenceAtBlank(question.sentence);
  const filled = parts
    ? question.completedSentence.slice(
        parts.before.length,
        question.completedSentence.length - parts.after.length,
      )
    : null;

  const spokenSummary = [
    t('verb_preposition_quiz.feedback_a11y', {
      verdict,
      pattern: display(question.patternLabel),
      sentence: display(question.completedSentence),
    }),
    wrongPreposition &&
      t('verb_preposition_quiz.you_picked', {
        preposition: selectedPreposition,
      }),
    caseMissText,
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
        <Text style={styles.pattern}>{display(question.patternLabel)}</Text>
        <Text style={styles.sentence}>
          {parts && filled !== null ? (
            <>
              {display(parts.before)}
              <Text style={styles.highlight}>{display(filled)}</Text>
              {display(parts.after)}
            </>
          ) : (
            display(question.completedSentence)
          )}
        </Text>
        <Text style={styles.translation}>{question.translation}</Text>
        {question.compound && (
          <VerbPrepositionCompoundNote
            compound={question.compound}
            answer={question.primaryAnswer}
            eszettPreference={eszettPreference}
          />
        )}
        {alternates.length > 0 && (
          <Text style={styles.note}>
            {t('verb_preposition_quiz.also_accepted', {
              prepositions: alternates.join(', '),
            })}
          </Text>
        )}
        {wrongPreposition && (
          <Text style={styles.picked}>
            {t('verb_preposition_quiz.you_picked', {
              preposition: selectedPreposition,
            })}
          </Text>
        )}
        {caseMissText && <Text style={styles.picked}>{caseMissText}</Text>}
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
  pattern: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
  },
  sentence: {
    fontSize: Typography.body + 2,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  highlight: {
    backgroundColor: AppColors.yellow,
    textDecorationLine: 'underline',
  },
  translation: {
    fontSize: Typography.small,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  note: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    marginTop: Spacing.sm,
  },
  picked: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    marginTop: Spacing.sm,
  },
});
