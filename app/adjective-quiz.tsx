import {
  AppColors,
  Layout,
  Spacing,
  Typography,
  shadowStyle,
  shadowStyleSmall,
} from '@/constants/design';
import { useQuizInterstitialAd } from '@/hooks/use-quiz-interstitial-ad';
import {
  useAdjectiveQuizSession,
  type AdjectiveQuizResult,
} from '@/hooks/use-adjective-quiz-session';
import { useStoreReview } from '@/hooks/use-store-review';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { TFunction } from 'i18next';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Constants ────────────────────────────────────────────────────────

const FEEDBACK_DELAY_MS = 1400;

// ── Quiz Screen ──────────────────────────────────────────────────────

export default function AdjectiveQuizScreen() {
  const { t } = useTranslation('app');
  const quiz = useAdjectiveQuizSession();
  const { phase, nextCard, results } = quiz;

  // Auto-advance after feedback
  useEffect(() => {
    if (phase !== 'feedback') return;
    const timer = setTimeout(nextCard, FEEDBACK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, nextCard]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {phase === 'loading' && <LoadingState t={t} />}
      {phase === 'empty' && <EmptyState t={t} />}
      {(phase === 'playing' || phase === 'feedback') && (
        <PlayingState quiz={quiz} />
      )}
      {phase === 'complete' && <CompleteState results={results} t={t} />}
    </SafeAreaView>
  );
}

// ── Loading State ────────────────────────────────────────────────────

function LoadingState({ t }: { t: TFunction }) {
  return (
    <View style={styles.centeredContainer}>
      <ActivityIndicator size="large" color={AppColors.black} />
      <Text style={styles.loadingText}>{t('quiz_mode.loading_cards')}</Text>
    </View>
  );
}

// ── Empty State ──────────────────────────────────────────────────────

function EmptyState({ t }: { t: TFunction }) {
  return (
    <View style={styles.centeredContainer}>
      <View style={[styles.emptyCard, shadowStyle]}>
        <Text style={styles.emptyTitle}>
          {t('adjective_quiz.all_caught_up').toUpperCase()}
        </Text>
        <Text style={styles.emptySubtext}>
          {t('adjective_quiz.no_cards_due')}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('back_to_home')}
      >
        <Text style={styles.backButtonText}>
          {t('back_to_home').toUpperCase()}
        </Text>
      </Pressable>
    </View>
  );
}

// ── Playing State ────────────────────────────────────────────────────

interface PlayingStateProps {
  quiz: ReturnType<typeof useAdjectiveQuizSession>;
}

