import { Layout, Spacing } from '@/constants/design';
import { useNounTranslation } from '@/hooks/use-noun-translation';
import { usePluralNotationHint } from '@/hooks/use-plural-notation-hint';
import type { PluralQuizSessionData } from '@/hooks/use-plural-quiz-session';
import type { PluralEnding } from '@/services/pluralService';
import { applyGermanTextPreference } from '@/utils/germanText';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PluralEndingGrid } from './plural-ending-grid';
import { PluralFeedbackPanel } from './plural-feedback-panel';
import { PluralNotationHint } from './plural-notation-hint';
import { PluralQuestionCard } from './plural-question-card';
import { PluralQuizHeader } from './plural-quiz-header';
import { QuizActionButton } from './quiz-action-button';

interface PluralQuizPlayProps {
  quiz: PluralQuizSessionData;
  showEnglishHint: boolean;
  eszettPreference: 'eszett' | 'ss';
}

/**
 * The playing and feedback phases of the plural quiz. The feedback panel
 * takes the question card's place so the ending grid never moves, and
 * feedback doesn't auto-advance: the learner reads the highlighted plural,
 * then taps Continue (as in verb-quiz.tsx).
 */
export function PluralQuizPlay({
  quiz,
  showEnglishHint,
  eszettPreference,
}: PluralQuizPlayProps) {
  const { t } = useTranslation('app');
  const { currentCard, phase, selectedEnding, isCorrect, progress } = quiz;
  const { submitAnswer, nextCard, restartTimer } = quiz;
  const { isVisible: isHintVisible, dismiss: dismissHint } =
    usePluralNotationHint();
  const translation = useNounTranslation(
    currentCard?.remote_id ?? null,
    currentCard?.english ?? null,
  );
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
    (ending: PluralEnding) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      submitAnswer(ending);
    },
    [submitAnswer],
  );

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextCard();
  }, [nextCard]);

  // Time spent reading the hint shouldn't count against the answer speed
  const handleDismissHint = useCallback(() => {
    dismissHint();
    if (phase === 'playing') restartTimer();
  }, [dismissHint, phase, restartTimer]);

  if (!currentCard) return null;

  return (
    <View style={styles.container}>
      <PluralQuizHeader
        badgeLabel={t('plural_quiz.badge')}
        current={progress.current}
        total={progress.total}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {isFeedback && selectedEnding && isCorrect !== null ? (
          <PluralFeedbackPanel
            article={currentCard.article}
            singular={currentCard.german}
            plural={currentCard.plural}
            correctEnding={currentCard.ending}
            selectedEnding={selectedEnding}
            isCorrect={isCorrect}
            eszettPreference={eszettPreference}
          />
        ) : (
          <PluralQuestionCard
            article={currentCard.article}
            singular={applyGermanTextPreference(
              currentCard.german,
              eszettPreference,
            )}
            sense={currentCard.sense}
            translation={showEnglishHint ? translation : null}
          />
        )}
        <View style={styles.section}>
          <PluralEndingGrid
            selectedEnding={selectedEnding}
            correctEnding={currentCard.ending}
            isFeedback={isFeedback}
            onSelect={handleSelect}
          />
        </View>
        {isFeedback && (
          <View style={styles.section}>
            <QuizActionButton
              label={t('plural_quiz.continue')}
              onPress={handleContinue}
            />
          </View>
        )}
        {isHintVisible && <PluralNotationHint onDismiss={handleDismissHint} />}
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
