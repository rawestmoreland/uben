import { Layout, Spacing } from '@/constants/design';
import type { VerbPrepositionQuizSessionData } from '@/hooks/use-verb-preposition-quiz-session';
import { useSettings } from '@/hooks/use-settings';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { QuizActionButton } from './quiz-action-button';
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
 * taps Continue (as in the plural quiz).
 */
export function VerbPrepositionQuizPlay({
  quiz,
}: VerbPrepositionQuizPlayProps) {
  const { t } = useTranslation('app');
  const { showEnglishHint } = useSettings();
  const { currentCard, phase, selectedPreposition, isCorrect, progress } = quiz;
  const { submitAnswer, nextCard } = quiz;
  const isFeedback = phase === 'feedback';

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

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextCard();
  }, [nextCard]);

  if (!currentCard) return null;
  const { question } = currentCard;

  return (
    <View style={styles.container}>
      <VerbPrepositionQuizHeader
        current={progress.current}
        total={progress.total}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isFeedback && selectedPreposition && isCorrect !== null ? (
          <VerbPrepositionFeedbackPanel
            question={question}
            selectedPreposition={selectedPreposition}
            isCorrect={isCorrect}
          />
        ) : (
          <VerbPrepositionQuestionCard
            sentence={question.sentence}
            translation={showEnglishHint ? question.translation : null}
          />
        )}
        <View style={styles.section}>
          <VerbPrepositionGrid
            buttons={question.buttons}
            selectedPreposition={selectedPreposition}
            acceptedAnswers={question.acceptedAnswers}
            isFeedback={isFeedback}
            onSelect={handleSelect}
          />
        </View>
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
