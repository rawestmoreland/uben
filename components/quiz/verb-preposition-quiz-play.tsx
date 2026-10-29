import { Layout, Spacing } from '@/constants/design';
import type { VerbPrepositionQuizSessionData } from '@/hooks/use-verb-preposition-quiz-session';
import { useSettings } from '@/hooks/use-settings';
import type { VerbPrepositionCase } from '@/types/database';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { QuizActionButton } from './quiz-action-button';
import { VerbPrepositionCaseStep } from './verb-preposition-case-step';
import { VerbPrepositionFeedbackPanel } from './verb-preposition-feedback-panel';
import { VerbPrepositionGrid } from './verb-preposition-grid';
import { VerbPrepositionQuestionCard } from './verb-preposition-question-card';
import { VerbPrepositionQuizHeader } from './verb-preposition-quiz-header';

interface VerbPrepositionQuizPlayProps {
  quiz: VerbPrepositionQuizSessionData;
}

/**
 * The playing and feedback phases of the preposition quiz. The feedback
 * panel takes the question card's place so the button grid never moves, and
 * feedback doesn't auto-advance: the learner reads the full pattern, then
 * taps Continue (as in the plural quiz). A correct two-way preposition first
 * goes through the case step: the grid locks with the answer revealed and the
 * Akkusativ/Dativ buttons appear where Continue will be.
 */
export function VerbPrepositionQuizPlay({
  quiz,
}: VerbPrepositionQuizPlayProps) {
  const { t } = useTranslation('app');
  const { showEnglishHint, eszettPreference } = useSettings();
  const { currentCard, phase, selectedPreposition, isCorrect, progress } = quiz;
  const { selectedCase, submitAnswer, submitCase, nextCard } = quiz;
  const isFeedback = phase === 'feedback';
  const isCaseStep = phase === 'case';

  useEffect(() => {
    if (!isFeedback) return;
    Haptics.notificationAsync(
      isCorrect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  }, [isFeedback, isCorrect]);

  const handleSelect = useCallback(
    (preposition: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      submitAnswer(preposition);
    },
    [submitAnswer],
  );

  const handleSelectCase = useCallback(
    (chosenCase: VerbPrepositionCase) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      submitCase(chosenCase);
    },
    [submitCase],
  );

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextCard();
  }, [nextCard]);

  if (!currentCard) return null;
  const { question } = currentCard;
  const compoundForm = question.compound?.form;

  return (
    <View style={styles.container}>
      <VerbPrepositionQuizHeader
        current={progress.current}
        total={progress.total}
        badge={
          compoundForm ? t('verb_preposition_compound_quiz.badge') : undefined
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isFeedback && selectedPreposition && isCorrect !== null ? (
          <VerbPrepositionFeedbackPanel
            question={question}
            selectedPreposition={selectedPreposition}
            selectedCase={selectedCase}
            isCorrect={isCorrect}
            eszettPreference={eszettPreference}
          />
        ) : (
          <VerbPrepositionQuestionCard
            sentence={question.sentence}
            translation={showEnglishHint ? question.translation : null}
            eszettPreference={eszettPreference}
            compoundForm={compoundForm}
          />
        )}
        <View style={styles.section}>
          <VerbPrepositionGrid
            buttons={question.buttons}
            selectedPreposition={selectedPreposition}
            acceptedAnswers={question.acceptedAnswers}
            isFeedback={isFeedback || isCaseStep}
            onSelect={handleSelect}
          />
        </View>
        {isCaseStep && (
          <View style={styles.section}>
            <VerbPrepositionCaseStep onSelect={handleSelectCase} />
          </View>
        )}
        {isFeedback && (
          <View style={styles.section}>
            <QuizActionButton
              label={t('verb_preposition_quiz.continue')}
              onPress={handleContinue}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.screenPadding,
  },
  content: {
    flexGrow: 1,
    paddingBottom: Spacing.lg,
  },
  section: {
    marginTop: Spacing.lg,
  },
});