function PlayingState({ quiz }: PlayingStateProps) {
  const { t } = useTranslation('app');
  const { currentQuestion, phase, selectedAnswer, isCorrect, progress } = quiz;

  const isFeedback = phase === 'feedback';

  // Fire haptic on feedback (must be before any early return)
  useEffect(() => {
    if (!isFeedback) return;
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isFeedback, isCorrect]);

  if (!currentQuestion) return null;

  function handleAnswer(answer: string) {
    if (isFeedback) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    quiz.submitAnswer(answer);
  }

  return (
    <View style={styles.playingContainer}>
      {/* ── Top row: close ──────────────────────────────────── */}
      <View style={styles.topRow}>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>
            {t('adjective_quiz.badge').toUpperCase()}
          </Text>
        </View>
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('quiz_mode.exit_quiz')}
          hitSlop={12}
        >
          <Text style={styles.closeButtonText}>X</Text>
        </Pressable>
      </View>

      {/* ── Progress ────────────────────────────────────────── */}
      <View style={styles.progressSection}>
        <Text style={styles.progressText}>
          {t('quiz_mode.quiz_progress', {
            current: progress.current,
            total: progress.total,
          })}
        </Text>
        <View style={styles.progressBarOuter}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.round((progress.current / progress.total) * 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* ── Sentence Card ───────────────────────────────────── */}
      <View style={styles.sentenceSection}>
        <View style={[styles.sentenceCard, shadowStyle]}>
          <Text style={styles.sentenceText}>
            {currentQuestion.before}{' '}
            <Text
              style={[
                styles.blankText,
                isFeedback && {
                  color: isCorrect ? AppColors.green : AppColors.red,
                },
              ]}
            >
              {isFeedback ? selectedAnswer : '____'}
            </Text>{' '}
            {currentQuestion.after}
          </Text>
          <Text style={styles.englishHint}>{currentQuestion.english}</Text>
          {isFeedback && !isCorrect && (
            <Text style={styles.correctAnswerNote}>
              {t('adjective_quiz.correct_answer_was', {
                answer: currentQuestion.correctAnswer,
              })}
            </Text>
          )}
        </View>
      </View>

      {/* ── Answer Options ───────────────────────────────────── */}
      <View style={styles.optionsSection}>
        <View style={styles.optionsGrid}>
          {currentQuestion.options.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrectAnswer = currentQuestion.correctAnswer === option;

            let buttonBg: string = AppColors.white;
            if (isFeedback && isCorrectAnswer) {
              buttonBg = AppColors.green;
            } else if (isFeedback && isSelected && !isCorrectAnswer) {
              buttonBg = AppColors.red;
            }

            return (
              <Pressable
                key={option}
                style={({ pressed }) => [
                  styles.optionButton,
                  shadowStyleSmall,
                  { backgroundColor: buttonBg },
                  pressed && !isFeedback && styles.optionButtonPressed,
                ]}
                onPress={() => handleAnswer(option)}
                disabled={isFeedback}
                accessibilityRole="button"
                accessibilityLabel={`Select ${option}`}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    isFeedback &&
                      (isCorrectAnswer || isSelected) && {
                        color: AppColors.white,
                      },
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Complete State ───────────────────────────────────────────────────

interface CompleteStateProps {
  results: AdjectiveQuizResult[];
  t: TFunction;
}

function CompleteState({ results, t }: CompleteStateProps) {
  const { handleSessionComplete } = useStoreReview();
  const { maybeShowInterstitial } = useQuizInterstitialAd();

  useEffect(() => {
    handleSessionComplete();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBackToHome = () => {
    maybeShowInterstitial();
    router.back();
  };

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = results.length;
  const accuracy =
    totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

  return (
    <View style={styles.completeContainer}>
      <ScrollView
        style={styles.completeScroll}
        contentContainerStyle={styles.completeContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.completeTitle}>
          {t('quiz_mode.session_complete').toUpperCase()}
        </Text>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, shadowStyleSmall]}>
            <Text style={styles.summaryValue}>{totalCount}</Text>
            <Text style={styles.summaryLabel}>
              {t('quiz_mode.reviewed').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.summaryCard, shadowStyleSmall]}>
            <Text style={styles.summaryValue}>{correctCount}</Text>
            <Text style={styles.summaryLabel}>
              {t('quiz_mode.correct').toUpperCase()}
            </Text>
          </View>
          <View style={[styles.summaryCard, shadowStyleSmall]}>
            <Text style={styles.summaryValue}>{accuracy}%</Text>
            <Text style={styles.summaryLabel}>
              {t('quiz_mode.accuracy').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.resultsList}>
          {results.map((result, index) => (
            <View key={index} style={styles.resultRow}>
              <View
                style={[
                  styles.resultIndicator,
                  {
                    backgroundColor: result.isCorrect
                      ? AppColors.green
                      : AppColors.red,
                  },
                ]}
              />
              <Text style={styles.resultWord}>
                {result.question.correctAnswer}
              </Text>
              {!result.isCorrect && (
                <Text style={styles.resultYourAnswer}>
                  {t('quiz_mode.you_said', {
                    article: result.selectedAnswer,
                  })}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.floatingButtonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
          onPress={handleBackToHome}
          accessibilityRole="button"
          accessibilityLabel={t('back_to_home')}
        >
          <Text style={styles.backButtonText}>
            {t('back_to_home').toUpperCase()}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },

  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.screenPadding,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
  },

  emptyCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },

  playingContainer: {
    flex: 1,
    padding: Layout.screenPadding,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeBadge: {
    backgroundColor: AppColors.purple,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  modeBadgeText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.white,
    letterSpacing: 1,
  },

  closeButton: {
    width: 44,
    height: 44,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },

  progressSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  progressText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  progressBarOuter: {
    height: 12,
    backgroundColor: AppColors.lightGray,
    borderWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: AppColors.purple,
  },

  sentenceSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentenceCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  sentenceText: {
    fontSize: Typography.heading,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    textAlign: 'center',
    lineHeight: 34,
  },
  blankText: {
    fontWeight: Typography.bold,
    color: AppColors.purple,
    textDecorationLine: 'underline',
  },
  englishHint: {
    fontSize: Typography.body,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    marginTop: Spacing.md,
  },
  correctAnswerNote: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.green,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  optionsSection: {
    paddingBottom: Spacing.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionButton: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  optionButtonPressed: {
    transform: [{ translateY: 2 }],
    backgroundColor: AppColors.blue,
  },
  optionButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },

  completeContainer: {
    flex: 1,
  },
  completeScroll: {
    flex: 1,
  },
  completeContent: {
    padding: Layout.screenPadding,
    paddingBottom: 100,
  },
  floatingButtonContainer: {
    backgroundColor: AppColors.cream,
    paddingHorizontal: Layout.screenPadding,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: Layout.borderWidthThin,
    borderTopColor: AppColors.black,
  },
  completeTitle: {
    fontSize: Typography.title,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },

  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    textAlign: 'center',
    color: AppColors.textSecondary,
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },

  resultsList: {
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    backgroundColor: AppColors.white,
    marginBottom: Spacing.xl,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: Layout.borderWidthThin,
    borderBottomColor: AppColors.lightGray,
  },
  resultIndicator: {
    width: 12,
    height: 12,
    marginRight: Spacing.md,
  },
  resultWord: {
    flex: 1,
    fontSize: Typography.body,
    fontWeight: Typography.semibold,
    color: AppColors.black,
  },
  resultYourAnswer: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
  },

  backButton: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
    ...shadowStyle,
  },
  backButtonPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
  },
  backButtonText: {
    fontSize: Typography.body,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
});
